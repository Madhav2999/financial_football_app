import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Moderator, Team } from '../db/models/index.js'
import { security } from '../config/index.js'
import { addTokenToBlacklist } from '../middleware/auth.js'

const authRouter = Router()
const {
  jwt: { secret, expiresIn },
} = security

const signToken = ({ id, loginId, role }) =>
  jwt.sign({ sub: id, loginId, role }, secret, {
    expiresIn,
  })

const sanitizeTeam = (teamDoc) => ({
  id: teamDoc._id.toString(),
  loginId: teamDoc.loginId,
  name: teamDoc.name,
  region: teamDoc.region,
  seed: teamDoc.seed,
  avatarUrl: teamDoc.avatarUrl,
  metadata: teamDoc.metadata,
})

const sanitizeModerator = (moderatorDoc) => ({
  id: moderatorDoc._id.toString(),
  loginId: moderatorDoc.loginId,
  email: moderatorDoc.email,
  displayName: moderatorDoc.displayName,
  role: moderatorDoc.role,
  permissions: moderatorDoc.permissions,
})

const validateCredentials = (req, res) => {
  const { loginId, password } = req.body || {}
  if (!loginId || !password) {
    res.status(400).json({ message: 'loginId and password are required' })
    return null
  }
  return { loginId, password }
}

const comparePassword = async (providedPassword, storedHash) =>
  bcrypt.compare(providedPassword, storedHash)

authRouter.post('/team', async (req, res, next) => {
  const credentials = validateCredentials(req, res)
  if (!credentials) return

  try {
    const team = await Team.findOne({ loginId: credentials.loginId }).select('+passwordHash')
    if (!team) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isValidPassword = await comparePassword(credentials.password, team.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken({ id: team._id.toString(), loginId: team.loginId, role: 'team' })
    res.json({ token, user: sanitizeTeam(team) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/moderator', async (req, res, next) => {
  const credentials = validateCredentials(req, res)
  if (!credentials) return

  try {
    const moderator = await Moderator.findOne({ loginId: credentials.loginId, role: 'moderator', active: true }).select(
      '+passwordHash'
    )
    if (!moderator) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isValidPassword = await comparePassword(credentials.password, moderator.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken({ id: moderator._id.toString(), loginId: moderator.loginId, role: 'moderator' })
    res.json({ token, user: sanitizeModerator(moderator) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/admin', async (req, res, next) => {
  const credentials = validateCredentials(req, res)
  if (!credentials) return

  try {
    const admin = await Moderator.findOne({ loginId: credentials.loginId, role: 'admin', active: true }).select(
      '+passwordHash'
    )
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isValidPassword = await comparePassword(credentials.password, admin.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken({ id: admin._id.toString(), loginId: admin.loginId, role: 'admin' })
    res.json({ token, user: sanitizeModerator(admin) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(400).json({ message: 'No token provided' })
  }

  const token = authHeader.replace('Bearer ', '')
  addTokenToBlacklist(token)
  return res.json({ message: 'Logged out. Please delete any stored tokens.' })
})

export default authRouter
