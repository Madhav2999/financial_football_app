import { Router } from 'express'
import { accounts, constants } from '../config/index.js'
import adminRouter from './admin.js'
import authRouter from './auth.routes.js'
import dataRouter from './data.js'

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
router.use('/data', dataRouter)

export default router
