import { initialTeams } from '../data/teams'

export function normalizeTeamRecord(team) {
  if (!team) return null
  const normalizedId = team.id || team._id || team.loginId || team.teamId
  return {
    id: normalizedId,
    loginId: team.loginId || normalizedId,
    name: team.name || team.teamName || team.organization || team.loginId,
    region: team.region || team.county || '',
    coachContact: team.coachContact || '',
    seed: typeof team.seed === 'number' ? team.seed : null,
    avatarUrl: team.avatarUrl,
    metadata: team.metadata || {},
    wins: Number.isFinite(team.wins) ? team.wins : 0,
    losses: Number.isFinite(team.losses) ? team.losses : 0,
    totalScore: Number.isFinite(team.totalScore) ? team.totalScore : 0,
    eliminated: Boolean(team.eliminated),
  }
}

export function normalizeModeratorRecord(moderator) {
  if (!moderator) return null
  const normalizedId = moderator.id || moderator._id || moderator.loginId
  const displayName = moderator.displayName || moderator.name || moderator.loginId
  return {
    id: normalizedId,
    loginId: moderator.loginId || normalizedId,
    email: moderator.email,
    displayName,
    name: displayName,
    role: moderator.role || 'moderator',
    permissions: moderator.permissions || [],
    avatarUrl: moderator.avatarUrl,
  }
}

export function buildInitialTeams() {
  return initialTeams.map((team) => ({
    ...team,
    wins: 0,
    losses: 0,
    totalScore: 0,
    eliminated: false,
  }))
}

export const INITIAL_TEAM_STATE = buildInitialTeams()
