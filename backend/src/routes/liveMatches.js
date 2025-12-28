import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import LiveMatch from '../db/models/liveMatch.js'
import { createLiveMatch, joinMatch } from '../services/liveMatchEngine.js'

const router = Router()

router.use(requireUser)

router.post('/', async (req, res, next) => {
  try {
    const { teamAId, teamBId, moderatorId, tournamentMatchId, tournamentId } = req.body ?? {}
    if (!teamAId || !teamBId || !tournamentMatchId || !tournamentId) {
      return res.status(400).json({ message: 'teamAId, teamBId, tournamentMatchId, and tournamentId are required.' })
    }

    // Idempotent create: if a live match already exists for this bracket match (and not completed), reuse it.
    const existingDoc = await LiveMatch.findOne({
      tournamentId: tournamentId.toString(),
      tournamentMatchId,
      status: { $ne: 'completed' },
    })
    if (existingDoc) {
      const inMemory = joinMatch(existingDoc.matchRefId)
      const payload = inMemory || existingDoc.state
      return res.status(200).json({
        match: {
          ...payload,
          questionResults: payload?.questionResults ?? [],
        },
      })
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

  return res.json({
    match: {
      ...match,
      questionResults: match.questionResults ?? [],
    },
  })
})

export default router
