import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import { Team, Moderator } from '../db/models/index.js'
import { uploadImage } from '../utils/cloudinary.js'

const router = Router()

router.use(requireUser)

router.post('/avatar', async (req, res, next) => {
  try {
    const { data, filename } = req.body ?? {}
    if (!data) {
      return res.status(400).json({ message: 'No data provided' })
    }
    const url = await uploadImage(data, filename || 'avatar')
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
