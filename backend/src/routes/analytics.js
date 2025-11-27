import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { Question } from '../db/models/index.js'
import Tournament from '../db/models/tournament.js'

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

// Historical question accuracy per tournament (using snapshots stored on completion)
router.get('/questions/history', async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({ 'state.questionStats.questions': { $exists: true, $ne: [] } })
      .select(['name', 'state.status', 'state.questionStats'])
      .sort({ createdAt: -1 })

    const history = []
    tournaments.forEach((tournamentDoc) => {
      const tournamentId = tournamentDoc._id.toString()
      const tournamentName = tournamentDoc.name
      const questions = tournamentDoc.state?.questionStats?.questions ?? []
      questions.forEach((entry) => {
        history.push({
          tournamentId,
          tournamentName,
          questionId: entry.id || entry._id?.toString?.(),
          prompt: entry.prompt,
          category: entry.category,
          totalAsked: entry.totalAsked ?? 0,
          correctCount: entry.correctCount ?? 0,
          incorrectCount: entry.incorrectCount ?? 0,
          accuracy:
            entry.totalAnswered != null
              ? entry.totalAnswered
                ? Math.round((entry.correctCount / entry.totalAnswered) * 1000) / 10
                : null
              : entry.accuracy ?? null,
        })
      })
    })

    res.json({ history })
  } catch (error) {
    next(error)
  }
})

export default router
