import { useEffect, useState } from 'react'
import {
  PRIMARY_QUESTION_DURATION_MS,
  STEAL_QUESTION_DURATION_MS,
} from '../constants/matchSettings'

const DURATION_BY_TYPE = {
  primary: PRIMARY_QUESTION_DURATION_MS,
  steal: STEAL_QUESTION_DURATION_MS,
}

export function useMatchTimer(timer) {
  const [now, setNow] = useState(Date.now())
  const [syncBaseline, setSyncBaseline] = useState({ remainingMs: null, syncedAt: null })
  const [smoothedSkew, setSmoothedSkew] = useState(0)

  // Smooth clock skew to avoid sudden jumps on a single update
  const rawSkew = timer?.serverNow ? Date.now() - timer.serverNow : 0
  useEffect(() => {
    setSmoothedSkew((prev) => {
      if (!Number.isFinite(rawSkew)) return prev
      // clamp extreme jumps (>1.5s) to previous value
      if (prev && Math.abs(rawSkew - prev) > 1500) {
        return prev
      }
      const alpha = 0.25 // smoothing factor
      return prev ? prev + alpha * (rawSkew - prev) : rawSkew
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSkew, timer?.serverNow])

  const nowAdjusted = now - smoothedSkew

  useEffect(() => {
    if (timer?.status === 'running' && typeof timer.remainingMs === 'number') {
      setSyncBaseline({ remainingMs: timer.remainingMs, syncedAt: Date.now() })
    } else {
      setSyncBaseline({ remainingMs: null, syncedAt: null })
    }
  }, [timer?.remainingMs, timer?.status])

  useEffect(() => {
    if (!timer || timer.status !== 'running' || !timer.deadline) {
      return undefined
    }

    setNow(Date.now())

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 250)

    return () => clearInterval(interval)
  }, [timer])

  const defaultDuration = DURATION_BY_TYPE[timer?.type ?? 'primary'] ?? 0
  const totalMs = timer?.durationMs ?? defaultDuration

  let remainingMs = totalMs
  const hasSyncedRemaining = typeof syncBaseline.remainingMs === 'number' && syncBaseline.syncedAt

  if (!timer) {
    remainingMs = 0
  } else if (timer.status === 'running' && hasSyncedRemaining) {
    const elapsed = nowAdjusted - syncBaseline.syncedAt
    remainingMs = Math.max(0, (syncBaseline.remainingMs ?? totalMs) - elapsed)
  } else if (timer.status === 'running' && timer.deadline) {
    remainingMs = Math.max(0, timer.deadline - nowAdjusted)
  } else if (timer.status === 'paused') {
    remainingMs = Math.max(0, timer.remainingMs ?? totalMs)
  } else if (timer.status === 'idle') {
    remainingMs = Math.max(0, timer.remainingMs ?? totalMs)
  }

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const totalSeconds = Math.max(0, Math.round(totalMs / 1000))

  return {
    remainingSeconds,
    totalSeconds,
    timerType: timer?.type ?? 'primary',
    timerStatus: timer?.status ?? 'idle',
  }
}

export function formatSeconds(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
