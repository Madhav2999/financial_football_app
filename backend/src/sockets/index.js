import jwt from 'jsonwebtoken'
import { constants, security } from '../config/index.js'
import { subscribeToTournamentUpdates } from '../services/tournamentEvents.js'
import {
  liveMatchEmitter,
  joinMatch,
  flipCoin,
  decideFirst,
  submitAnswer,
  TIMER_GRACE_MS,
  pauseMatch,
  resumeMatch,
  resetMatch,
} from '../services/liveMatchEngine.js'

const authenticateSocket = (socket) => {
  const token = socket.handshake.auth?.token
  if (!token) return null
  try {
    return jwt.verify(token, security.jwt.secret)
  } catch {
    return null
  }
}

const canControlMatch = (socket, match, deciderId = null) => {
  const user = socket.data.user
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'moderator') {
    // Allow moderator if assigned, or if no moderator is assigned yet.
    if (!match?.moderatorId || match.moderatorId === user.sub) return true
  }
  if (deciderId && user.role === 'team' && user.sub === deciderId) return true
  return false
}

const canAnswer = (socket, match, teamId) => {
  const user = socket.data.user
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'team' && teamId && user.sub === teamId) return true
  return false
}

const slimMatch = (match) => {
  if (!match) return match
  // Remove heavy fields for lightweight updates
  const rest = { ...match }
  delete rest.questionQueue
  delete rest.history
  return rest
}

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.data.user = authenticateSocket(socket)
    socket.emit('match:settings', constants.matchSettings)

    const unsubscribeTournament = subscribeToTournamentUpdates((payload) => {
      socket.emit('tournament:update', payload)
    })

    socket.on('tournament:subscribe', () => {
      socket.emit('tournament:subscribed', { timestamp: Date.now() })
    })

    socket.on('liveMatch:join', ({ matchId }) => {
      if (!matchId) return
      socket.join(`live-match:${matchId}`)
      const match = joinMatch(matchId)
      if (match) {
        socket.emit('liveMatch:state', match)
      }
    })

    socket.on('liveMatch:leave', ({ matchId }) => {
      if (!matchId) return
      socket.leave(`live-match:${matchId}`)
    })

    socket.on('liveMatch:coinToss', ({ matchId, forceWinnerId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      if (match.coinToss?.status !== 'ready') return

      // Broadcast a short "flipping" phase so UIs animate consistently.
      const flippingState = {
        ...match,
        coinToss: {
          ...match.coinToss,
          status: 'flipping',
          winnerId: null,
          resultFace: null,
          decision: null,
        },
      }
      io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...slimMatch(flippingState), serverNow: Date.now() })

      const updated = flipCoin(matchId, forceWinnerId)
      if (updated) {
        setTimeout(() => {
          io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...slimMatch(updated), serverNow: Date.now() })
        }, 1800)
      }
    })

    socket.on('liveMatch:decideFirst', ({ matchId, deciderId, firstTeamId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match, deciderId)) return
      const updated = decideFirst(matchId, deciderId, firstTeamId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...updated, serverNow: Date.now() })
      }
    })

    socket.on('liveMatch:answer', async ({ matchId, teamId, answerKey, questionInstanceId }, ack) => {
      const respond = (payload) => {
        if (typeof ack === 'function') {
          ack(payload)
        }
      }
      const match = joinMatch(matchId)
      if (!match) {
        respond({ ok: false, reason: 'not-found' })
        return
      }
      if (!canAnswer(socket, match, teamId)) {
        respond({ ok: false, reason: 'unauthorized' })
        return
      }
      if (match.status !== 'in-progress') {
        respond({ ok: false, reason: 'inactive' })
        return
      }
      if (match.activeTeamId !== teamId && !(match.awaitingSteal && match.teams.includes(teamId))) {
        respond({ ok: false, reason: 'not-turn' })
        return
      }
      const currentQuestion = match.questionQueue?.[match.questionIndex]
      if (
        questionInstanceId &&
        currentQuestion?.instanceId &&
        questionInstanceId !== currentQuestion.instanceId
      ) {
        respond({ ok: false, reason: 'stale' })
        return
      }
      if (
        match.timer?.status === 'running' &&
        match.timer?.deadline &&
        Date.now() > match.timer.deadline + TIMER_GRACE_MS
      ) {
        respond({ ok: false, reason: 'late' })
        return
      }
      const updated = await submitAnswer(matchId, teamId, answerKey, questionInstanceId)
      if (updated) {
        respond({ ok: true })
        io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...slimMatch(updated), serverNow: Date.now() })
        return
      }
      const current = joinMatch(matchId)
      const isLate =
        current?.timer?.status === 'running' &&
        current?.timer?.deadline &&
        Date.now() > current.timer.deadline + TIMER_GRACE_MS
      respond({ ok: false, reason: isLate ? 'late' : 'rejected' })
    })

    socket.on('liveMatch:pause', ({ matchId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = pauseMatch(matchId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...slimMatch(updated), serverNow: Date.now() })
      }
    })

    socket.on('liveMatch:resume', ({ matchId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = resumeMatch(matchId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...slimMatch(updated), serverNow: Date.now() })
      }
    })

    socket.on('liveMatch:reset', async ({ matchId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = await resetMatch(matchId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', { ...updated, serverNow: Date.now() })
      }
    })

    socket.on('chat:message', (payload) => {
      const message = {
        ...payload,
        receivedAt: new Date().toISOString(),
      }
      socket.broadcast.emit('chat:message', message)
    })

    socket.on('disconnect', () => {
      unsubscribeTournament()
    })
  })

  liveMatchEmitter.on('update', (match) => {
    if (!match) return
    io.to(`live-match:${match.id}`).emit('liveMatch:update', {
      ...slimMatch(match),
      questionResults: match.questionResults ?? [],
      serverNow: Date.now(),
    })
  })
}

export default registerSocketHandlers
