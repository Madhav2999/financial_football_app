import { PRIMARY_QUESTION_DURATION_MS, STEAL_QUESTION_DURATION_MS } from '../constants/matchSettings.js'

const TIMER_DURATIONS = {
  primary: PRIMARY_QUESTION_DURATION_MS,
  steal: STEAL_QUESTION_DURATION_MS,
}

export const createRunningTimer = (type = 'primary', remainingOverride = null) => {
  const duration = TIMER_DURATIONS[type] ?? TIMER_DURATIONS.primary
  const remainingMs = remainingOverride ?? duration
  const now = Date.now()

  return {
    type,
    status: 'running',
    durationMs: duration,
    remainingMs,
    startedAt: now,
    deadline: now + remainingMs,
  }
}

export const pauseTimer = (timer) => {
  if (!timer || timer.status !== 'running') {
    return timer ?? null
  }

  const now = Date.now()
  const remainingMs = Math.max(0, (timer.deadline ?? now) - now)

  return {
    ...timer,
    status: 'paused',
    remainingMs,
    deadline: null,
  }
}

export const resumeTimer = (timer) => {
  if (!timer || timer.status !== 'paused') {
    return timer ?? null
  }

  const remainingMs = Math.max(0, timer.remainingMs ?? timer.durationMs ?? 0)
  const now = Date.now()

  return {
    ...timer,
    status: 'running',
    startedAt: now,
    deadline: now + remainingMs,
    remainingMs,
  }
}
