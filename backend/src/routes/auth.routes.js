import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Moderator, ModeratorRegistration, Team, TeamRegistration } from '../db/models/index.js'
import { security } from '../config/index.js'
import { addTokenToBlacklist } from '../middleware/auth.js'
import sendEmail from '../utils/email.js'

const authRouter = Router()
const {
  jwt: { secret, expiresIn },
} = security

const signToken = ({ id, loginId, role }) =>
  jwt.sign({ sub: id, loginId, role }, secret, {
    expiresIn,
  })

const signResetToken = ({ id, role }) =>
  jwt.sign({ sub: id, role, purpose: 'password-reset' }, secret, {
    expiresIn: '15m',
  })

const buildResetUrl = (token, role) => {
  const baseUrl = process.env.PASSWORD_RESET_BASE_URL || 'http://localhost:5173/reset-password'
  const roleParam = role ? `&role=${role}` : ''
  return `${baseUrl}?token=${token}${roleParam}`
}

const sanitizeTeam = (teamDoc) => ({
  id: teamDoc._id.toString(),
  loginId: teamDoc.loginId,
  name: teamDoc.name,
  region: teamDoc.region,
  coachContact: teamDoc.coachContact,
  seed: teamDoc.seed,
  avatarUrl: teamDoc.avatarUrl,
  metadata: teamDoc.metadata,
  organization: teamDoc.metadata?.get?.('organization') || teamDoc.metadata?.organization,
  contactName: teamDoc.metadata?.get?.('contactName') || teamDoc.metadata?.contactName,
  contactEmail: teamDoc.metadata?.get?.('contactEmail') || teamDoc.metadata?.contactEmail,
  county: teamDoc.metadata?.get?.('county') || teamDoc.metadata?.county,
})

const sanitizeModerator = (moderatorDoc) => ({
  id: moderatorDoc._id.toString(),
  loginId: moderatorDoc.loginId,
  email: moderatorDoc.email,
  displayName: moderatorDoc.displayName,
  role: moderatorDoc.role,
  permissions: moderatorDoc.permissions,
})

const sanitizeTeamRegistration = (registrationDoc) => ({
  id: registrationDoc._id.toString(),
  loginId: registrationDoc.loginId,
  teamName: registrationDoc.teamName,
  organization: registrationDoc.organization,
  contactName: registrationDoc.contactName,
  contactEmail: registrationDoc.contactEmail,
  coachContact: registrationDoc.coachContact,
  county: registrationDoc.county,
  status: registrationDoc.status,
  linkedTeamId: registrationDoc.linkedTeamId,
  createdAt: registrationDoc.createdAt,
})

const sanitizeModeratorRegistration = (registrationDoc) => ({
  id: registrationDoc._id.toString(),
  loginId: registrationDoc.loginId,
  email: registrationDoc.email,
  displayName: registrationDoc.displayName,
  permissions: registrationDoc.permissions,
  status: registrationDoc.status,
  linkedModeratorId: registrationDoc.linkedModeratorId,
  createdAt: registrationDoc.createdAt,
})

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

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

const extractBearerToken = (headerValue = '') =>
  headerValue.startsWith('Bearer ') ? headerValue.replace('Bearer ', '') : null

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

authRouter.get('/session', async (req, res, next) => {
  if (!req.user?.role || !req.user?.sub) {
    return res.status(401).json({ message: 'Authorization token missing' })
  }

  try {
    const bearerToken = extractBearerToken(req.headers.authorization)

    if (req.user.role === 'team') {
      const team = await Team.findById(req.user.sub)
      if (!team) {
        return res.status(404).json({ message: 'Team not found for this session' })
      }

      return res.json({ token: bearerToken, role: req.user.role, user: sanitizeTeam(team) })
    }

    const moderator = await Moderator.findById(req.user.sub)
    if (!moderator) {
      return res.status(404).json({ message: 'Moderator not found for this session' })
    }

    return res.json({ token: bearerToken, role: req.user.role, user: sanitizeModerator(moderator) })
  } catch (error) {
    return next(error)
  }
})

authRouter.post('/register', async (req, res, next) => {
  const { teamName, organization, contactName, contactEmail, notes, password, loginId, coachContact } = req.body || {}

  const trimmedTeamName = teamName?.trim()
  const trimmedOrganization = organization?.trim()
  const trimmedContactEmail = contactEmail?.trim().toLowerCase()
  const trimmedContactName = contactName?.trim()
  const trimmedCounty = notes?.trim()
  const trimmedPassword = password?.trim()
  const trimmedLoginId = loginId?.trim().toLowerCase() || trimmedContactEmail
  const trimmedCoachContact = coachContact?.trim()

  if (!trimmedTeamName || !trimmedOrganization || !trimmedContactEmail || !trimmedPassword || !trimmedCoachContact) {
    return res
      .status(400)
      .json({ message: 'teamName, organization, contactEmail, coachContact, and password are required for registration' })
  }

  try {
    const duplicate = await TeamRegistration.findOne({
      $or: [
        { teamName: trimmedTeamName, contactEmail: trimmedContactEmail },
        { loginId: trimmedLoginId },
      ],
    })

    if (duplicate) {
      return res
        .status(409)
        .json({ message: 'A registration for this team, contact, or loginId already exists.' })
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 10)
    const registration = await TeamRegistration.create({
      teamName: trimmedTeamName,
      organization: trimmedOrganization,
      loginId: trimmedLoginId,
      passwordHash,
      contactName: trimmedContactName,
      contactEmail: trimmedContactEmail,
      coachContact: trimmedCoachContact,
      county: trimmedCounty,
      metadata: { notes: trimmedCounty },
    })

    return res.status(201).json({ message: 'Registration received', registration: sanitizeTeamRegistration(registration) })
  } catch (error) {
    return next(error)
  }
})

authRouter.post('/register/moderator', async (req, res, next) => {
  const { loginId, email, password, displayName, permissions } = req.body || {}

  const trimmedLoginId = loginId?.trim()
  const trimmedEmail = email?.trim().toLowerCase()
  const trimmedPassword = password?.trim()
  const trimmedDisplayName = displayName?.trim()

  if (!isNonEmptyString(trimmedLoginId) || !isNonEmptyString(trimmedEmail) || !isNonEmptyString(trimmedPassword)) {
    return res.status(400).json({ message: 'loginId, email, and password are required' })
  }

  try {
    const existingModerator = await Moderator.findOne({
      $or: [{ loginId: trimmedLoginId }, { email: trimmedEmail }],
    })

    const existingRegistration = await ModeratorRegistration.findOne({
      $or: [{ loginId: trimmedLoginId }, { email: trimmedEmail }],
    })

    if (existingModerator || existingRegistration) {
      return res.status(409).json({ message: 'A moderator with that loginId or email already exists.' })
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 10)
    const registration = await ModeratorRegistration.create({
      loginId: trimmedLoginId.toLowerCase(),
      email: trimmedEmail,
      passwordHash,
      displayName: trimmedDisplayName,
      permissions: Array.isArray(permissions) ? permissions : undefined,
    })

    return res
      .status(201)
      .json({ message: 'Moderator registration received', registration: sanitizeModeratorRegistration(registration) })
  } catch (error) {
    return next(error)
  }
})

authRouter.post('/forgot-password/team', async (req, res, next) => {
  const { contactEmail } = req.body || {}

  const trimmedContactEmail = contactEmail?.trim().toLowerCase()

  if (!isNonEmptyString(trimmedContactEmail)) {
    return res.status(400).json({ message: 'contactEmail is required' })
  }

  try {
    const team = await Team.findOne({
      $or: [
        { 'metadata.contactEmail': trimmedContactEmail },
        { 'metadata.contactemail': trimmedContactEmail },
      ],
    })

    if (!team) {
      return res.json({
        message: 'If that email is registered, a reset link has been sent.',
      })
    }

    const resetToken = signResetToken({ id: team._id.toString(), role: 'team' })
    const resetUrl = buildResetUrl(resetToken, 'team')

    try {
      await sendEmail({
        to: trimmedContactEmail,
        subject: 'Reset your Financial Football password',
        text: `Reset your password using this link: ${resetUrl}`,
        html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      })
    } catch (err) {
      console.error('Failed to send reset email', err)
    }

    return res.json({
      message: 'If that email is registered, a reset link has been sent.',
      resetUrl,
      user: sanitizeTeam(team),
    })
  } catch (error) {
    return next(error)
  }
})

authRouter.post('/forgot-password/moderator', async (req, res, next) => {
  const { email } = req.body || {}

  const trimmedEmail = email?.trim().toLowerCase()

  if (!isNonEmptyString(trimmedEmail)) {
    return res.status(400).json({ message: 'email is required' })
  }

  try {
    const moderator = await Moderator.findOne({ email: trimmedEmail })

    if (!moderator) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' })
    }

    const resetToken = signResetToken({ id: moderator._id.toString(), role: 'moderator' })
    const resetUrl = buildResetUrl(resetToken, moderator.role)

    try {
      await sendEmail({
        to: trimmedEmail,
        subject: 'Reset your Financial Football password',
        text: `Reset your password using this link: ${resetUrl}`,
        html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      })
    } catch (err) {
      console.error('Failed to send reset email', err)
    }

    return res.json({
      message: 'If that email is registered, a reset link has been sent.',
      resetUrl,
      user: sanitizeModerator(moderator),
    })
  } catch (error) {
    return next(error)
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

authRouter.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {}
  if (!isNonEmptyString(token) || !isNonEmptyString(newPassword)) {
    return res.status(400).json({ message: 'token and newPassword are required' })
  }

  try {
    const payload = jwt.verify(token, secret)
    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' })
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10)

    if (payload.role === 'team') {
      const updated = await Team.findByIdAndUpdate(payload.sub, { passwordHash }, { new: true })
      if (!updated) return res.status(404).json({ message: 'User not found' })
      return res.json({ message: 'Password updated', role: 'team' })
    }

    const updated = await Moderator.findByIdAndUpdate(payload.sub, { passwordHash }, { new: true })
    if (!updated) return res.status(404).json({ message: 'User not found' })
    return res.json({ message: 'Password updated', role: updated.role })
  } catch (error) {
    console.error('Reset token error', error)
    return res.status(400).json({ message: 'Invalid or expired token' })
  }
})

export default authRouter
