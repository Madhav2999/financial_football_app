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
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [syncBaseline, setSyncBaseline] = useState({ remainingMs: null, syncedAt: null })

  useEffect(() => {
    if (typeof timer?.serverNow === 'number') {
      setServerOffsetMs(timer.serverNow - Date.now())
    } else {
      setServerOffsetMs(0)
    }
  }, [timer?.serverNow])

  useEffect(() => {
    if (timer?.status === 'running') {
      const baseNow = typeof timer?.serverNow === 'number' ? timer.serverNow : Date.now() + serverOffsetMs
      const remainingMs =
        typeof timer.remainingMs === 'number'
          ? timer.remainingMs
          : timer.deadline
            ? Math.max(0, timer.deadline - baseNow)
            : null
      if (typeof remainingMs === 'number') {
        setSyncBaseline({ remainingMs, syncedAt: baseNow })
        return
      }
    }
    setSyncBaseline({ remainingMs: null, syncedAt: null })
  }, [timer?.remainingMs, timer?.status, timer?.deadline, timer?.startedAt, timer?.serverNow, serverOffsetMs])

  useEffect(() => {
    if (!timer || timer.status !== 'running') {
      return undefined
    }

    setNow(Date.now() + serverOffsetMs)

    const interval = setInterval(() => {
      setNow(Date.now() + serverOffsetMs)
    }, 250)

    return () => clearInterval(interval)
  }, [timer, serverOffsetMs])

  const defaultDuration = DURATION_BY_TYPE[timer?.type ?? 'primary'] ?? 0
  const totalMs = timer?.durationMs ?? defaultDuration

  let remainingMs = totalMs
  const hasSyncedRemaining = typeof syncBaseline.remainingMs === 'number' && syncBaseline.syncedAt

  if (!timer) {
    remainingMs = 0
  } else if (timer.status === 'running' && hasSyncedRemaining) {
    const elapsed = now - syncBaseline.syncedAt
    remainingMs = Math.max(0, (syncBaseline.remainingMs ?? totalMs) - elapsed)
  } else if (timer.status === 'running' && timer.deadline) {
    remainingMs = Math.max(0, timer.deadline - now)
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
