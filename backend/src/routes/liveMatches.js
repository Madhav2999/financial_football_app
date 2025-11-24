import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import { createLiveMatch, joinMatch } from '../services/liveMatchEngine.js'

const router = Router()

router.use(requireUser)

router.post('/', async (req, res, next) => {
  try {
    const { teamAId, teamBId, moderatorId, tournamentMatchId, tournamentId } = req.body ?? {}
    if (!teamAId || !teamBId || !tournamentMatchId || !tournamentId) {
      return res.status(400).json({ message: 'teamAId, teamBId, tournamentMatchId, and tournamentId are required.' })
    }
    const match = await createLiveMatch({
      teamAId,
      teamBId,
      moderatorId,
      tournamentMatchId,
      tournamentId,
    })
    return res.status(201).json({ match })
  } catch (error) {
    return next(error)
  }
})

router.get('/:matchId', (req, res) => {
  const match = joinMatch(req.params.matchId)
  if (!match) {
    return res.status(404).json({ message: 'Live match not found' })
  }

  const user = req.user
  const isAdmin = user?.role === 'admin'
  const isModerator = user?.role === 'moderator' && match.moderatorId === user.sub
  const isTeam = user?.role === 'team' && match.teams?.includes(user.sub)
  if (!isAdmin && !isModerator && !isTeam) {
    return res.status(403).json({ message: 'Not authorized to view this live match' })
  }

  return res.json({ match })
})

export default router
