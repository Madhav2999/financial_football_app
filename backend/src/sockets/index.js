import jwt from 'jsonwebtoken'
import { constants, security } from '../config/index.js'
import { subscribeToTournamentUpdates } from '../services/tournamentEvents.js'
import {
  liveMatchEmitter,
  joinMatch,
  flipCoin,
  decideFirst,
  submitAnswer,
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

    socket.on('liveMatch:coinToss', ({ matchId, forceWinnerId = null }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = flipCoin(matchId, forceWinnerId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', updated)
      }
    })

    socket.on('liveMatch:decideFirst', ({ matchId, deciderId, firstTeamId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match, deciderId)) return
      const updated = decideFirst(matchId, deciderId, firstTeamId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', updated)
      }
    })

    socket.on('liveMatch:answer', async ({ matchId, teamId, answerKey }) => {
      const match = joinMatch(matchId)
      if (!match || !canAnswer(socket, match, teamId)) return
      const updated = await submitAnswer(matchId, teamId, answerKey)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', updated)
      }
    })

    socket.on('liveMatch:pause', ({ matchId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = pauseMatch(matchId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', updated)
      }
    })

    socket.on('liveMatch:resume', ({ matchId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = resumeMatch(matchId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', updated)
      }
    })

    socket.on('liveMatch:reset', ({ matchId }) => {
      const match = joinMatch(matchId)
      if (!match || !canControlMatch(socket, match)) return
      const updated = resetMatch(matchId)
      if (updated) {
        io.to(`live-match:${matchId}`).emit('liveMatch:update', updated)
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
    io.to(`live-match:${match.id}`).emit('liveMatch:update', match)
  })
}

export default registerSocketHandlers
