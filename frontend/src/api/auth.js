const TOKEN_KEY = 'ffa_auth_token'

function getHeaders(token, bodyProvided = true) {
  const headers = bodyProvided ? { 'Content-Type': 'application/json' } : {}
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function postJson(url, body, token) {
  const method = body ? 'POST' : 'GET'
  const response = await fetch(url, {
    method,
    headers: getHeaders(token, Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    throw error
  }

  return data
}

export function getStoredToken() {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token) {
  if (typeof localStorage === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearStoredToken() {
  setStoredToken(null)
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    return JSON.parse(atob(parts[1]))
  } catch (error) {
    console.warn('Failed to decode token payload', error)
    return null
  }
}

async function loginWithRole(role, credentials) {
  const endpoints = {
    admin: '/auth/admin',
    moderator: '/auth/moderator',
    team: '/auth/team',
  }

  const endpoint = endpoints[role] || endpoints.team
  const result = await postJson(endpoint, credentials)
  if (result?.token) setStoredToken(result.token)
  return result
}

export async function loginTeam(credentials) {
  return loginWithRole('team', credentials)
}

export async function loginAdmin(credentials) {
  return loginWithRole('admin', credentials)
}

export async function loginModerator(credentials) {
  return loginWithRole('moderator', credentials)
}

export async function registerTeam(payload) {
  return postJson('/auth/register', payload)
}

export async function registerModerator(payload) {
  return postJson('/auth/register/moderator', payload)
}

export async function requestTeamPasswordReset(payload) {
  return postJson('/auth/forgot-password/team', payload)
}

export async function requestModeratorPasswordReset(payload) {
  return postJson('/auth/forgot-password/moderator', payload)
}

export async function fetchProfile(token) {
  const authToken = token ?? getStoredToken()
  if (!authToken) throw new Error('Missing auth token')

  try {
    return await postJson('/auth/me', null, authToken)
  } catch (networkError) {
    const decoded = decodeJwtPayload(authToken)
    if (decoded) {
      return { ...decoded, token: authToken }
    }
    throw networkError
  }
}

export function deriveSessionFromProfile(data = {}) {
  const user = data.user ?? data.profile ?? null
  const normalizedRole = (data.type || data.role || user?.role || user?.accountType || user?.type || '')
    .toString()
    .toLowerCase()

  let type = normalizedRole
  if (!['team', 'admin', 'moderator'].includes(type)) {
    if (user?.teamName || user?.organization) {
      type = 'team'
    }
  }

  const teamId = type === 'team' ? user?.id ?? user?.loginId ?? user?.teamId : undefined
  const moderatorId = type === 'moderator' ? user?.id ?? user?.loginId ?? user?.moderatorId : undefined

  return {
    type: type || 'guest',
    teamId,
    moderatorId,
    profile: user || null,
    token: data.token ?? getStoredToken(),
  }
}

export function createSessionFromAuthResponse(result, fallbackType) {
  return deriveSessionFromProfile({ ...result, type: result?.type ?? fallbackType, token: result?.token })
}

export async function restoreSessionFromStorage() {
  const token = getStoredToken()
  if (!token) return null

  const profileData = await fetchProfile(token)
  return deriveSessionFromProfile({ ...profileData, token })
}
