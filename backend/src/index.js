import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { Server as SocketIOServer } from 'socket.io'
import { database, security } from './config/index.js'
import authMiddleware from './middleware/auth.js'
import apiRouter from './routes/index.js'
import { ensureAdminAccount } from './seeds/bootstrapAdmin.js'
import registerSocketHandlers from './sockets/index.js'
import { initializeLiveMatches } from './services/liveMatchEngine.js'

const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: security.allowedOrigins, credentials: true }))
app.use(authMiddleware)
app.use('/api', apiRouter)

app.use((err, req, res, _next) => {
  const status = err.statusCode || 500
  res.status(status).json({ message: err.message || 'Unexpected error' })
})

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: security.allowedOrigins, credentials: true },
})

registerSocketHandlers(io)

const PORT = Number(process.env.PORT || 4000)

const start = async () => {
  try {
    await mongoose.connect(database.uri, database.options)
    console.log(`MongoDB connected: ${mongoose.connection.host}`)

    await ensureAdminAccount()
    await initializeLiveMatches()

    server.listen(PORT, () => {
      console.log(`HTTP and WebSocket server ready on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start backend server', error)
    process.exit(1)
  }
}

start()

export { app, io }
