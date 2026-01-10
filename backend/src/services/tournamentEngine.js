const BRACKET_BASE_ORDER = {
  winners: 0,
  losers: 1000,
  finals: 2000,
}

const DEFAULT_RECORD = { wins: 0, losses: 0, points: 0, eliminated: false, initialBye: false }

function normalizeScoreValue(value) {
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

function cloneProgress() {
  return {
    winners: {},
    losers: {},
    finals: { resetScheduled: false },
  }
}

function ensureUnique(array, value) {
  if (!value) {
    return array
  }
  return array.includes(value) ? array : [...array, value]
}

function pairTeams(teamIds) {
  const pairs = []
  for (let index = 0; index < teamIds.length; index += 2) {
    const a = teamIds[index] ?? null
    const b = teamIds[index + 1] ?? null
    pairs.push([a, b])
  }
  return pairs
}

function shuffleTeamIds(teamIds) {
  const shuffled = [...teamIds]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function sortByPoints(records, teamIds) {
  return [...teamIds].sort((left, right) => {
    const leftPoints = records[left]?.points ?? 0
    const rightPoints = records[right]?.points ?? 0
    if (leftPoints === rightPoints) {
      return left.localeCompare(right)
    }
    return rightPoints - leftPoints
  })
}

function ensureStage(state, stageId, label, bracket, order, meta = {}) {
  const existing = state.stages[stageId]
  if (existing) {
    return {
      ...state,
      stages: {
        ...state.stages,
        [stageId]: {
          ...existing,
          label,
          bracket,
          order,
          meta: { ...(existing.meta ?? {}), ...meta },
        },
      },
    }
  }

  return {
    ...state,
    stages: {
      ...state.stages,
      [stageId]: { id: stageId, label, bracket, order, matchIds: [], meta },
    },
  }
}

function createMatch(state, stageId, teams, meta = {}) {
  const stage = state.stages[stageId]
  if (!stage) return state

  const matchIndex = stage.matchIds.length
  const matchId = `${stageId}-m${matchIndex + 1}`
  const moderator = state.moderatorRoster.length
    ? state.moderatorRoster[state.moderatorCursor % state.moderatorRoster.length]
    : null
  const teamsSnapshot = teams.map((teamId) => teamId ?? null)
  const hasBothSides = teamsSnapshot.every((teamId) => Boolean(teamId))
  const labelSuffix = matchIndex ? ` #${matchIndex + 1}` : ''

  const match = {
    id: matchId,
    stageId,
    bracket: stage.bracket,
    label: `${stage.label}${labelSuffix}`.trim(),
    teams: teamsSnapshot,
    status: hasBothSides ? 'scheduled' : 'pending',
    winnerId: null,
    loserId: null,
    moderatorId: moderator ? moderator.id : null,
    matchRefId: null,
    history: [],
    meta,
  }

  const nextMatches = { ...state.matches, [matchId]: match }
  const nextStages = {
    ...state.stages,
    [stageId]: {
      ...stage,
      matchIds: [...stage.matchIds, matchId],
    },
  }

  return {
    ...state,
    matches: nextMatches,
    stages: nextStages,
    moderatorCursor: moderator ? state.moderatorCursor + 1 : state.moderatorCursor,
  }
}

function applyMatchCompletion(state, matchId, payload) {
  const match = state.matches[matchId]
  if (!match) {
    return state
  }

  const { winnerId, loserId, scores = {} } = payload
  const timestamp = Date.now()

  const updatedMatch = {
    ...match,
    winnerId,
    loserId,
    status: 'completed',
    history: [...match.history, { winnerId, loserId, scores, timestamp }],
  }

  const winnerRecord = state.records[winnerId] ?? { ...DEFAULT_RECORD }
  const loserRecord = state.records[loserId] ?? { ...DEFAULT_RECORD }
  const winnerPoints = normalizeScoreValue(scores[winnerId])
  const loserPoints = normalizeScoreValue(scores[loserId])

  const nextRecords = {
    ...state.records,
    [winnerId]: {
      ...winnerRecord,
      wins: winnerRecord.wins + 1,
      points: winnerRecord.points + winnerPoints,
    },
    [loserId]: {
      ...loserRecord,
      losses: loserRecord.losses + 1,
      points: loserRecord.points + loserPoints,
      eliminated: loserRecord.losses + 1 >= 2,
    },
  }

  return {
    ...state,
    matches: {
      ...state.matches,
      [matchId]: updatedMatch,
    },
    records: nextRecords,
  }
}

function canGrantBye(state, matchId) {
  const match = state.matches?.[matchId]
  if (!match) return false
  const disallowed = new Set(['active', 'in-progress', 'completed', 'live'])
  if (disallowed.has(match.status)) return false
  if (!match.teams?.every((teamId) => Boolean(teamId))) return false
  return true
}

function createRoundMetadata(state, bracket, roundNumber, entrants, byes, matchIds) {
  const rounds = state.rounds?.[bracket] ?? []
  const existingIndex = rounds.findIndex((round) => round.roundNumber === roundNumber)
  const entry = {
    roundNumber,
    stageId: `${bracket}-r${roundNumber}`,
    entrants,
    byes,
    matches: matchIds,
    results: { winners: [], losers: [] },
    completed: false,
  }

  let updatedRounds
  if (existingIndex >= 0) {
    updatedRounds = rounds.map((round, index) => (index === existingIndex ? { ...round, ...entry } : round))
  } else {
    updatedRounds = [...rounds, entry]
  }

  const nextRounds = {
    ...state.rounds,
    [bracket]: updatedRounds,
  }

  const nextProgress = {
    ...state.progress,
    [bracket]: {
      ...(state.progress?.[bracket] ?? {}),
      [roundNumber]: {
        entrants,
        byes,
        winners: [],
        losers: [],
      },
    },
  }

  return {
    ...state,
    rounds: nextRounds,
    progress: nextProgress,
  }
}

function selectBye(records, entrants, strategy, preferredTeamId = null) {
  if (entrants.length % 2 === 0) {
    return { byeTeamId: null, remaining: entrants }
  }

  if (preferredTeamId && entrants.includes(preferredTeamId)) {
    return {
      byeTeamId: preferredTeamId,
      remaining: entrants.filter((id) => id !== preferredTeamId),
    }
  }

  if (!entrants.length) {
    return { byeTeamId: null, remaining: entrants }
  }

  if (strategy === 'random') {
    const byeTeamId = entrants[Math.floor(Math.random() * entrants.length)]
    return {
      byeTeamId,
      remaining: entrants.filter((id) => id !== byeTeamId),
    }
  }

  const ordered = sortByPoints(records, entrants)
  const byeTeamId = ordered[0]
  return {
    byeTeamId,
    remaining: entrants.filter((id) => id !== byeTeamId),
  }
}

function createBracketRound(state, bracket, roundNumber, entrants, byes) {
  const stageId = `${bracket}-r${roundNumber}`
  const labelPrefix = bracket === 'winners' ? 'Winners' : 'Losers'
  const label = `${labelPrefix} Round ${roundNumber}`
  const order = BRACKET_BASE_ORDER[bracket] + roundNumber

  let nextState = ensureStage(state, stageId, label, bracket, order, { roundNumber })

  const scheduledTeams = entrants.filter((teamId) => !byes.includes(teamId))
  const pairs = pairTeams(scheduledTeams)

  pairs.forEach((pair, index) => {
    nextState = createMatch(nextState, stageId, pair, { roundNumber, bracket, matchIndex: index })
  })

  const matchIds = nextState.stages[stageId]?.matchIds ?? []
  nextState = createRoundMetadata(nextState, bracket, roundNumber, entrants, byes, matchIds)

  return nextState
}

function parseRoundStageId(stageId) {
  if (!stageId) return null
  const match = stageId.match(/^(winners|losers)-r(\d+)$/)
  if (!match) return null
  return { bracket: match[1], roundNumber: Number(match[2]) }
}

function scheduleWinnersRounds(state) {
  const rounds = state.rounds.winners ?? []
  const lastRound = rounds.length ? rounds[rounds.length - 1] : null

  const activeRound = lastRound?.stageId
    ? lastRound.matches.some((matchId) => state.matches[matchId]?.status !== 'completed')
    : false

  if (activeRound) {
    return state
  }

  const queue = Array.from(new Set((state.bracketQueues?.winners ?? []).filter(Boolean)))
  const eligibleQueue = queue.filter((teamId) => !(state.records[teamId]?.eliminated))

  if (eligibleQueue.length <= 1) {
    if (eligibleQueue.length === 1) {
      const championId = eligibleQueue[0]
      if (state.champions.winners !== championId) {
        return {
          ...state,
          champions: { ...state.champions, winners: championId },
        }
      }
    }
    return state
  }

  const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1
  const alreadyExists = rounds.some((round) => round.roundNumber === nextRoundNumber)
  if (alreadyExists && (lastRound?.roundNumber ?? 0) >= nextRoundNumber) {
    return state
  }

  const strategy = nextRoundNumber === 1 && state.initialByeTeamId ? 'random' : 'points'
  const queueForSelection = strategy === 'random' ? [...eligibleQueue] : sortByPoints(state.records, eligibleQueue)
  const { byeTeamId, remaining } = selectBye(
    state.records,
    queueForSelection,
    strategy,
    nextRoundNumber === 1 ? state.initialByeTeamId : null,
  )
  const byes = byeTeamId ? [byeTeamId] : []
  const sortedRemaining = sortByPoints(state.records, remaining)
  const entrants = byeTeamId ? [byeTeamId, ...sortedRemaining] : [...sortedRemaining]

  let nextState = {
    ...state,
    champions: { ...state.champions, winners: null },
    bracketQueues: {
      ...state.bracketQueues,
      winners: byes,
    },
  }

  nextState = createBracketRound(nextState, 'winners', nextRoundNumber, entrants, byes)

  if (nextRoundNumber === 1 && byeTeamId) {
    nextState = {
      ...nextState,
      records: {
        ...nextState.records,
        [byeTeamId]: {
          ...(nextState.records[byeTeamId] ?? { ...DEFAULT_RECORD }),
          initialBye: true,
        },
      },
      initialByeTeamId: byeTeamId,
    }
  }

  return nextState
}

function scheduleLosersRounds(state) {
  const rounds = state.rounds.losers ?? []
  const lastRound = rounds.length ? rounds[rounds.length - 1] : null

  const activeRound = lastRound?.stageId
    ? lastRound.matches.some((matchId) => state.matches[matchId]?.status !== 'completed')
    : false

  if (activeRound) {
    return state
  }

  const queue = Array.from(new Set((state.bracketQueues?.losers ?? []).filter(Boolean)))
  const eligibleQueue = queue.filter((teamId) => !(state.records[teamId]?.eliminated))

  if (eligibleQueue.length === 0) {
    return state
  }

  if (eligibleQueue.length === 1) {
    if (!state.champions.winners) {
      return state
    }

    const championId = eligibleQueue[0]
    if (state.champions.losers !== championId) {
      return {
        ...state,
        champions: { ...state.champions, losers: championId },
      }
    }
    return state
  }

  const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1
  const alreadyExists = rounds.some((round) => round.roundNumber === nextRoundNumber)
  if (alreadyExists && (lastRound?.roundNumber ?? 0) >= nextRoundNumber) {
    return state
  }

  const orderedQueue = sortByPoints(state.records, eligibleQueue)
  const { byeTeamId, remaining } = selectBye(state.records, orderedQueue, 'points')
  const byes = byeTeamId ? [byeTeamId] : []
  const sortedRemaining = sortByPoints(state.records, remaining)
  const entrants = byeTeamId ? [byeTeamId, ...sortedRemaining] : [...sortedRemaining]

  let nextState = {
    ...state,
    champions: { ...state.champions, losers: null },
    bracketQueues: {
      ...state.bracketQueues,
      losers: byes,
    },
  }

  nextState = createBracketRound(nextState, 'losers', nextRoundNumber, entrants, byes)
  return nextState
}

function scheduleFinals(state) {
  const winnersChampion = state.champions.winners
  const losersChampion = state.champions.losers
  if (!winnersChampion || !losersChampion) {
    return state
  }

  const finalStageId = 'final-1'
  const resetStageId = 'final-2'

  let nextState = ensureStage(state, finalStageId, 'Grand Final', 'finals', BRACKET_BASE_ORDER.finals + 1)

  const finalStage = nextState.stages[finalStageId]
  if (!finalStage.matchIds.length) {
    nextState = createMatch(nextState, finalStageId, [winnersChampion, losersChampion], {
      bracket: 'finals',
      roundNumber: 1,
    })
  }

  const finalMatchId = nextState.stages[finalStageId].matchIds[0]
  nextState = {
    ...nextState,
    finals: {
      ...nextState.finals,
      finalMatchId,
      resetMatchId: nextState.finals?.resetMatchId ?? null,
    },
  }

  const resetStage = nextState.stages[resetStageId]
  if (nextState.progress.finals.resetScheduled && !resetStage) {
    nextState = ensureStage(nextState, resetStageId, 'Grand Final Reset', 'finals', BRACKET_BASE_ORDER.finals + 2)
    const scheduledResetStage = nextState.stages[resetStageId]
    if (!scheduledResetStage.matchIds.length) {
      nextState = createMatch(nextState, resetStageId, [winnersChampion, losersChampion], {
        bracket: 'finals',
        roundNumber: 2,
      })
    }
  }

  const resetMatchId = nextState.stages[resetStageId]?.matchIds?.[0] ?? null
  if (resetMatchId) {
    nextState = {
      ...nextState,
      finals: {
        ...nextState.finals,
        finalMatchId,
        resetMatchId,
      },
    }
  }

  return nextState
}

function scheduleDependentStages(state) {
  let nextState = state
  nextState = scheduleWinnersRounds(nextState)
  nextState = scheduleLosersRounds(nextState)
  nextState = scheduleFinals(nextState)
  return nextState
}

function updateRoundResults(state, bracket, roundNumber, winnerId, loserId) {
  const rounds = state.rounds?.[bracket] ?? []
  const roundIndex = rounds.findIndex((round) => round.roundNumber === roundNumber)
  if (roundIndex === -1) return state

  const round = rounds[roundIndex]
  const results = round.results ?? { winners: [], losers: [] }
  const nextRound = {
    ...round,
    results: {
      winners: ensureUnique(results.winners, winnerId),
      losers: ensureUnique(results.losers, loserId),
    },
  }

  if (nextRound.results.winners.length === nextRound.matches.length) {
    nextRound.completed = true
  }

  const updatedRounds = rounds.map((item, index) => (index === roundIndex ? nextRound : item))
  const nextRounds = {
    ...state.rounds,
    [bracket]: updatedRounds,
  }

  const progressEntry = state.progress?.[bracket]?.[roundNumber] ?? { entrants: [], byes: [], winners: [], losers: [] }
  const nextProgress = {
    ...state.progress,
    [bracket]: {
      ...(state.progress?.[bracket] ?? {}),
      [roundNumber]: {
        ...progressEntry,
        winners: ensureUnique(progressEntry.winners ?? [], winnerId),
        losers: ensureUnique(progressEntry.losers ?? [], loserId),
      },
    },
  }

  return {
    ...state,
    rounds: nextRounds,
    progress: nextProgress,
  }
}

function updateProgress(state, matchId, winnerId, loserId) {
  const match = state.matches[matchId]
  if (!match) return state

  const roundMeta = parseRoundStageId(match.stageId)
  let nextState = state

  if (roundMeta) {
    const { bracket, roundNumber } = roundMeta
    nextState = updateRoundResults(nextState, bracket, roundNumber, winnerId, loserId)

    if (bracket === 'winners') {
      const queueWinners = Array.from(
        new Set([...(nextState.bracketQueues?.winners ?? []), winnerId].filter(Boolean)),
      )
      const queueLosers = Array.from(new Set([...(nextState.bracketQueues?.losers ?? []), loserId].filter(Boolean)))

      nextState = {
        ...nextState,
        bracketQueues: {
          winners: queueWinners,
          losers: queueLosers,
        },
        champions: {
          winners: queueWinners.length > 1 ? null : nextState.champions.winners,
          losers: queueLosers.length > 1 ? null : nextState.champions.losers,
        },
      }
    } else if (bracket === 'losers') {
      const queueLosers = Array.from(new Set([...(nextState.bracketQueues?.losers ?? []), winnerId].filter(Boolean)))
      nextState = {
        ...nextState,
        bracketQueues: {
          winners: nextState.bracketQueues?.winners ?? [],
          losers: queueLosers,
        },
        champions: {
          winners: nextState.champions.winners,
          losers: queueLosers.length > 1 ? null : nextState.champions.losers,
        },
      }
    }

    return nextState
  }

  if (match.stageId === 'final-1') {
    const winnersChampion = nextState.champions.winners
    const losersChampion = nextState.champions.losers
    const loserWasInitialBye = nextState.initialByeTeamId && loserId === nextState.initialByeTeamId
    const resetNeeded = winnerId === losersChampion && loserId === winnersChampion && !loserWasInitialBye

    if (resetNeeded) {
      nextState = {
        ...nextState,
        progress: {
          ...nextState.progress,
          finals: { resetScheduled: true },
        },
      }
    } else {
      nextState = {
        ...nextState,
        status: 'completed',
        completedAt: Date.now(),
        championId: winnerId,
        progress: {
          ...nextState.progress,
          finals: { resetScheduled: false },
        },
      }
    }

    return nextState
  }

  if (match.stageId === 'final-2') {
    return {
      ...nextState,
      status: 'completed',
      completedAt: Date.now(),
      championId: winnerId,
      progress: {
        ...nextState.progress,
        finals: { resetScheduled: false },
      },
    }
  }

  return nextState
}

export function initializeTournament(teams, moderators) {
  const records = teams.reduce((accumulator, team) => {
    accumulator[team.id] = { ...DEFAULT_RECORD }
    return accumulator
  }, {})

  let state = {
    id: `tournament-${Date.now()}`,
    status: 'pending',
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    championId: null,
    matches: {},
    stages: {},
    moderatorRoster: moderators ?? [],
    moderatorCursor: 0,
    records,
    progress: cloneProgress(),
    rounds: { winners: [], losers: [] },
    bracketQueues: { winners: [], losers: [] },
    champions: { winners: null, losers: null },
    finals: { finalMatchId: null, resetMatchId: null },
    initialByeTeamId: null,
  }

  const shuffledTeamIds = shuffleTeamIds(teams.map((team) => team.id))
  const entrants = [...shuffledTeamIds]
  const strategy = entrants.length % 2 === 0 ? 'points' : 'random'
  const { byeTeamId, remaining } = selectBye(state.records, entrants, strategy)
  const byes = byeTeamId ? [byeTeamId] : []
  const roundEntrants = byeTeamId ? [byeTeamId, ...remaining] : [...remaining]

  state = {
    ...state,
    bracketQueues: {
      winners: byes,
      losers: [],
    },
  }

  state = createBracketRound(state, 'winners', 1, roundEntrants, byes)

  if (byeTeamId) {
    state = {
      ...state,
      records: {
        ...state.records,
        [byeTeamId]: {
          ...(state.records[byeTeamId] ?? { ...DEFAULT_RECORD }),
          initialBye: true,
        },
      },
      initialByeTeamId: byeTeamId,
    }
  }

  return state
}

export function recordMatchResult(state, matchId, payload) {
  if (!payload || !payload.winnerId || !payload.loserId) {
    return state
  }

  const existing = state.matches[matchId]
  if (!existing || existing.status === 'completed') {
    return state
  }

  let nextState = applyMatchCompletion(state, matchId, payload)
  nextState = updateProgress(nextState, matchId, payload.winnerId, payload.loserId)
  nextState = scheduleDependentStages(nextState)
  return nextState
}

export function grantMatchBye(state, matchId, teamId) {
  if (!canGrantBye(state, matchId)) return state
  const match = state.matches[matchId]
  if (!match) return state
  const [teamAId, teamBId] = match.teams
  if (teamId !== teamAId && teamId !== teamBId) {
    return state
  }
  const opponentId = teamId === teamAId ? teamBId : teamAId
  if (!opponentId) {
    return state
  }

  const payload = {
    winnerId: teamId,
    loserId: opponentId,
    scores: { [teamId]: 0, [opponentId]: 0 },
  }

  let nextState = recordMatchResult(state, matchId, payload)
  const updatedMatch = nextState.matches[matchId]
  if (updatedMatch) {
    nextState = {
      ...nextState,
      matches: {
        ...nextState.matches,
        [matchId]: {
          ...updatedMatch,
          matchRefId: null,
          meta: { ...(updatedMatch.meta ?? {}), byeAwarded: true },
        },
      },
    }
  }

  return nextState
}

export function listStages(state) {
  return Object.values(state.stages)
    .filter(Boolean)
    .sort((left, right) => left.order - right.order)
}

export function listMatchesForStage(state, stageId) {
  const stage = state.stages[stageId]
  if (!stage) return []
  return stage.matchIds.map((matchId) => state.matches[matchId])
}

export function getMatch(state, matchId) {
  return state.matches[matchId] ?? null
}

export function findMatchForTeams(state, teamAId, teamBId) {
  if (!state || !teamAId || !teamBId) return null
  const candidates = Object.values(state.matches)
  const key = [teamAId, teamBId].sort().join('::')
  for (const match of candidates) {
    if (match.status === 'completed') continue
    const teams = match.teams.map((teamId) => teamId ?? null)
    if (!teams.every(Boolean)) continue
    const matchKey = [...teams].sort().join('::')
    if (matchKey === key) {
      return match
    }
  }
  return null
}

export function attachLiveMatch(state, matchId, liveMatchId) {
  const match = state?.matches?.[matchId]
  if (!match) return state
  const updatedMatch = {
    ...match,
    matchRefId: liveMatchId,
    status: match.status === 'completed' ? match.status : 'active',
  }
  return {
    ...state,
    matches: {
      ...state.matches,
      [matchId]: updatedMatch,
    },
    status: state.status === 'pending' ? 'active' : state.status,
    startedAt: state.startedAt ?? Date.now(),
  }
}

export function detachLiveMatch(state, matchId) {
  const match = state?.matches?.[matchId]
  if (!match) return state
  if (match.matchRefId == null) return state
  return {
    ...state,
    matches: {
      ...state.matches,
      [matchId]: {
        ...match,
        matchRefId: null,
      },
    },
  }
}
