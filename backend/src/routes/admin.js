import { Router } from 'express'
import bcrypt from 'bcrypt'
import {
  Moderator,
  ModeratorRegistration,
  Question,
  Team,
  TeamRegistration,
} from '../db/models/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { seedModerators, seedQuestions, seedTeams } from '../seeds/initialData.js'

const adminRouter = Router()

adminRouter.use(requireAdmin)

const sanitizeTeam = (teamDoc) => ({
  id: teamDoc._id.toString(),
  loginId: teamDoc.loginId,
  name: teamDoc.name,
  region: teamDoc.region,
  seed: teamDoc.seed,
  avatarUrl: teamDoc.avatarUrl,
  metadata: teamDoc.metadata,
})

const sanitizeTeamRegistration = (registrationDoc) => ({
  id: registrationDoc._id.toString(),
  loginId: registrationDoc.loginId,
  teamName: registrationDoc.teamName,
  organization: registrationDoc.organization,
  contactName: registrationDoc.contactName,
  contactEmail: registrationDoc.contactEmail,
  county: registrationDoc.county,
  status: registrationDoc.status,
  linkedTeamId: registrationDoc.linkedTeamId,
  createdAt: registrationDoc.createdAt,
})

const sanitizeModerator = (moderatorDoc) => ({
  id: moderatorDoc._id.toString(),
  loginId: moderatorDoc.loginId,
  email: moderatorDoc.email,
  displayName: moderatorDoc.displayName,
  role: moderatorDoc.role,
  permissions: moderatorDoc.permissions,
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

const hashRecordPassword = async (record = {}) => {
  const preparedRecord = { ...record }
  if (preparedRecord.passwordHash) {
    return preparedRecord
  }

  if (!preparedRecord.password) {
    return preparedRecord
  }

  preparedRecord.passwordHash = await bcrypt.hash(preparedRecord.password, 10)
  delete preparedRecord.password
  return preparedRecord
}

const upsertByLoginId = async (Model, payload, uniqueKey = 'loginId') => {
  const records = Array.isArray(payload) && payload.length > 0 ? payload : []
  if (records.length === 0) return { matchedCount: 0, upsertedCount: 0 }

  const recordsWithHash = await Promise.all(records.map((record) => hashRecordPassword(record)))

  const operations = recordsWithHash.map((doc) => ({
    updateOne: {
      filter: { [uniqueKey]: doc[uniqueKey] },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }))

  const result = await Model.bulkWrite(operations, { ordered: false })
  return { matchedCount: result.matchedCount || 0, upsertedCount: result.upsertedCount || 0 }
}

adminRouter.post('/seed/teams', async (req, res, next) => {
  try {
    const records = req.body?.teams ?? seedTeams
    const summary = await upsertByLoginId(Team, records)
    res.json({ message: 'Teams seeded', ...summary })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/seed/moderators', async (req, res, next) => {
  try {
    const records = req.body?.moderators ?? seedModerators
    const summary = await upsertByLoginId(Moderator, records)
    res.json({ message: 'Moderators seeded', ...summary })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/seed/questions', async (req, res, next) => {
  try {
    const questions = Array.isArray(req.body?.questions) && req.body.questions.length > 0 ? req.body.questions : seedQuestions
    const operations = questions.map((doc) => ({
      updateOne: {
        filter: { prompt: doc.prompt },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }))
    const result = await Question.bulkWrite(operations, { ordered: false })
    res.json({ message: 'Questions seeded', matchedCount: result.matchedCount || 0, upsertedCount: result.upsertedCount || 0 })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/registrations/:id/approve', async (req, res, next) => {
  try {
    const registration = await TeamRegistration.findById(req.params.id).select('+passwordHash')

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    if (registration.status === 'approved' && registration.linkedTeamId) {
      return res.json({
        message: 'Registration already approved',
        registration: sanitizeTeamRegistration(registration),
      })
    }

    const existingTeam = await Team.findOne({ loginId: registration.loginId })
    if (existingTeam) {
      return res.status(409).json({ message: 'A team with this loginId already exists.' })
    }

    const team = await Team.create({
      name: registration.teamName,
      loginId: registration.loginId,
      passwordHash: registration.passwordHash,
      metadata: {
        organization: registration.organization,
        contactName: registration.contactName,
        contactEmail: registration.contactEmail,
        county: registration.county,
        sourceRegistrationId: registration._id.toString(),
      },
    })

    registration.status = 'approved'
    registration.linkedTeamId = team._id
    await registration.save()

    return res.json({
      message: 'Registration approved and team created',
      team: sanitizeTeam(team),
      registration: sanitizeTeamRegistration(registration),
    })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/registrations/moderators/:id/approve', async (req, res, next) => {
  try {
    const registration = await ModeratorRegistration.findById(req.params.id).select('+passwordHash')

    if (!registration) {
      return res.status(404).json({ message: 'Moderator registration not found' })
    }

    if (registration.status === 'approved' && registration.linkedModeratorId) {
      return res.json({
        message: 'Registration already approved',
        registration: sanitizeModeratorRegistration(registration),
      })
    }

    const existingModerator = await Moderator.findOne({
      $or: [{ loginId: registration.loginId }, { email: registration.email }],
    })

    if (existingModerator) {
      return res.status(409).json({ message: 'A moderator with this loginId or email already exists.' })
    }

    const moderator = await Moderator.create({
      loginId: registration.loginId,
      email: registration.email,
      passwordHash: registration.passwordHash,
      displayName: registration.displayName,
      permissions: registration.permissions,
    })

    registration.status = 'approved'
    registration.linkedModeratorId = moderator._id
    await registration.save()

    return res.json({
      message: 'Moderator registration approved and account created',
      moderator: sanitizeModerator(moderator),
      registration: sanitizeModeratorRegistration(registration),
    })
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/teams/:id', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)

    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    await TeamRegistration.updateMany(
      { linkedTeamId: team._id },
      {
        $set: {
          status: 'rejected',
          'metadata.deletedAt': new Date(),
          'metadata.deletionReason': 'Team account removed by admin',
        },
        $unset: { linkedTeamId: '' },
      },
    )

    await team.deleteOne()

    return res.json({ message: 'Team deleted', team: sanitizeTeam(team) })
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/moderators/:id', async (req, res, next) => {
  try {
    const moderator = await Moderator.findById(req.params.id)

    if (!moderator) {
      return res.status(404).json({ message: 'Moderator not found' })
    }

    if (moderator.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted via this endpoint' })
    }

    await ModeratorRegistration.updateMany(
      { linkedModeratorId: moderator._id },
      {
        $set: {
          status: 'rejected',
          'metadata.deletedAt': new Date(),
          'metadata.deletionReason': 'Moderator account removed by admin',
        },
        $unset: { linkedModeratorId: '' },
      },
    )

    await moderator.deleteOne()

    return res.json({ message: 'Moderator deleted', moderator: sanitizeModerator(moderator) })
  } catch (error) {
    return next(error)
  }
})

export default adminRouter
