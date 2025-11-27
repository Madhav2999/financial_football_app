import { EventEmitter } from 'events'
import mongoose from 'mongoose'
import Question from '../db/models/question.js'
import LiveMatch from '../db/models/liveMatch.js'
import Match from '../db/models/match.js'
import Team from '../db/models/team.js'
import { PRIMARY_QUESTION_POINTS, STEAL_QUESTION_POINTS, QUESTIONS_PER_TEAM } from '../constants/matchSettings.js'
import { createRunningTimer, pauseTimer, resumeTimer } from '../utils/matchTimers.js'
import { recordMatchResult, detachLiveMatch } from './tournamentEngine.js'
import { loadTournamentById, persistTournamentState } from './tournamentState.js'

const matches = new Map()
const timerHandles = new Map()
const liveMatchEvents = new EventEmitter()

const generateMatchId = () => `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const toObjectId = (value) => {
  if (!value) return null
  try {
    return new mongoose.Types.ObjectId(value)
  } catch {
    return null
  }
}

async function drawQuestions(count, tournamentId = null) {
  const pipeline = [{ $sample: { size: count } }]
  const tournamentKey = tournamentId ? tournamentId.toString() : null
  const baseFilter = tournamentKey ? { $or: [{ 'metadata.currentTournamentId': { $ne: tournamentKey } }, { 'metadata.currentTournamentId': { $exists: false } }] } : {}
  let docs = await Question.aggregate([{ $match: baseFilter }, ...pipeline])
  // Fallback: if we don't have enough unseen questions for this tournament, allow reuse to fill the queue.
  if (docs.length < count) {
    const remaining = count - docs.length
    const excludeIds = docs.map((doc) => doc._id)
    const fallbackFilter = excludeIds.length ? { _id: { $nin: excludeIds } } : {}
    const fallback = await Question.aggregate([{ $match: fallbackFilter }, { $sample: { size: remaining } }])
    docs = [...docs, ...fallback]
  }
  const timestamp = Date.now()
  await Promise.all(
    docs.map((doc) =>
      Question.updateOne(
        { _id: doc._id },
        {
          $set: { lastUsedAt: new Date() },
          $inc: { 'stats.timesAsked': 1 },
          ...(tournamentKey ? { $set: { 'metadata.currentTournamentId': tournamentKey } } : {}),
        },
      ),
    ),
  )
  return docs.map((doc, index) => {
    const answers = doc.answers?.length
      ? doc.answers
      : [
          { key: 'A', text: 'Option A' },
          { key: 'B', text: 'Option B' },
          { key: 'C', text: 'Option C' },
          { key: 'D', text: 'Option D' },
        ]
    const correctOption = answers.find((option) => option.key === doc.correctAnswerKey)
    return {
      id: doc._id.toString(),
      prompt: doc.prompt,
      category: doc.category,
      answers,
      options: answers.map((option) => option.text),
      answer: correctOption?.text ?? doc.correctAnswerKey,
      correctAnswerKey: doc.correctAnswerKey,
      instanceId: `${doc._id.toString()}-${timestamp}-${index}`,
    }
  })
}

const buildQuestionOrder = (firstTeamId, teams, questionsPerTeam = QUESTIONS_PER_TEAM) => {
  const [teamAId, teamBId] = teams
  const counts = {
    [teamAId]: 0,
    [teamBId]: 0,
  }
  const order = []
  let current = firstTeamId

  while (order.length < questionsPerTeam * 2) {
    if (counts[current] >= questionsPerTeam) {
      current = current === teamAId ? teamBId : teamAId
      continue
    }

    order.push(current)
    counts[current] += 1
    current = current === teamAId ? teamBId : teamAId
  }

  return order
}

const advanceMatchState = (match, scores) => {
  const nextIndex = match.questionIndex + 1
  const base = {
    ...match,
    scores,
    questionIndex: nextIndex,
    awaitingSteal: false,
    timer: null,
  }

  if (nextIndex >= match.questionQueue.length) {
    return {
      completed: true,
      match: {
        ...base,
        status: 'completed',
        activeTeamId: null,
      },
    }
  }

  return {
    completed: false,
    match: {
      ...base,
      status: 'in-progress',
      activeTeamId: match.assignedTeamOrder[nextIndex],
      timer: createRunningTimer('primary'),
    },
  }
}

const applyAnswerResult = (match, teamId, isCorrect) => {
  const isStealAttempt = match.awaitingSteal

  if (isStealAttempt) {
    const updatedScores = isCorrect
      ? {
          ...match.scores,
          [teamId]: match.scores[teamId] + STEAL_QUESTION_POINTS,
        }
      : { ...match.scores }

    const sanitizedMatch = {
      ...match,
      timer: null,
    }

    return advanceMatchState(sanitizedMatch, updatedScores)
  }

  if (isCorrect) {
    const updatedScores = {
      ...match.scores,
      [teamId]: match.scores[teamId] + PRIMARY_QUESTION_POINTS,
    }

    const sanitizedMatch = {
      ...match,
      timer: null,
    }

    return advanceMatchState(sanitizedMatch, updatedScores)
  }

  const opponentId = match.teams.find((id) => id && id !== teamId) ?? null

  if (!opponentId) {
    const sanitizedMatch = {
      ...match,
      timer: null,
    }

    return advanceMatchState(sanitizedMatch, { ...match.scores })
  }

  return {
    completed: false,
    match: {
      ...match,
      awaitingSteal: true,
      activeTeamId: opponentId,
      timer: createRunningTimer('steal'),
    },
  }
}

const persistLiveMatchSnapshot = async (match) => {
  if (!match) return
  try {
    await LiveMatch.findOneAndUpdate(
      { matchRefId: match.id },
      {
        matchRefId: match.id,
        tournamentId: match.tournamentId,
        tournamentMatchId: match.tournamentMatchId,
        moderatorId: match.moderatorId ?? null,
        teams: match.teams,
        status: match.status,
        state: match,
      },
      { upsert: true, new: true },
    )
  } catch (error) {
    console.error('Failed to persist live match snapshot', error)
  }
}

const emitUpdate = (match) => {
  liveMatchEvents.emit('update', match)
}

const setMatch = (match) => {
  matches.set(match.id, match)
  persistLiveMatchSnapshot(match)
  emitUpdate(match)
  return match
}

const getMatch = (matchId) => matches.get(matchId) ?? null

const clearTimer = (matchId) => {
  const handle = timerHandles.get(matchId)
  if (handle) {
    clearTimeout(handle)
    timerHandles.delete(matchId)
  }
}

const scheduleTimer = (match) => {
  clearTimer(match.id)
  if (!match.timer || match.timer.status !== 'running') return
  const remainingMs = Math.max(0, (match.timer.deadline ?? Date.now()) - Date.now())
  if (!remainingMs) {
    handleTimerExpire(match.id).catch((error) => console.error('Timer expire failed', error))
    return
  }
  const updatedTimer = {
    ...match.timer,
    remainingMs,
  }
  const updatedMatch = { ...match, timer: updatedTimer }
  matches.set(match.id, updatedMatch)
  persistLiveMatchSnapshot(updatedMatch)
  const handle = setTimeout(() => {
    handleTimerExpire(match.id).catch((error) => console.error('Timer expire failed', error))
  }, remainingMs)
  timerHandles.set(match.id, handle)
}

const recordQuestionResult = async (questionId, teamId, isCorrect) => {
  if (!questionId) return
  const inc = {
    [isCorrect ? 'stats.correctCount' : 'stats.incorrectCount']: 1,
  }
  await Question.updateOne({ _id: questionId }, { $inc: inc })
  if (!teamId) return
  const normalizedTeamId = typeof teamId === 'string' ? teamId : teamId?.toString()
  if (!normalizedTeamId) return
  const updateExisting = await Question.updateOne(
    { _id: questionId, 'stats.byTeam.team': new mongoose.Types.ObjectId(normalizedTeamId) },
    {
      $inc: {
        'stats.byTeam.$.correct': isCorrect ? 1 : 0,
        'stats.byTeam.$.incorrect': isCorrect ? 0 : 1,
      },
    },
  )
  if (updateExisting.modifiedCount === 0) {
    await Question.updateOne(
      { _id: questionId },
      {
        $push: {
          'stats.byTeam': {
            team: new mongoose.Types.ObjectId(normalizedTeamId),
            correct: isCorrect ? 1 : 0,
            incorrect: isCorrect ? 0 : 1,
          },
        },
      },
    )
  }
}

const handleTimerExpire = async (matchId) => {
  const match = getMatch(matchId)
  if (!match || match.status !== 'in-progress') {
    return
  }
  const actingTeamId = match.activeTeamId
  if (!actingTeamId) return
  const currentQuestion = match.questionQueue?.[match.questionIndex]
  await recordQuestionResult(currentQuestion?.id, actingTeamId, false)
  const outcome = applyAnswerResult(match, actingTeamId, false)
  if (outcome.completed) {
    await finalizeMatch(outcome.match)
  } else {
    const updated = outcome.match
    setMatch(updated)
    scheduleTimer(updated)
  }
}

const finalizeMatch = async (match) => {
  matches.set(match.id, match)
  emitUpdate(match)
  clearTimer(match.id)
  await persistLiveMatchSnapshot({ ...match, status: 'completed' })
  if (!match.tournamentId || !match.tournamentMatchId) {
    matches.delete(match.id)
    return
  }
  const tournament = await loadTournamentById(match.tournamentId)
  if (!tournament || !tournament.state) return
  const [teamAId, teamBId] = match.teams
  const teamAScore = match.scores[teamAId] ?? 0
  const teamBScore = match.scores[teamBId] ?? 0
  const winnerId = teamAScore === teamBScore ? null : teamAScore > teamBScore ? teamAId : teamBId
  const loserId = winnerId ? (winnerId === teamAId ? teamBId : teamAId) : null
  if (!winnerId || !loserId) {
    // Leave the match in memory and signal a reset so moderators can retoss
    // instead of wiping it (which caused “retoss” with no controls).
    resetMatch(match.id)
    return
  }
  if (winnerId && loserId) {
    let nextState = recordMatchResult(tournament.state, match.tournamentMatchId, {
      winnerId,
      loserId,
      scores: match.scores,
    })
    nextState = detachLiveMatch(nextState, match.tournamentMatchId)
    await persistTournamentState(tournament, nextState)
    const tournamentObjectId = toObjectId(match.tournamentId)
    const homeTeamObjectId = toObjectId(match.teams[0])
    const awayTeamObjectId = toObjectId(match.teams[1])
    const tournamentName = tournament.name
    const teamDocs = await Team.find({ _id: { $in: [teamAId, teamBId] } }).lean()
    const teamNameMap = new Map(teamDocs.map((doc) => [doc._id.toString(), doc.name]))
    const teamALabel =
      teamNameMap.get(teamAId) ?? match.teamLabels?.[teamAId] ?? match.teams[0]?.toString?.() ?? teamAId
    const teamBLabel =
      teamNameMap.get(teamBId) ?? match.teamLabels?.[teamBId] ?? match.teams[1]?.toString?.() ?? teamBId
    if (tournamentObjectId && homeTeamObjectId && awayTeamObjectId) {
      await Match.findOneAndUpdate(
        { matchRefId: match.id },
        {
          matchRefId: match.id,
          tournament: tournamentObjectId,
          stage: null,
          homeTeam: homeTeamObjectId,
          awayTeam: awayTeamObjectId,
          result: {
            homeScore: match.scores[match.teams[0]] ?? 0,
            awayScore: match.scores[match.teams[1]] ?? 0,
            winnerTeam: toObjectId(winnerId),
          },
          metadata: {
            tournamentMatchId: match.tournamentMatchId,
            tournamentName,
            homeTeamName: teamALabel,
            awayTeamName: teamBLabel,
            winnerTeamName: teamALabel && winnerId === teamAId ? teamALabel : teamBLabel,
          },
          status: 'completed',
        },
        { upsert: true, new: true },
      )
    }
  }
  matches.delete(match.id)
}

export const createLiveMatch = async ({ teamAId, teamBId, moderatorId = null, tournamentMatchId, tournamentId }) => {
  const questionQueue = await drawQuestions(QUESTIONS_PER_TEAM * 2, tournamentId)
  const id = generateMatchId()
  const match = {
    id,
    tournamentId: tournamentId ? tournamentId.toString() : null,
    tournamentMatchId,
    teams: [teamAId, teamBId],
    scores: {
      [teamAId]: 0,
      [teamBId]: 0,
    },
    questionQueue,
    assignedTeamOrder: [],
    questionIndex: 0,
    activeTeamId: null,
    awaitingSteal: false,
    status: 'coin-toss',
    timer: null,
    coinToss: {
      status: 'ready',
      winnerId: null,
      decision: null,
      resultFace: null,
    },
    moderatorId,
  }
  setMatch(match)
  return match
}

export const joinMatch = (matchId) => getMatch(matchId)

export const flipCoin = (matchId, winnerIdOverride = null) => {
  const match = getMatch(matchId)
  if (!match || match.coinToss.status !== 'ready') return null
  const [teamAId, teamBId] = match.teams
  const validOverride =
    winnerIdOverride && (winnerIdOverride === teamAId || winnerIdOverride === teamBId) ? winnerIdOverride : null
  const resultFace = validOverride ? (validOverride === teamAId ? 'heads' : 'tails') : Math.random() < 0.5 ? 'heads' : 'tails'
  const winnerId = resultFace === 'heads' ? teamAId : teamBId
  const updated = {
    ...match,
    coinToss: {
      ...match.coinToss,
      status: 'flipped',
      winnerId,
      resultFace,
    },
  }
  matches.set(matchId, updated)
  setMatch(updated)
  return updated
}

export const decideFirst = (matchId, deciderId, firstTeamId) => {
  const match = getMatch(matchId)
  if (!match || match.coinToss.status !== 'flipped') return null
  if (!match.teams.includes(firstTeamId)) return null
  if (match.coinToss.winnerId !== deciderId) return null
  const order = buildQuestionOrder(firstTeamId, match.teams)
  const updated = {
    ...match,
    assignedTeamOrder: order,
    activeTeamId: order[0],
    status: 'in-progress',
    timer: createRunningTimer('primary'),
    coinToss: {
      ...match.coinToss,
      status: 'decided',
      decision: {
        deciderId,
        firstTeamId,
      },
    },
  }
  setMatch(updated)
  scheduleTimer(updated)
  return updated
}

const isAnswerCorrect = (match, answerValue) => {
  const currentQuestion = match.questionQueue[match.questionIndex]
  if (!currentQuestion || !answerValue) return false
  if (currentQuestion.correctAnswerKey && currentQuestion.correctAnswerKey === answerValue) {
    return true
  }
  if (currentQuestion.answer && currentQuestion.answer === answerValue) {
    return true
  }
  const candidate = currentQuestion.answers?.find((option) => option.text === answerValue)
  if (candidate && candidate.key === currentQuestion.correctAnswerKey) {
    return true
  }
  return false
}

export const submitAnswer = async (matchId, teamId, answerValue) => {
  const match = getMatch(matchId)
  if (!match || match.status !== 'in-progress') return null
  if (match.activeTeamId !== teamId && !(match.awaitingSteal && match.teams.includes(teamId))) {
    return null
  }
  const isCorrect = isAnswerCorrect(match, answerValue)
  const currentQuestion = match.questionQueue?.[match.questionIndex]
  await recordQuestionResult(currentQuestion?.id, teamId, isCorrect)
  const outcome = applyAnswerResult(match, teamId, isCorrect)
  if (outcome.completed) {
    await finalizeMatch(outcome.match)
    return outcome.match
  }
  const updated = outcome.match
  setMatch(updated)
  scheduleTimer(updated)
  return updated
}

export const pauseMatch = (matchId) => {
  const match = getMatch(matchId)
  if (!match || match.status !== 'in-progress') return null
  const updated = {
    ...match,
    status: 'paused',
    timer: pauseTimer(match.timer),
  }
  setMatch(updated)
  clearTimer(matchId)
  return updated
}

export const resumeMatch = (matchId) => {
  const match = getMatch(matchId)
  if (!match || match.status !== 'paused') return null
  const updated = {
    ...match,
    status: 'in-progress',
    timer: resumeTimer(match.timer),
  }
  setMatch(updated)
  scheduleTimer(updated)
  return updated
}

export const resetMatch = (matchId) => {
  const match = getMatch(matchId)
  if (!match) return null
  const [teamAId, teamBId] = match.teams
  const reset = {
    ...match,
    scores: {
      [teamAId]: 0,
      [teamBId]: 0,
    },
    questionIndex: 0,
    assignedTeamOrder: [],
    activeTeamId: null,
    awaitingSteal: false,
    status: 'coin-toss',
    timer: null,
    coinToss: {
      status: 'ready',
      winnerId: null,
      decision: null,
      resultFace: null,
    },
  }
  matches.set(matchId, reset)
  emitUpdate(reset)
  clearTimer(matchId)
  return reset
}

export const liveMatchEmitter = liveMatchEvents
export const initializeLiveMatches = async () => {
  try {
    const docs = await LiveMatch.find({ status: { $ne: 'completed' } })
    docs.forEach((doc) => {
      const state = doc.state
      if (!state || !state.id) return
      matches.set(state.id, state)
      if (state.timer?.status === 'running') {
        const remaining = Math.max(0, (state.timer.deadline ?? Date.now()) - Date.now())
        state.timer = {
          ...state.timer,
          remainingMs: remaining,
        }
        if (remaining <= 0) {
          handleTimerExpire(state.id).catch((error) => console.error('Timer expire failed', error))
        } else {
          scheduleTimer(state)
        }
      }
      emitUpdate(state)
    })
  } catch (error) {
    console.error('Failed to initialize live matches', error)
  }
}
