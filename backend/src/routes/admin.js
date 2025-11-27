import { Router } from 'express'
import bcrypt from 'bcrypt'
import {
  Moderator,
  ModeratorRegistration,
  Question,
  Team,
  TeamRecord,
  TeamRegistration,
} from '../db/models/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { seedModerators, seedQuestions, seedTeams } from '../seeds/initialData.js'
import { sanitizeTournament } from '../services/tournamentState.js'
import LiveMatch from '../db/models/liveMatch.js'
import Tournament from '../db/models/tournament.js'

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

const normalizeQuestionDoc = (doc) => {
  if (!doc) return null
  const answers = Array.isArray(doc.answers) && doc.answers.length
    ? doc.answers
    : ['A', 'B', 'C', 'D']
        .map((key) => {
          const text = doc[`answer${key}`] || doc[`option${key}`]
          return text ? { key, text } : null
        })
        .filter(Boolean)

  if (!doc.prompt || !doc.correctAnswerKey || answers.length === 0) {
    return null
  }

  return {
    prompt: String(doc.prompt).trim(),
    answers,
    correctAnswerKey: doc.correctAnswerKey,
    category: doc.category || '',
    difficulty: doc.difficulty || '',
    tags: Array.isArray(doc.tags)
      ? doc.tags
      : typeof doc.tags === 'string' && doc.tags.trim()
      ? doc.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    stats: {
      timesAsked: 0,
      correctCount: 0,
      incorrectCount: 0,
      byTeam: [],
    },
    metadata: doc.metadata || {},
  }
}

const parseCsvQuestions = (csvText) => {
  if (!csvText) return []
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows = lines.slice(1)
  const docs = rows
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      const obj = {}
      headers.forEach((header, idx) => {
        obj[header] = cols[idx] ?? ''
      })
      return obj
    })
    .map((raw) => normalizeQuestionDoc(raw))
    .filter(Boolean)
  return docs
}

const ensureTeamRecord = async (teamId) => {
  if (!teamId) return null
  return TeamRecord.findOneAndUpdate(
    { team: teamId },
    {
      $setOnInsert: {
        team: teamId,
        wins: 0,
        losses: 0,
        points: 0,
        eliminated: false,
        initialBye: false,
      },
    },
    { upsert: true, new: true },
  )
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

adminRouter.get('/teams', async (req, res, next) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 })
    res.json({ teams: teams.map(sanitizeTeam) })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/teams/:id', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)

    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    return res.json({ team: sanitizeTeam(team) })
  } catch (error) {
    return next(error)
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

adminRouter.get('/moderators', async (req, res, next) => {
  try {
    const moderators = await Moderator.find().sort({ createdAt: -1 })
    res.json({ moderators: moderators.map(sanitizeModerator) })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/moderators/:id', async (req, res, next) => {
  try {
    const moderator = await Moderator.findById(req.params.id)

    if (!moderator) {
      return res.status(404).json({ message: 'Moderator not found' })
    }

    return res.json({ moderator: sanitizeModerator(moderator) })
  } catch (error) {
    return next(error)
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

adminRouter.post('/questions/import', async (req, res, next) => {
  try {
    let docs = []
    if (Array.isArray(req.body?.questions) && req.body.questions.length) {
      docs = req.body.questions.map((doc) => normalizeQuestionDoc(doc)).filter(Boolean)
    } else if (typeof req.body?.csv === 'string') {
      docs = parseCsvQuestions(req.body.csv)
    }

    if (!docs.length) {
      return res.status(400).json({ message: 'No valid questions provided.' })
    }

    const operations = docs.map((doc) => ({
      updateOne: {
        filter: { prompt: doc.prompt },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }))

    const result = await Question.bulkWrite(operations, { ordered: false })
    res.json({
      message: 'Questions imported',
      matchedCount: result.matchedCount || 0,
      upsertedCount: result.upsertedCount || 0,
    })
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
      await ensureTeamRecord(registration.linkedTeamId)
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
    await ensureTeamRecord(team._id)

    return res.json({
      message: 'Registration approved and team created',
      team: sanitizeTeam(team),
      registration: sanitizeTeamRegistration(registration),
    })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/registrations/teams', async (req, res, next) => {
  try {
    const statusFilter = req.query.status
    const query = statusFilter ? { status: statusFilter } : {}
    const registrations = await TeamRegistration.find(query).sort({ createdAt: -1 })
    return res.json({ registrations: registrations.map(sanitizeTeamRegistration) })
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

adminRouter.get('/registrations/moderators', async (req, res, next) => {
  try {
    const statusFilter = req.query.status
    const query = statusFilter ? { status: statusFilter } : {}
    const registrations = await ModeratorRegistration.find(query).sort({ createdAt: -1 })
    return res.json({ registrations: registrations.map(sanitizeModeratorRegistration) })
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

    // 1️⃣ Find the related registration (if exists)
    const registration = await TeamRegistration.findOne({
      linkedTeamId: team._id,
    })

    if (registration) {
      // 2️⃣ Update metadata before deleting
      registration.status = 'rejected'
      if (!registration.metadata || typeof registration.metadata.set !== 'function') {
        registration.metadata = new Map()
      }
      registration.metadata.set('deletedAt', new Date())
      registration.metadata.set('deletionReason', 'Team account removed by admin')

      await registration.save()

      // 3️⃣ Now delete the registration
      await registration.deleteOne()
    }

    // 4️⃣ Delete the team
    await team.deleteOne()
    await TeamRecord.deleteOne({ team: team._id })

    return res.json({
      message: 'Team and registration deleted',
      team: sanitizeTeam(team),
    })
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

    // 1️⃣ Find the related registration
    const registration = await ModeratorRegistration.findOne({
      linkedModeratorId: moderator._id,
    })

    if (registration) {
      // 2️⃣ Update metadata before deletion
      registration.status = 'rejected'
      if (!registration.metadata || typeof registration.metadata.set !== 'function') {
        registration.metadata = new Map()
      }
      registration.metadata.set('deletedAt', new Date())
      registration.metadata.set('deletionReason', 'Moderator account removed by admin')

      await registration.save()

      // 3️⃣ Now delete the registration
      await registration.deleteOne()
    }

    // 4️⃣ Delete the moderator
    await moderator.deleteOne()

    return res.json({
      message: 'Moderator and registration deleted',
      moderator: sanitizeModerator(moderator),
    })

  } catch (error) {
    return next(error)
  }
})



adminRouter.get('/tournaments', async (_req, res, next) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 })
    res.json({ tournaments: tournaments.map(sanitizeTournament) })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/tournaments/:id', async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' })
    }
    await LiveMatch.deleteMany({ tournamentId: tournament._id.toString() })
    await tournament.deleteOne()
    return res.json({ message: 'Tournament and related live matches deleted', tournament: sanitizeTournament(tournament) })
  } catch (error) {
    next(error)
  }
})

export default adminRouter
