import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireUser } from '../middleware/auth.js'
import { Team, Moderator } from '../db/models/index.js'

const router = Router()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const saveBase64File = (base64Data, filenameHint = 'avatar') => {
  const matches = base64Data.match(/^data:(.+);base64,(.*)$/)
  const buffer = Buffer.from(matches ? matches[2] : base64Data, 'base64')
  const ext =
    matches && matches[1]
      ? matches[1].includes('png')
        ? 'png'
        : matches[1].includes('jpeg') || matches[1].includes('jpg')
        ? 'jpg'
        : 'bin'
      : 'bin'
  const filename = `${filenameHint}-${Date.now()}.${ext}`
  const filepath = path.join(uploadsDir, filename)
  fs.writeFileSync(filepath, buffer)
  return `/uploads/${filename}`
}

router.use(requireUser)

router.post('/avatar', async (req, res, next) => {
  try {
    const { data, filename } = req.body ?? {}
    if (!data) {
      return res.status(400).json({ message: 'No data provided' })
    }
    const url = saveBase64File(data, filename || 'avatar')
    const role = req.user?.role
    let updated = null
    if (role === 'team') {
      updated = await Team.findByIdAndUpdate(
        req.user.sub,
        { avatarUrl: url },
        { new: true },
      )
    } else if (role === 'moderator' || role === 'admin') {
      updated = await Moderator.findByIdAndUpdate(
        req.user.sub,
        { avatarUrl: url },
        { new: true },
      )
    }
    res.json({ url, user: updated })
  } catch (error) {
    next(error)
  }
})

export default router
