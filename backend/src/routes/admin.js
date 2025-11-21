import { Router } from 'express'
import bcrypt from 'bcrypt'
import { Moderator, Question, Team } from '../db/models/index.js'
import { seedModerators, seedQuestions, seedTeams } from '../seeds/initialData.js'

const adminRouter = Router()

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

export default adminRouter
