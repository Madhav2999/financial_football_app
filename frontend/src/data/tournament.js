const MATCH_TEMPLATES = {
  W1: {
    bracket: 'winners',
    round: 1,
    label: 'Winners Round 1 - Match 1',
    participants: [
      { type: 'team', seed: 0 },
      { type: 'team', seed: 1 },
    ],
    next: {
      winner: { matchId: 'W7', slot: 0 },
      loser: { matchId: 'L1', slot: 0 },
    },
  },
  W2: {
    bracket: 'winners',
    round: 1,
    label: 'Winners Round 1 - Match 2',
    participants: [
      { type: 'team', seed: 2 },
      { type: 'team', seed: 3 },
    ],
    next: {
      winner: { matchId: 'W7', slot: 1 },
      loser: { matchId: 'L1', slot: 1 },
    },
  },
  W3: {
    bracket: 'winners',
    round: 1,
    label: 'Winners Round 1 - Match 3',
    participants: [
      { type: 'team', seed: 4 },
      { type: 'team', seed: 5 },
    ],
    next: {
      winner: { matchId: 'W8', slot: 0 },
      loser: { matchId: 'L2', slot: 0 },
    },
  },
  W4: {
    bracket: 'winners',
    round: 1,
    label: 'Winners Round 1 - Match 4',
    participants: [
      { type: 'team', seed: 6 },
      { type: 'team', seed: 7 },
    ],
    next: {
      winner: { matchId: 'W8', slot: 1 },
      loser: { matchId: 'L2', slot: 1 },
    },
  },
  W5: {
    bracket: 'winners',
    round: 1,
    label: 'Winners Round 1 - Match 5',
    participants: [
      { type: 'team', seed: 8 },
      { type: 'team', seed: 9 },
    ],
    next: {
      winner: { matchId: 'W9', slot: 0 },
      loser: { matchId: 'L3', slot: 0 },
    },
  },
  W6: {
    bracket: 'winners',
    round: 1,
    label: 'Winners Round 1 - Match 6',
    participants: [
      { type: 'team', seed: 10 },
      { type: 'team', seed: 11 },
    ],
    next: {
      winner: { matchId: 'W9', slot: 1 },
      loser: { matchId: 'L3', slot: 1 },
    },
  },
  L1: {
    bracket: 'losers',
    round: 1,
    label: 'Losers Round 1 - Match 1',
    participants: [
      { type: 'match', matchId: 'W1', outcome: 'loser' },
      { type: 'match', matchId: 'W2', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'L4', slot: 0 },
    },
  },
  L2: {
    bracket: 'losers',
    round: 1,
    label: 'Losers Round 1 - Match 2',
    participants: [
      { type: 'match', matchId: 'W3', outcome: 'loser' },
      { type: 'match', matchId: 'W4', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'L5', slot: 0 },
    },
  },
  L3: {
    bracket: 'losers',
    round: 1,
    label: 'Losers Round 1 - Match 3',
    participants: [
      { type: 'match', matchId: 'W5', outcome: 'loser' },
      { type: 'match', matchId: 'W6', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'L6', slot: 0 },
    },
  },
  W7: {
    bracket: 'winners',
    round: 2,
    label: 'Winners Round 2 - Match 1',
    participants: [
      { type: 'match', matchId: 'W1', outcome: 'winner' },
      { type: 'match', matchId: 'W2', outcome: 'winner' },
    ],
    next: {
      winner: { matchId: 'W10', slot: 0 },
      loser: { matchId: 'L4', slot: 1 },
    },
  },
  W8: {
    bracket: 'winners',
    round: 2,
    label: 'Winners Round 2 - Match 2',
    participants: [
      { type: 'match', matchId: 'W3', outcome: 'winner' },
      { type: 'match', matchId: 'W4', outcome: 'winner' },
    ],
    next: {
      winner: { matchId: 'W10', slot: 1 },
      loser: { matchId: 'L5', slot: 1 },
    },
  },
  W9: {
    bracket: 'winners',
    round: 2,
    label: 'Winners Round 2 - Match 3',
    participants: [
      { type: 'match', matchId: 'W5', outcome: 'winner' },
      { type: 'match', matchId: 'W6', outcome: 'winner' },
    ],
    next: {
      winner: { matchId: 'W11', slot: 1 },
      loser: { matchId: 'L6', slot: 1 },
    },
  },
  L4: {
    bracket: 'losers',
    round: 2,
    label: 'Losers Round 2 - Match 1',
    participants: [
      { type: 'match', matchId: 'L1', outcome: 'winner' },
      { type: 'match', matchId: 'W7', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'L7', slot: 0 },
    },
  },
  L5: {
    bracket: 'losers',
    round: 2,
    label: 'Losers Round 2 - Match 2',
    participants: [
      { type: 'match', matchId: 'L2', outcome: 'winner' },
      { type: 'match', matchId: 'W8', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'L7', slot: 1 },
    },
  },
  L6: {
    bracket: 'losers',
    round: 2,
    label: 'Losers Round 2 - Match 3',
    participants: [
      { type: 'match', matchId: 'L3', outcome: 'winner' },
      { type: 'match', matchId: 'W9', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'L8', slot: 1 },
    },
  },
  W10: {
    bracket: 'winners',
    round: 3,
    label: 'Winners Round 3 - Semifinal',
    participants: [
      { type: 'match', matchId: 'W7', outcome: 'winner' },
      { type: 'match', matchId: 'W8', outcome: 'winner' },
    ],
    next: {
      winner: { matchId: 'W11', slot: 0 },
      loser: { matchId: 'L8', slot: 0 },
    },
  },
  L7: {
    bracket: 'losers',
    round: 3,
    label: 'Losers Round 3',
    participants: [
      { type: 'match', matchId: 'L4', outcome: 'winner' },
      { type: 'match', matchId: 'L5', outcome: 'winner' },
    ],
    next: {
      winner: { matchId: 'L8', slot: 0 },
    },
  },
  W11: {
    bracket: 'winners',
    round: 3,
    label: 'Winners Final',
    participants: [
      { type: 'match', matchId: 'W10', outcome: 'winner' },
      { type: 'match', matchId: 'W9', outcome: 'winner' },
    ],
    next: {
      winner: { matchId: 'F1', slot: 0 },
      loser: { matchId: 'L8', slot: 1 },
    },
  },
  L8: {
    bracket: 'losers',
    round: 4,
    label: 'Losers Final',
    participants: [
      { type: 'match', matchId: 'L7', outcome: 'winner' },
      { type: 'match', matchId: 'W11', outcome: 'loser' },
    ],
    next: {
      winner: { matchId: 'F1', slot: 1 },
    },
  },
  F1: {
    bracket: 'finals',
    round: 1,
    label: 'Grand Final',
    participants: [
      { type: 'match', matchId: 'W11', outcome: 'winner' },
      { type: 'match', matchId: 'L8', outcome: 'winner' },
    ],
    next: {
      loser: { matchId: 'F2', slot: 0 },
      winner: { championship: true },
    },
  },
  F2: {
    bracket: 'finals',
    round: 2,
    label: 'Grand Final Reset',
    participants: [
      { type: 'match', matchId: 'F1', outcome: 'winner' },
      { type: 'match', matchId: 'F1', outcome: 'loser' },
    ],
    next: {
      winner: { championship: true },
    },
  },
}

const ROUND_STRUCTURE = {
  winners: [
    { id: 'wb-r1', name: 'Winners Round 1', matches: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'] },
    { id: 'wb-r2', name: 'Winners Round 2', matches: ['W7', 'W8', 'W9'] },
    { id: 'wb-r3', name: 'Winners Round 3', matches: ['W10', 'W11'] },
  ],
  losers: [
    { id: 'lb-r1', name: 'Losers Round 1', matches: ['L1', 'L2', 'L3'] },
    { id: 'lb-r2', name: 'Losers Round 2', matches: ['L4', 'L5', 'L6'] },
    { id: 'lb-r3', name: 'Losers Round 3', matches: ['L7'] },
    { id: 'lb-r4', name: 'Losers Round 4', matches: ['L8'] },
  ],
  finals: [
    { id: 'fin-1', name: 'Finals', matches: ['F1', 'F2'] },
  ],
}

function seedTeamsIntoMatch(matchTemplate, teams) {
  return matchTemplate.participants.map((participant) => {
    if (participant.type === 'team') {
      const team = teams[participant.seed]
      return team ? { type: 'team', id: team.id } : { type: 'team', id: null }
    }

    return { ...participant }
  })
}

function buildMatchFromTemplate(matchId, template, teams) {
  return {
    id: matchId,
    bracket: template.bracket,
    round: template.round,
    label: template.label,
    participants: template.participants,
    resolvedSides: seedTeamsIntoMatch(template, teams),
    status: 'pending',
    scores: {},
    history: [],
    winnerId: null,
    loserId: null,
    moderatorId: null,
    linkedMatchId: null,
  }
}

export function createTournament(teams) {
  const matches = Object.entries(MATCH_TEMPLATES).reduce((acc, [matchId, template]) => {
    acc[matchId] = buildMatchFromTemplate(matchId, template, teams)
    return acc
  }, {})

  return {
    status: 'pending',
    startedAt: null,
    completedAt: null,
    matches,
    rounds: ROUND_STRUCTURE,
    championId: null,
  }
}

function updateResolvedSides(match, matches) {
  const resolvedSides = match.participants.map((participant) => {
    if (participant.type === 'team') {
      return participant
    }

    const sourceMatch = matches[participant.matchId]
    if (!sourceMatch) {
      return { type: 'team', id: null }
    }

    if (participant.outcome === 'winner') {
      return { type: 'team', id: sourceMatch.winnerId }
    }

    if (participant.outcome === 'loser') {
      return { type: 'team', id: sourceMatch.loserId }
    }

    return { type: 'team', id: null }
  })

  return { ...match, resolvedSides }
}

export function refreshTournamentMatches(tournament) {
  const updated = { ...tournament, matches: { ...tournament.matches } }

  Object.keys(updated.matches).forEach((matchId) => {
    updated.matches[matchId] = updateResolvedSides(updated.matches[matchId], updated.matches)
  })

  return updated
}

function applyNextAssignment(target, teamId) {
  if (!target || !teamId) {
    return null
  }

  if (target.championship) {
    return { type: 'champion', teamId }
  }

  return { type: 'match-slot', matchId: target.matchId, slot: target.slot }
}

export function propagateTournamentResult(tournament, matchId, { winnerId, loserId }) {
  if (!tournament.matches[matchId]) {
    return tournament
  }

  const template = MATCH_TEMPLATES[matchId]
  const nextAssignments = {
    winner: applyNextAssignment(template?.next?.winner, winnerId),
    loser: applyNextAssignment(template?.next?.loser, loserId),
  }

  const updated = { ...tournament, matches: { ...tournament.matches } }
  updated.matches[matchId] = {
    ...updated.matches[matchId],
    winnerId,
    loserId,
    status: 'completed',
    resolvedSides: updateResolvedSides(updated.matches[matchId], updated.matches).resolvedSides,
  }

  if (nextAssignments.winner && nextAssignments.winner.type === 'match-slot') {
    const targetMatch = updated.matches[nextAssignments.winner.matchId]
    if (targetMatch) {
      const nextResolved = [...targetMatch.resolvedSides]
      nextResolved[nextAssignments.winner.slot] = { type: 'team', id: winnerId }
      updated.matches[nextAssignments.winner.matchId] = {
        ...targetMatch,
        resolvedSides: nextResolved,
      }
    }
  }

  if (nextAssignments.loser && nextAssignments.loser.type === 'match-slot') {
    const targetMatch = updated.matches[nextAssignments.loser.matchId]
    if (targetMatch) {
      const nextResolved = [...targetMatch.resolvedSides]
      nextResolved[nextAssignments.loser.slot] = { type: 'team', id: loserId }
      updated.matches[nextAssignments.loser.matchId] = {
        ...targetMatch,
        resolvedSides: nextResolved,
      }
    }
  }

  if (nextAssignments.winner && nextAssignments.winner.type === 'champion') {
    updated.status = 'completed'
    updated.completedAt = Date.now()
    updated.championId = winnerId
  }

  return refreshTournamentMatches(updated)
}

export function listTournamentMatches(tournament) {
  return Object.values(tournament.matches)
    .sort((a, b) => {
      if (a.bracket === b.bracket) {
        if (a.round === b.round) {
          return a.id.localeCompare(b.id)
        }
        return a.round - b.round
      }

      const order = { winners: 0, losers: 1, finals: 2 }
      return (order[a.bracket] ?? 99) - (order[b.bracket] ?? 99)
    })
}

export function tournamentMatchIds() {
  return Object.keys(MATCH_TEMPLATES)
}

export function matchTemplate(matchId) {
  return MATCH_TEMPLATES[matchId]
}
