import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { Question } from '../db/models/index.js'

const router = Router()

router.use(requireAdmin)

const buildQuestionMetrics = (question) => {
  const stats = question.stats ?? {}
  const correctCount = stats.correctCount ?? 0
  const incorrectCount = stats.incorrectCount ?? 0
  const totalAnswered = correctCount + incorrectCount
  const accuracy = totalAnswered ? Math.round((correctCount / totalAnswered) * 1000) / 10 : null

  return {
    id: question._id.toString(),
    prompt: question.prompt,
    category: question.category,
    difficulty: question.difficulty,
    totalAsked: stats.timesAsked ?? 0,
    correctCount,
    incorrectCount,
    totalAnswered,
    accuracy,
    tags: question.tags ?? [],
    lastUsedAt: question.lastUsedAt,
  }
}

router.get('/questions', async (req, res, next) => {
  try {
    const questions = await Question.find().sort({ updatedAt: -1 })
    const metrics = questions.map(buildQuestionMetrics)

    const summary = metrics.reduce(
      (acc, entry) => {
        acc.totalQuestions += 1
        acc.totalAsked += entry.totalAsked
        if (typeof entry.accuracy === 'number') {
          acc.accuracySamples += 1
          acc.accuracySum += entry.accuracy
        }
        const categoryKey = entry.category || 'Uncategorized'
        const category = acc.categories.get(categoryKey) || {
          category: categoryKey,
          questions: 0,
          asked: 0,
        }
        category.questions += 1
        category.asked += entry.totalAsked
        acc.categories.set(categoryKey, category)
        return acc
      },
      {
        totalQuestions: 0,
        totalAsked: 0,
        accuracySum: 0,
        accuracySamples: 0,
        categories: new Map(),
      },
    )

    const averageAccuracy =
      summary.accuracySamples > 0 ? Math.round((summary.accuracySum / summary.accuracySamples) * 10) / 10 : null

    res.json({
      summary: {
        totalQuestions: summary.totalQuestions,
        totalAsked: summary.totalAsked,
        averageAccuracy,
        categories: Array.from(summary.categories.values()),
      },
      questions: metrics,
    })
  } catch (error) {
    next(error)
  }
})

export default router
