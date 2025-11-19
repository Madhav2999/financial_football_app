import jwt from 'jsonwebtoken'
import { security } from '../config/index.js'

const { jwt: jwtConfig, publicRoutes } = security

const authMiddleware = (req, res, next) => {
  const isPublicRoute = publicRoutes.some((route) => req.path.startsWith(route))

  if (isPublicRoute) {
    return next()
  }

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' })
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    req.user = jwt.verify(token, jwtConfig.secret)
  } catch (error) {
    console.error('JWT verification failed', error)
    return res.status(401).json({ message: 'Invalid or expired token' })
  }

  return next()
}

export default authMiddleware
