import jwt from 'jsonwebtoken'
import { security } from '../config/index.js'

const { jwt: jwtConfig, publicRoutes } = security
const tokenBlacklist = new Set()

const isPublicRoute = (path = '') => publicRoutes.some((route) => path.startsWith(route))

const refreshSessionContext = (req, payload) => {
  req.user = payload
  req.session = {
    userId: payload.sub,
    role: payload.role,
    loginId: payload.loginId,
  }
}

const isTokenBlacklisted = (token) => tokenBlacklist.has(token)

const addTokenToBlacklist = (token) => {
  tokenBlacklist.add(token)
  const decoded = jwt.decode(token)
  if (decoded?.exp) {
    const ttl = decoded.exp * 1000 - Date.now()
    if (ttl > 0) {
      setTimeout(() => tokenBlacklist.delete(token), ttl)
    }
  }
}

const authenticateRequest = (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token missing' })
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  if (isTokenBlacklisted(token)) {
    res.status(401).json({ message: 'Session has been terminated' })
    return null
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret)
    refreshSessionContext(req, payload)
    return payload
  } catch (error) {
    console.error('JWT verification failed', error)
    res.status(401).json({ message: 'Invalid or expired token' })
    return null
  }
}

const authMiddleware = (req, res, next) => {
  if (isPublicRoute(req.path)) {
    return next()
  }

  const payload = authenticateRequest(req, res)
  if (!payload) return null

  return next()
}

const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    const payload = authenticateRequest(req, res)
    if (!payload) return null
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' })
  }

  refreshSessionContext(req, req.user)
  return next()
}

const requireTeam = requireRole(['team'])
const requireModerator = requireRole(['moderator', 'admin'])
const requireAdmin = requireRole(['admin'])
const requireUser = requireRole(['team', 'moderator', 'admin'])

export default authMiddleware
export { requireTeam, requireModerator, requireAdmin, requireUser, addTokenToBlacklist, isTokenBlacklisted }
