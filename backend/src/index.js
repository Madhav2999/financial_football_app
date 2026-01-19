import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import hpp from 'hpp'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import { database, security } from './config/index.js'
import authMiddleware from './middleware/auth.js'
import apiRouter from './routes/index.js'
import { ensureAdminAccount } from './seeds/bootstrapAdmin.js'
import registerSocketHandlers from './sockets/index.js'
import { initializeLiveMatches } from './services/liveMatchEngine.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', 'uploads')

app.set('trust proxy', true)

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.use((req, _res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body)
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params)
  }
  if (req.query) {
    mongoSanitize.sanitize(req.query)
  }
  next()
})
app.use(hpp())
app.use(cors({ origin: security.allowedOrigins, credentials: true }))
app.use('/uploads', express.static(uploadsDir))
app.use(authMiddleware)
// const apiLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   limit: 300,
//   standardHeaders: true,
//   legacyHeaders: false,
// })
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 20,
//   standardHeaders: true,
//   legacyHeaders: false,
// })
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
})
// app.use('/api/auth', authLimiter)
app.use('/api/public', publicLimiter)
// app.use('/api', apiLimiter)
app.use('/api', apiRouter)

app.use((err, req, res, _next) => {
  const status = err.statusCode || 500
  res.status(status).json({ message: err.message || 'Unexpected error' })
})

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: security.allowedOrigins, credentials: true },
  pingInterval: 25000,
  pingTimeout: 60000,
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
