import { TIMER_DURATIONS } from './constants'

export function createRunningTimer(type = 'primary', remainingOverride = null) {
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

export function pauseTimer(timer) {
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

export function resumeTimer(timer) {
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
