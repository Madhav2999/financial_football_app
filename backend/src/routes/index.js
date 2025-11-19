import { Router } from 'express'
import { accounts, constants } from '../config/index.js'

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

export default router
