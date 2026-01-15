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
export const TIMER_GRACE_MS = 3000

const withRunningTimerRemaining = (match) => {
  if (!match?.timer || match.timer.status !== 'running') return match
  const now = Date.now()
  const remainingMs = Math.max(0, (match.timer.deadline ?? now) - now)
  return {
    ...match,
    timer: {
      ...match.timer,
      remainingMs,
    },
  }
}

const generateMatchId = () => `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const toObjectId = (value) => {
  if (!value) return null
  try {
    return new mongoose.Types.ObjectId(value)
  } catch {
    return null
  }
}
const normalizeScoreValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === 'object') {
    if ('$numberInt' in value) {
      const parsed = Number(value.$numberInt)
      return Number.isFinite(parsed) ? parsed : 0
    }
    if ('$numberDouble' in value) {
      const parsed = Number(value.$numberDouble)
      return Number.isFinite(parsed) ? parsed : 0
    }
  }
  return 0
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
  const hydrated = withRunningTimerRemaining(match)
  liveMatchEvents.emit('update', hydrated)
}

const setMatch = (match) => {
  const hydrated = withRunningTimerRemaining(match)
  matches.set(hydrated.id, hydrated)
  persistLiveMatchSnapshot(hydrated)
  emitUpdate(hydrated)
  return hydrated
}

const getMatch = (matchId) => matches.get(matchId) ?? null

const clearTimer = (matchId) => {
  const handle = timerHandles.get(matchId)
  if (handle) {
    clearTimeout(handle)
    timerHandles.delete(matchId)
  }
}

export const removeLiveMatchesForTournament = (tournamentId) => {
  if (!tournamentId) return 0
  const targetId = tournamentId.toString()
  let removed = 0
  for (const [matchId, match] of matches.entries()) {
    if (match?.tournamentId?.toString?.() === targetId) {
      clearTimer(matchId)
      matches.delete(matchId)
      removed += 1
    }
  }
  return removed
}

const scheduleTimer = (match) => {
  clearTimer(match.id)
  if (!match.timer || match.timer.status !== 'running') return
  const now = Date.now()
  const deadline = match.timer.deadline ?? now
  const remainingMs = Math.max(0, deadline - now)
  const updatedTimer = {
    ...match.timer,
    remainingMs,
  }
  const updatedMatch = { ...match, timer: updatedTimer }
  matches.set(match.id, updatedMatch)
  persistLiveMatchSnapshot(updatedMatch)
  emitUpdate(updatedMatch)
  const expectedIndex = match.questionIndex
  const expectedDeadline = deadline
  const expectedSeq = typeof match.eventSeq === 'number' ? match.eventSeq : 0
  const delay = Math.max(0, remainingMs + TIMER_GRACE_MS)
  if (!delay) {
    handleTimerExpire(match.id, expectedIndex, expectedDeadline, expectedSeq).catch((error) =>
      console.error('Timer expire failed', error),
    )
    return
  }
  const handle = setTimeout(() => {
    handleTimerExpire(match.id, expectedIndex, expectedDeadline, expectedSeq).catch((error) =>
      console.error('Timer expire failed', error),
    )
  }, delay)
  timerHandles.set(match.id, handle)
}

const recordQuestionResult = async (questionId, teamId, isCorrect) => {
  if (!questionId) return
  const inc = {
    'stats.timesAsked': 1,
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

const handleTimerExpire = async (
  matchId,
  expectedQuestionIndex = null,
  expectedDeadline = null,
  expectedSeq = null,
) => {
  const match = getMatch(matchId)
  if (!match || match.status !== 'in-progress') {
    return
  }
  if (match.timer?.status !== 'running') return
  const currentSeq = typeof match.eventSeq === 'number' ? match.eventSeq : 0
  if (typeof expectedSeq === 'number' && currentSeq !== expectedSeq) {
    return
  }
  if (typeof expectedQuestionIndex === 'number' && match.questionIndex !== expectedQuestionIndex) {
    return
  }
  if (
    typeof expectedDeadline === 'number' &&
    typeof match.timer?.deadline === 'number' &&
    match.timer.deadline !== expectedDeadline
  ) {
    return
  }
  if (typeof expectedDeadline === 'number') {
    const now = Date.now()
    const graceRemaining = Math.max(0, expectedDeadline + TIMER_GRACE_MS - now)
    if (graceRemaining > 0) {
      const handle = setTimeout(() => {
        handleTimerExpire(matchId, expectedQuestionIndex, expectedDeadline, expectedSeq).catch((error) =>
          console.error('Timer expire failed', error),
        )
      }, graceRemaining)
      timerHandles.set(matchId, handle)
      return
    }
  }
  const actingTeamId = match.activeTeamId
  if (!actingTeamId) return
  const nextSeq = currentSeq + 1
  const currentQuestion = match.questionQueue?.[match.questionIndex]
  recordQuestionResult(currentQuestion?.id, actingTeamId, false).catch((error) =>
    console.error('Failed to record question result', error),
  )
  const updatedResults = Array.isArray(match.questionResults) ? [...match.questionResults] : []
  updatedResults.push({
    questionIndex: match.questionIndex,
    teamId: actingTeamId,
    correct: false,
    type: 'timeout',
  })
  const matchWithResults = { ...match, questionResults: updatedResults, eventSeq: nextSeq }
  const outcome = applyAnswerResult(matchWithResults, actingTeamId, false)
  if (outcome.completed) {
    await finalizeMatch(outcome.match)
  } else {
    const updated = { ...outcome.match, eventSeq: nextSeq }
    setMatch(updated)
    scheduleTimer(updated)
  }
}

const finalizeMatch = async (match) => {
  const [teamAId, teamBId] = match.teams
  const teamAScore = normalizeScoreValue(match.scores?.[teamAId])
  const teamBScore = normalizeScoreValue(match.scores?.[teamBId])
  const normalizedScores = {
    ...match.scores,
    [teamAId]: teamAScore,
    [teamBId]: teamBScore,
  }
  const winnerId = teamAScore === teamBScore ? null : teamAScore > teamBScore ? teamAId : teamBId
  const loserId = winnerId ? (winnerId === teamAId ? teamBId : teamAId) : null

  if (!winnerId || !loserId) {
    resetMatch(match.id)
    return null
  }

  const completedAt = Date.now()
  const completedMatch = {
    ...match,
    status: 'completed',
    winnerId,
    loserId,
    completedAt,
    scores: normalizedScores,
  }

  matches.set(match.id, completedMatch)
  emitUpdate(completedMatch)
  clearTimer(match.id)
  await persistLiveMatchSnapshot(completedMatch)
  if (!match.tournamentId || !match.tournamentMatchId) {
    matches.delete(match.id)
    return completedMatch
  }
  const tournament = await loadTournamentById(match.tournamentId)
  if (!tournament || !tournament.state) return completedMatch
  let nextState = recordMatchResult(tournament.state, match.tournamentMatchId, {
    winnerId,
    loserId,
    scores: normalizedScores,
  })
  nextState = detachLiveMatch(nextState, match.tournamentMatchId)
  await persistTournamentState(tournament, nextState)
  // const tournamentObjectId = toObjectId(match.tournamentId)
  // const homeTeamObjectId = toObjectId(match.teams[0])
  // const awayTeamObjectId = toObjectId(match.teams[1])
  // const tournamentName = tournament.name
  if (!winnerId || !loserId) {
    // Leave the match in memory and signal a reset so moderators can retoss
    // instead of wiping it (which caused “retoss” with no controls).
    resetMatch(match.id)
    return
  }
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
          homeScore: normalizedScores[match.teams[0]] ?? 0,
          awayScore: normalizedScores[match.teams[1]] ?? 0,
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
  matches.delete(match.id)
  return completedMatch
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
    questionResults: [],
    eventSeq: 0,
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

export const submitAnswer = async (matchId, teamId, answerValue, questionInstanceId = null) => {
  const match = getMatch(matchId)
  if (!match || match.status !== 'in-progress') return null
  if (match.activeTeamId !== teamId && !(match.awaitingSteal && match.teams.includes(teamId))) {
    return null
  }
  const currentQuestion = match.questionQueue?.[match.questionIndex]
  if (questionInstanceId && currentQuestion?.instanceId && questionInstanceId !== currentQuestion.instanceId) {
    return null
  }
  if (
    match.timer?.status === 'running' &&
    match.timer?.deadline &&
    Date.now() > match.timer.deadline + TIMER_GRACE_MS
  ) {
    return null
  }
  clearTimer(matchId)
  const isCorrect = isAnswerCorrect(match, answerValue)
  recordQuestionResult(currentQuestion?.id, teamId, isCorrect).catch((error) =>
    console.error('Failed to record question result', error),
  )
  const updatedResults = Array.isArray(match.questionResults) ? [...match.questionResults] : []
  updatedResults.push({
    questionIndex: match.questionIndex,
    teamId,
    correct: isCorrect,
    type: match.awaitingSteal ? 'steal' : 'primary',
  })
  const nextSeq = (typeof match.eventSeq === 'number' ? match.eventSeq : 0) + 1
  const matchWithResults = { ...match, questionResults: updatedResults, eventSeq: nextSeq }
  const outcome = applyAnswerResult(matchWithResults, teamId, isCorrect)
  if (outcome.completed) {
    const finalized = await finalizeMatch(outcome.match)
    return finalized || outcome.match
  }
  const updated = { ...outcome.match, eventSeq: nextSeq }
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

export const resetMatch = async (matchId) => {
  const match = getMatch(matchId)
  if (!match) return null
  const [teamAId, teamBId] = match.teams
  const questionQueue =
    match.tournamentId ? await drawQuestions(QUESTIONS_PER_TEAM * 2, match.tournamentId) : match.questionQueue ?? []
  const reset = {
    ...match,
    scores: {
      [teamAId]: 0,
      [teamBId]: 0,
    },
    questionQueue,
    questionResults: [],
    eventSeq: 0,
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
      if (typeof state.eventSeq !== 'number') {
        state.eventSeq = 0
      }
      matches.set(state.id, state)
      if (state.timer?.status === 'running') {
        const remaining = Math.max(0, (state.timer.deadline ?? Date.now()) - Date.now())
        state.timer = {
          ...state.timer,
          remainingMs: remaining,
        }
        if (remaining <= 0) {
          handleTimerExpire(
            state.id,
            state.questionIndex,
            state.timer.deadline,
            typeof state.eventSeq === 'number' ? state.eventSeq : 0,
          ).catch((error) =>
            console.error('Timer expire failed', error),
          )
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
