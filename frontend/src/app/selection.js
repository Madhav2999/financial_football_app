import { TOURNAMENT_TEAM_LIMIT } from './constants'

export function buildDefaultTeamSelection(teams, limit = TOURNAMENT_TEAM_LIMIT) {
  const roster = Array.isArray(teams) ? teams : []
  const requiredCount = Math.min(limit, roster.length)
  return roster.slice(0, requiredCount).map((team) => team.id)
}

export function createSelectionKey(ids) {
  if (!ids?.length) return ''
  return [...ids].sort().join('|')
}
