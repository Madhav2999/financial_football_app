import bcrypt from 'bcrypt'
import { accounts } from '../config/index.js'
import { Moderator } from '../db/models/index.js'

const normalizeLoginId = (loginId, email) => {
  if (loginId?.trim()) return loginId.trim().toLowerCase()
  const [localPart] = (email || '').split('@')
  return localPart ? localPart.toLowerCase() : undefined
}

const ensureAdminAccount = async () => {
  const [adminSeed] = accounts.adminAccounts || []
  if (!adminSeed?.email || !adminSeed?.password) return null

  const email = adminSeed.email.toLowerCase()
  const loginId = normalizeLoginId(adminSeed.loginId, email)

  const existingAdmin = await Moderator.findOne({
    role: 'admin',
    $or: [{ loginId }, { email }],
  })

  if (existingAdmin) return existingAdmin

  const passwordHash = await bcrypt.hash(adminSeed.password, 10)

  return Moderator.create({
    loginId,
    email,
    passwordHash,
    displayName: adminSeed.displayName || 'Administrator',
    role: 'admin',
    permissions: ['manage:all'],
  })
}

export default ensureAdminAccount
export { ensureAdminAccount }
