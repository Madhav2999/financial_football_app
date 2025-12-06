import Tournament from '../db/models/tournament.js'
import Question from '../db/models/question.js'
import { publishTournamentUpdate } from './tournamentEvents.js'

const toId = (value) => (value && value.toString ? value.toString() : value ?? null)

const sanitizeState = (state) => {
  if (!state) return null

  const sanitizeMatches = (matches = {}) => {
    const next = {}
    Object.entries(matches).forEach(([matchId, match]) => {
      const history = Array.isArray(match.history)
        ? match.history.map((entry) => {
            const scoreEntries = entry?.scores ? Object.entries(entry.scores) : []
            const normalizedScores = scoreEntries.reduce((acc, [teamId, val]) => {
              // handle mongo number objects {$numberInt: "..."} etc.
              const num =
                typeof val === 'object' && val !== null
                  ? Number(val.$numberInt ?? val.$numberDouble ?? val.$numberLong ?? val)
                  : Number(val ?? 0)
              acc[teamId] = Number.isFinite(num) ? num : 0
              return acc
            }, {})
            return {
              ...entry,
              winnerId: toId(entry.winnerId),
              loserId: toId(entry.loserId),
              scores: normalizedScores,
            }
          })
        : []
      const lastHistory = history.length ? history[history.length - 1] : null
      const completedAt = match.completedAt || lastHistory?.timestamp || null
      const scores = lastHistory?.scores || match.scores || {}
      next[matchId] = {
        ...match,
        id: match.id || matchId,
        stageId: match.stageId,
        bracket: match.bracket,
        teams: Array.isArray(match.teams) ? match.teams.map(toId) : [],
        winnerId: toId(match.winnerId),
        loserId: toId(match.loserId),
        moderatorId: toId(match.moderatorId),
        matchRefId: match.matchRefId ? match.matchRefId.toString() : match.matchRefId ?? null,
        history,
        scores,
        completedAt,
      }
    })
    return next
  }

  const sanitizeStages = (stages = {}) => {
    const next = {}
    Object.entries(stages).forEach(([stageId, stage]) => {
      next[stageId] = {
        ...stage,
        id: stage.id || stageId,
        matchIds: Array.isArray(stage.matchIds) ? stage.matchIds.map(String) : [],
      }
    })
    return next
  }

  return {
    ...state,
    matches: sanitizeMatches(state.matches),
    stages: sanitizeStages(state.stages),
    championId: toId(state.championId),
    champions: state.champions
      ? {
          winners: toId(state.champions.winners),
          losers: toId(state.champions.losers),
        }
      : state.champions,
  }
}

const sanitizeTournament = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  status: doc.status,
  teams: doc.teams?.map((teamId) => teamId.toString()) ?? [],
  settings: doc.settings ?? {},
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  state: sanitizeState(doc.state),
})

const syncTournamentStatus = (tournamentDoc, state) => {
  if (!state) return
  if (state.status === 'completed') {
    tournamentDoc.status = 'completed'
  } else if (state.status === 'active') {
    tournamentDoc.status = 'live'
  } else {
    tournamentDoc.status = 'upcoming'
  }
}

const buildQuestionMetrics = (question) => {
  const stats = question.stats ?? {}
  const correctCount = stats.correctCount ?? 0
  const incorrectCount = stats.incorrectCount ?? 0
  const totalAnswered = correctCount + incorrectCount
  const accuracy = totalAnswered ? Math.round((correctCount / totalAnswered) * 1000) / 10 : null
  const byTeam = Array.isArray(stats.byTeam)
    ? stats.byTeam.map((entry) => ({
        team: entry.team?.toString?.() ?? entry.team,
        correct: entry.correct ?? 0,
        incorrect: entry.incorrect ?? 0,
      }))
    : []

  return {
    id: question._id.toString(),
    prompt: question.prompt,
    category: question.category,
    difficulty: question.difficulty,
    totalAsked: stats.timesAsked ?? 0,
    correctCount,
    incorrectCount,
    totalAnswered,
    accuracy,
    byTeam,
    tags: question.tags ?? [],
    lastUsedAt: question.lastUsedAt,
  }
}

const snapshotQuestionStats = async () => {
  const questions = await Question.find().sort({ updatedAt: -1 })
  const metrics = questions.map(buildQuestionMetrics)

  const summary = metrics.reduce(
    (acc, entry) => {
      acc.totalQuestions += 1
      acc.totalAsked += entry.totalAsked
      if (typeof entry.accuracy === 'number') {
        acc.accuracySamples += 1
        acc.accuracySum += entry.accuracy
      }
      const categoryKey = entry.category || 'Uncategorized'
      const category = acc.categories.get(categoryKey) || {
        category: categoryKey,
        questions: 0,
        asked: 0,
      }
      category.questions += 1
      category.asked += entry.totalAsked
      acc.categories.set(categoryKey, category)
      return acc
    },
    {
      totalQuestions: 0,
      totalAsked: 0,
      accuracySum: 0,
      accuracySamples: 0,
      categories: new Map(),
    },
  )

  const averageAccuracy =
    summary.accuracySamples > 0 ? Math.round((summary.accuracySum / summary.accuracySamples) * 10) / 10 : null

  return {
    summary: {
      totalQuestions: summary.totalQuestions,
      totalAsked: summary.totalAsked,
      averageAccuracy,
      categories: Array.from(summary.categories.values()),
    },
    questions: metrics,
  }
}

const persistTournamentState = async (tournamentDoc, nextState) => {
  let stateWithSnapshot = nextState
  if (nextState.status === 'completed') {
    try {
      const questionStats = await snapshotQuestionStats()
      stateWithSnapshot = { ...nextState, questionStats }
    } catch (error) {
      console.error('Failed to snapshot question stats', error)
    }
  }

  tournamentDoc.state = stateWithSnapshot
  tournamentDoc.markModified('state')
  syncTournamentStatus(tournamentDoc, stateWithSnapshot)
  await tournamentDoc.save()
  if (stateWithSnapshot.status === 'completed') {
    try {
      await Question.updateMany(
        { 'metadata.currentTournamentId': tournamentDoc._id.toString() },
        {
          $unset: { 'metadata.currentTournamentId': '' },
          $set: { 'stats.timesAsked': 0, 'stats.correctCount': 0, 'stats.incorrectCount': 0 },
        },
      )
    } catch (error) {
      console.error('Failed to reset question tournament flags', error)
    }
  }
  publishTournamentUpdate(sanitizeTournament(tournamentDoc))
  return tournamentDoc
}

const loadTournamentById = async (id) => {
  if (!id) return null
  return Tournament.findById(id)
}

export { sanitizeTournament, syncTournamentStatus, persistTournamentState, loadTournamentById }
