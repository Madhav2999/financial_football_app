const defaultOrigins = ['http://localhost:5173']

const security = {
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-financial-football-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-financial-football-refresh',
    expiresIn: process.env.JWT_EXPIRATION || '1h',
  },
  publicRoutes: [
    '/health',
    '/api/health',
    '/auth/login',
    '/api/auth/login',
    '/auth/team',
    '/auth/moderator',
    '/auth/admin',
    '/auth/register',
    '/auth/register/moderator',
    '/auth/forgot-password/team',
    '/auth/forgot-password/moderator',
    '/auth/logout',
    '/api/auth/team',
    '/api/auth/moderator',
    '/api/auth/admin',
    '/api/auth/register',
    '/api/auth/register/moderator',
    '/api/auth/forgot-password/team',
    '/api/auth/forgot-password/moderator',
    '/api/auth/logout',
  ],
  allowedOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : defaultOrigins,
}

export default security
