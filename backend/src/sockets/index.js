import { constants } from '../config/index.js'

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.emit('match:settings', constants.matchSettings)

    socket.on('chat:message', (payload) => {
      const message = {
        ...payload,
        receivedAt: new Date().toISOString(),
      }

      socket.broadcast.emit('chat:message', message)
    })

    socket.on('disconnect', () => {
      // placeholder for cleanup hooks
    })
  })
}

export default registerSocketHandlers
