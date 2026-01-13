import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { Question } from '../db/models/index.js'

const router = Router()

router.use(requireAdmin)

const buildQuestion = (question) => ({
  id: question._id.toString(),
  prompt: question.prompt,
  difficulty: question.difficulty,
  category: question.category,
  tags: question.tags,
  correctAnswerKey: question.correctAnswerKey,
  answers: question.answers,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
})

router.get('/', async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit

    const [questions, total] = await Promise.all([
      Question.find().sort({ updatedAt: -1, _id: -1 }).skip(skip).limit(limit),
      Question.countDocuments(),
    ])

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      questions: questions.map(buildQuestion),
    })
  } catch (error) {
    next(error)
  }
})

// Search (placed before /:id to avoid shadowing)
router.get('/search', async (req, res, next) => {
  try {
    const {
      text = '',
      category,
      difficulty,
      tag,
      sort = 'recent',
      page = 1,
      limit = 20,
    } = req.query

    const filters = {}

    if (text) {
      filters.$or = [
        { prompt: { $regex: text, $options: 'i' } },
        { 'answers.text': { $regex: text, $options: 'i' } },
      ]
    }
    if (category) {
      filters.category = category
    }
    if (difficulty) {
      filters.difficulty = difficulty
    }
    if (tag) {
      filters.tags = tag
    }

    let sortOption = {}
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1, _id: 1 }
        break
      case 'az':
        sortOption = { prompt: 1, _id: 1 }
        break
      case 'za':
        sortOption = { prompt: -1, _id: -1 }
        break
      case 'recent':
      default:
        sortOption = { updatedAt: -1, _id: -1 }
    }

    const pageNumber = Number(page) || 1
    const pageLimit = Number(limit) || 20
    const skip = (pageNumber - 1) * pageLimit
    const [questions, total] = await Promise.all([
      Question.find(filters).sort(sortOption).skip(skip).limit(pageLimit),
      Question.countDocuments(filters),
    ])

    return res.status(200).json({
      filtersApplied: filters,
      sort,
      page: pageNumber,
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
      questions: questions.map(buildQuestion),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const questionId = req.params.id
    if (!questionId) {
      return res.status(400).json({ message: 'Question ID is required' })
    }

    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ message: 'Question not found' })
    }

    return res.status(200).json({ question: buildQuestion(question) })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const questionId = req.params.id
    if (!questionId) {
      return res.status(400).json({ message: 'Please select a valid question' })
    }
    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ message: 'Question not found' })
    }
    const body = req.body ?? {}
    if (body.prompt !== undefined) question.prompt = body.prompt
    if (body.category !== undefined) question.category = body.category
    if (body.difficulty !== undefined) question.difficulty = body.difficulty
    if (body.tags !== undefined) question.tags = body.tags
    if (body.correctAnswerKey !== undefined) question.correctAnswerKey = body.correctAnswerKey

    if (Array.isArray(body.answers)) {
      question.answers = body.answers
    }

    if (body.metadata && typeof body.metadata === 'object') {
      Object.entries(body.metadata).forEach(([key, value]) => {
        question.metadata.set(key, value)
      })
    }

    await question.save()

    return res.json({
      message: 'Question updated successfully',
      question: buildQuestion(question),
    })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const questionId = req.params.id

    if (!questionId) {
      return res.status(400).json({ message: 'Please select a valid question ID' })
    }
    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ message: 'Question not found' })
    }

    await question.deleteOne()
    return res.json({ message: 'Question deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
