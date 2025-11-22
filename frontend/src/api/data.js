import { getHeaders, getStoredToken } from './auth'

async function fetchJson(path) {
  const token = getStoredToken()
  const response = await fetch(path, { headers: getHeaders(token, false) })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.message || 'Failed to load data')
    error.status = response.status
    throw error
  }

  return payload
}

export async function fetchTeams() {
  return fetchJson('/api/data/teams')
}

export async function fetchTeam(teamId) {
  return fetchJson(`/api/data/teams/${teamId}`)
}

export async function fetchModerators() {
  return fetchJson('/api/data/moderators')
}

export async function fetchMatchHistory() {
  return fetchJson('/api/data/matches/history')
}

export async function fetchTournament() {
  return fetchJson('/api/data/tournament')
}

export async function fetchQuestions() {
  return fetchJson('/api/data/questions')
}

export { fetchJson as fetchDataWithAuth }
