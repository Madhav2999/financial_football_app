import { Router } from 'express'
import { Moderator, Team } from '../db/models/index.js'

const publicRouter = Router()

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

publicRouter.get('/teams', async (req, res, next) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 })
    res.json({ teams: teams.map(sanitizeTeam) })
  } catch (error) {
    next(error)
  }
})

publicRouter.get('/moderators', async (req, res, next) => {
  try {
    const moderators = await Moderator.find({ role: { $ne: 'admin' }, active: true }).sort({ createdAt: -1 })
    res.json({ moderators: moderators.map(sanitizeModerator) })
  } catch (error) {
    next(error)
  }
})

export default publicRouter
