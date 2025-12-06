import { Router } from 'express'
import { accounts, constants } from '../config/index.js'
import adminRouter from './admin.js'
import authRouter from './auth.routes.js'
import publicRouter from './public.js'
import tournamentsRouter from './tournaments.js'
import liveMatchesRouter from './liveMatches.js'
import analyticsRouter from './analytics.js'
import matchesRouter from './matches.js'
import profileRouter from './profile.js'
import allQuestionRouter from './allquestions.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

router.get('/match/settings', (req, res) => {
  res.json(constants.matchSettings)
})

router.get('/accounts/seed', (req, res) => {
  res.json({
    moderators: accounts.moderatorAccounts.map(({ email }) => ({ email })),
    admins: accounts.adminAccounts.map(({ email }) => ({ email })),
  })
})

router.use('/auth', authRouter)
router.use('/admin', adminRouter)
router.use('/public', publicRouter)
router.use('/tournaments', tournamentsRouter)
router.use('/live-matches', liveMatchesRouter)
router.use('/analytics', analyticsRouter)
router.use('/matches', matchesRouter)
router.use('/profile', profileRouter)
router.use('/allquestions',allQuestionRouter)

export default router
