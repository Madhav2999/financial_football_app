const STAGE_DEFINITIONS = [
  { id: 'winners-r1', label: 'Winners Round 1', bracket: 'winners', order: 1 },
  { id: 'losers-r1', label: 'Losers Round 1', bracket: 'losers', order: 2 },
  { id: 'winners-r2', label: 'Winners Round 2', bracket: 'winners', order: 3 },
  { id: 'losers-r2', label: 'Losers Round 2', bracket: 'losers', order: 4 },
  { id: 'winners-r3-playoff', label: 'Winners Round 3 Playoff', bracket: 'winners', order: 5 },
  { id: 'winners-r3-final', label: 'Winners Final', bracket: 'winners', order: 6 },
  { id: 'losers-r3', label: 'Losers Round 3', bracket: 'losers', order: 7 },
  { id: 'losers-r4-playoff', label: 'Losers Round 4 Playoff', bracket: 'losers', order: 8 },
  { id: 'losers-r4-final', label: 'Losers Round 4 Final', bracket: 'losers', order: 9 },
  { id: 'final-1', label: 'Grand Final', bracket: 'finals', order: 10 },
  { id: 'final-2', label: 'Grand Final Reset', bracket: 'finals', order: 11 },
]

const EMPTY_PROGRESS = {
  winnersRound1: { winners: [], losers: [] },
  losersRound1: { winners: [] },
  winnersRound2: { winners: [], losers: [] },
  losersRound2: { winners: [] },
  winnersRound3: {
    finalist: null,
    playoffLoser: null,
    finalLoser: null,
    champion: null,
  },
  losersRound3: { winners: [] },
  losersRound4: { champion: null },
  finals: { resetScheduled: false },
}

function buildStageMap() {
  return STAGE_DEFINITIONS.reduce((map, stage) => {
    map[stage.id] = { ...stage, matchIds: [] }
    return map
  }, {})
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

function updateMatchTeams(state, matchId, teams) {
  const match = state.matches[matchId]
  if (!match) return state

  const nextTeams = teams.map((teamId) => teamId ?? null)
  const hasBothSides = nextTeams.every((teamId) => Boolean(teamId))

  const nextMatch = {
    ...match,
    teams: nextTeams,
    status:
      match.status === 'completed'
        ? match.status
        : hasBothSides
        ? 'scheduled'
        : 'pending',
  }

  return {
    ...state,
    matches: {
      ...state.matches,
      [matchId]: nextMatch,
    },
  }
}

function ensureUnique(array, value) {
  return array.includes(value) ? array : [...array, value]
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

  const winnerRecord = state.records[winnerId] ?? { wins: 0, losses: 0, points: 0, eliminated: false }
  const loserRecord = state.records[loserId] ?? { wins: 0, losses: 0, points: 0, eliminated: false }

  const nextRecords = {
    ...state.records,
    [winnerId]: {
      ...winnerRecord,
      wins: winnerRecord.wins + 1,
      points: winnerRecord.points + (scores[winnerId] ?? 0),
    },
    [loserId]: {
      ...loserRecord,
      losses: loserRecord.losses + 1,
      points: loserRecord.points + (scores[loserId] ?? 0),
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

function scheduleWinnersRound2(state) {
  const stage = state.stages['winners-r2']
  if (!stage || stage.matchIds.length) return state
  const winners = state.progress.winnersRound1.winners
  if (winners.length !== 6) return state

  return pairTeams(winners).reduce((nextState, teams) => createMatch(nextState, 'winners-r2', teams), state)
}

function scheduleLosersRound1(state) {
  const stage = state.stages['losers-r1']
  if (!stage || stage.matchIds.length) return state
  const losers = state.progress.winnersRound1.losers
  if (losers.length !== 6) return state

  return pairTeams(losers).reduce((nextState, teams) => createMatch(nextState, 'losers-r1', teams), state)
}

function scheduleLosersRound2(state) {
  const stage = state.stages['losers-r2']
  if (!stage || stage.matchIds.length) return state
  const lowerBracketWinners = state.progress.losersRound1.winners
  const upperBracketLosers = state.progress.winnersRound2.losers
  if (lowerBracketWinners.length !== 3 || upperBracketLosers.length !== 3) return state

  let nextState = state
  for (let index = 0; index < 3; index += 1) {
    nextState = createMatch(nextState, 'losers-r2', [lowerBracketWinners[index], upperBracketLosers[index]])
  }
  return nextState
}

function scheduleWinnersRound3(state) {
  const playoffStage = state.stages['winners-r3-playoff']
  if (!playoffStage || playoffStage.matchIds.length) return state
  const winners = state.progress.winnersRound2.winners
  if (winners.length !== 3) return state

  const ordered = sortByPoints(state.records, winners)
  const topSeed = ordered[0]
  const playoffTeams = ordered.slice(1)

  let nextState = state

  if (playoffTeams.length === 2) {
    nextState = createMatch(nextState, 'winners-r3-playoff', playoffTeams)
  }

  const finalStage = nextState.stages['winners-r3-final']
  if (!finalStage.matchIds.length) {
    nextState = createMatch(nextState, 'winners-r3-final', [topSeed, null], { topSeed })
  } else {
    const finalMatchId = finalStage.matchIds[0]
    const existingTeams = nextState.matches[finalMatchId]?.teams ?? [topSeed, null]
    nextState = updateMatchTeams(nextState, finalMatchId, [topSeed, existingTeams[1]])
  }

  return {
    ...nextState,
    progress: {
      ...nextState.progress,
      winnersRound3: {
        ...nextState.progress.winnersRound3,
        finalist: topSeed,
      },
    },
  }
}

function scheduleLosersRound3(state) {
  const stage = state.stages['losers-r3']
  if (!stage || stage.matchIds.length) return state
  const round2Winners = state.progress.losersRound2.winners
  const playoffLoser = state.progress.winnersRound3.playoffLoser
  if (round2Winners.length !== 3 || !playoffLoser) return state

  const entrants = [...round2Winners, playoffLoser]
  return pairTeams(entrants).reduce((nextState, teams) => createMatch(nextState, 'losers-r3', teams), state)
}

function scheduleLosersRound4(state) {
  const playoffStage = state.stages['losers-r4-playoff']
  if (!playoffStage || playoffStage.matchIds.length) return state
  const round3Winners = state.progress.losersRound3.winners
  const winnersFinalLoser = state.progress.winnersRound3.finalLoser
  if (round3Winners.length !== 2 || !winnersFinalLoser) return state

  const entrants = [...round3Winners, winnersFinalLoser]
  const ordered = sortByPoints(state.records, entrants)
  const topSeed = ordered[0]
  const challengers = ordered.slice(1)

  let nextState = createMatch(state, 'losers-r4-playoff', challengers, { topSeed })
  const finalStage = nextState.stages['losers-r4-final']
  if (!finalStage.matchIds.length) {
    nextState = createMatch(nextState, 'losers-r4-final', [topSeed, null])
  } else {
    const finalMatchId = finalStage.matchIds[0]
    nextState = updateMatchTeams(nextState, finalMatchId, [topSeed, nextState.matches[finalMatchId].teams[1]])
  }

  return nextState
}

function scheduleGrandFinal(state) {
  const finalStage = state.stages['final-1']
  if (!finalStage || finalStage.matchIds.length) return state
  const winnersChampion = state.progress.winnersRound3.champion
  const losersChampion = state.progress.losersRound4.champion
  if (!winnersChampion || !losersChampion) return state

  return createMatch(state, 'final-1', [winnersChampion, losersChampion])
}

function scheduleDependentStages(state) {
  let nextState = state
  nextState = scheduleWinnersRound2(nextState)
  nextState = scheduleLosersRound1(nextState)
  nextState = scheduleLosersRound2(nextState)
  nextState = scheduleWinnersRound3(nextState)
  nextState = scheduleLosersRound3(nextState)
  nextState = scheduleLosersRound4(nextState)
  nextState = scheduleGrandFinal(nextState)
  return nextState
}

function updateProgress(state, matchId, winnerId, loserId) {
  const match = state.matches[matchId]
  if (!match) return state

  const progress = state.progress
  let nextState = state

  switch (match.stageId) {
    case 'winners-r1': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          winnersRound1: {
            winners: ensureUnique(progress.winnersRound1.winners, winnerId),
            losers: ensureUnique(progress.winnersRound1.losers, loserId),
          },
        },
      }
      break
    }
    case 'losers-r1': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          losersRound1: {
            winners: ensureUnique(progress.losersRound1.winners, winnerId),
          },
        },
      }
      break
    }
    case 'winners-r2': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          winnersRound2: {
            winners: ensureUnique(progress.winnersRound2.winners, winnerId),
            losers: ensureUnique(progress.winnersRound2.losers, loserId),
          },
        },
      }
      break
    }
    case 'losers-r2': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          losersRound2: {
            winners: ensureUnique(progress.losersRound2.winners, winnerId),
          },
        },
      }
      break
    }
    case 'winners-r3-playoff': {
      const finalStage = nextState.stages['winners-r3-final']
      if (finalStage.matchIds.length) {
        const finalMatchId = finalStage.matchIds[0]
        const finalist = progress.winnersRound3.finalist
        nextState = updateMatchTeams(nextState, finalMatchId, [finalist, winnerId])
      }
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          winnersRound3: {
            ...progress.winnersRound3,
            playoffLoser: loserId,
          },
        },
      }
      break
    }
    case 'winners-r3-final': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          winnersRound3: {
            ...progress.winnersRound3,
            finalLoser: loserId,
            champion: winnerId,
          },
        },
      }
      break
    }
    case 'losers-r3': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          losersRound3: {
            winners: ensureUnique(progress.losersRound3.winners, winnerId),
          },
        },
      }
      break
    }
    case 'losers-r4-playoff': {
      const finalStage = nextState.stages['losers-r4-final']
      if (finalStage.matchIds.length) {
        const finalMatchId = finalStage.matchIds[0]
        const current = nextState.matches[finalMatchId]
        nextState = updateMatchTeams(nextState, finalMatchId, [current.teams[0], winnerId])
      }
      break
    }
    case 'losers-r4-final': {
      nextState = {
        ...nextState,
        progress: {
          ...progress,
          losersRound4: {
            champion: winnerId,
          },
        },
      }
      break
    }
    case 'final-1': {
      const winnersChampion = progress.winnersRound3.champion
      const losersChampion = progress.losersRound4.champion
      const resetNeeded = winnerId === losersChampion && loserId === winnersChampion
      if (resetNeeded) {
        const resetStage = nextState.stages['final-2']
        if (!resetStage.matchIds.length) {
          nextState = createMatch(nextState, 'final-2', [winnerId, loserId])
        }
        nextState = {
          ...nextState,
          progress: {
            ...progress,
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
            ...progress,
            finals: { resetScheduled: false },
          },
        }
      }
      break
    }
    case 'final-2': {
      nextState = {
        ...nextState,
        status: 'completed',
        completedAt: Date.now(),
        championId: winnerId,
        progress: {
          ...progress,
          finals: { resetScheduled: false },
        },
      }
      break
    }
    default:
      break
  }

  return nextState
}

export function initializeTournament(teams, moderators) {
  const stageMap = buildStageMap()
  const records = teams.reduce((accumulator, team) => {
    accumulator[team.id] = { wins: 0, losses: 0, points: 0, eliminated: false }
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
    stages: stageMap,
    moderatorRoster: moderators ?? [],
    moderatorCursor: 0,
    records,
    progress: JSON.parse(JSON.stringify(EMPTY_PROGRESS)),
  }

  const shuffledTeamIds = shuffleTeamIds(teams.map((team) => team.id))
  const initialPairs = pairTeams(shuffledTeamIds)
  initialPairs.forEach((teamsForMatch, index) => {
    state = createMatch(state, 'winners-r1', teamsForMatch, { seedIndex: index })
  })

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

export function listStages(state) {
  return STAGE_DEFINITIONS.map((stage) => state.stages[stage.id])
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
