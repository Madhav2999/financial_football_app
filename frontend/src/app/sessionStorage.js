export const SESSION_STORAGE_KEY = 'ffa.auth.session.v1'

export const readStoredSession = () => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (parsed?.token && parsed?.type) {
      return parsed
    }
  } catch (error) {
    console.warn('Unable to read stored session', error)
  }
  return null
}

export const writeStoredSession = (session) => {
  if (typeof localStorage === 'undefined') return

  if (session?.token && session?.type && session.type !== 'guest') {
    const payload = {
      type: session.type,
      token: session.token,
      teamId: session.teamId ?? null,
      moderatorId: session.moderatorId ?? null,
      profile: session.profile ?? null,
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

export const clearStoredSession = () => {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(SESSION_STORAGE_KEY)
}
