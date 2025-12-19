import { Router } from 'express'
import { Moderator, Team, Tournament } from '../db/models/index.js'
import { requireAdmin, requireUser } from '../middleware/auth.js'
import {
  attachLiveMatch,
  detachLiveMatch,
  findMatchForTeams,
  getMatch,
  grantMatchBye,
  initializeTournament,
  listMatchesForStage,
  listStages,
  recordMatchResult,
} from '../services/tournamentEngine.js'
import { sanitizeTournament, persistTournamentState } from '../services/tournamentState.js'

const router = Router()

const mapTeamForEngine = (teamDoc) => ({
  id: teamDoc._id.toString(),
  name: teamDoc.name,
  loginId: teamDoc.loginId,
  region: teamDoc.region,
})

const mapModeratorForEngine = (moderatorDoc) => ({
  id: moderatorDoc._id.toString(),
  name: moderatorDoc.displayName || moderatorDoc.loginId,
})

const canAttachMatch = (state, matchId, user) => {
  if (!user) return false
  if (user.role === 'admin') return true
  const match = state?.matches?.[matchId]
  if (!match) return false
  if (user.role === 'moderator') {
    // allow if this moderator is assigned, or if no moderator is assigned yet
    if (!match.moderatorId) return true
    if (match.moderatorId === user.sub) return true
  }
  return false
}

const loadTournamentOr404 = async (req, res) => {
  const tournament = await Tournament.findById(req.params.id)
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' })
    return null
  }
  if (!tournament.state) {
    res.status(409).json({ message: 'Tournament state not initialized' })
    return null
  }
  return tournament
}

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, teamIds, moderatorIds } = req.body ?? {}
    const requestedTeamIds = Array.isArray(teamIds) ? teamIds : []
    if (requestedTeamIds.length < 2) {
      return res.status(400).json({ message: 'At least two teams are required to create a tournament.' })
    }

    const teamDocs = await Team.find({ _id: { $in: requestedTeamIds } })
    const teamMap = new Map(teamDocs.map((team) => [team._id.toString(), team]))
    const orderedTeams = requestedTeamIds.map((id) => teamMap.get(id)).filter(Boolean)
    if (orderedTeams.length !== requestedTeamIds.length) {
      return res.status(404).json({ message: 'One or more requested teams were not found.' })
    }

    const baseModeratorFilter = { active: true, role: { $ne: 'admin' } }
    const moderatorQuery =
      Array.isArray(moderatorIds) && moderatorIds.length > 0
        ? { ...baseModeratorFilter, _id: { $in: moderatorIds } }
        : baseModeratorFilter
    const moderatorDocs = await Moderator.find(moderatorQuery)
    if (!moderatorDocs.length) {
      return res.status(400).json({ message: 'No moderators available to seed the tournament.' })
    }

    const state = initializeTournament(
      orderedTeams.map(mapTeamForEngine),
      moderatorDocs.map(mapModeratorForEngine),
    )

    const tournament = await Tournament.create({
      name: name || `Tournament ${new Date().toLocaleDateString()}`,
      status: 'upcoming',
      teams: orderedTeams.map((team) => team._id),
      stages: [],
      standings: [],
      settings: {
        bracketSize: orderedTeams.length,
        doubleElimination: true,
      },
      state,
    })

    const sanitized = sanitizeTournament(tournament)
    return res.status(201).json({ tournament: sanitized })
  } catch (error) {
    return next(error)
  }
})

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 })
    return res.json({ tournaments: tournaments.map(sanitizeTournament) })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' })
    }
    return res.json({ tournament: sanitizeTournament(tournament) })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/launch', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null
    const currentState = tournament.state ?? {}
    if (!currentState.launchedAt) {
      const nextState = {
        ...currentState,
        launchedAt: Date.now(),
        status: currentState.status === 'pending' ? 'active' : currentState.status,
      }
      await persistTournamentState(tournament, nextState)
    }
    return res.json({ tournament: sanitizeTournament(tournament) })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/matches/:matchId/result', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null

    const { winnerId, loserId, scores } = req.body ?? {}
    if (!winnerId || !loserId) {
      return res.status(400).json({ message: 'winnerId and loserId are required.' })
    }

    let nextState = recordMatchResult(tournament.state, req.params.matchId, {
      winnerId,
      loserId,
      scores: typeof scores === 'object' && scores ? scores : {},
    })
    nextState = detachLiveMatch(nextState, req.params.matchId)
    await persistTournamentState(tournament, nextState)
    return res.json({ tournament: sanitizeTournament(tournament) })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/matches/:matchId/bye', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null

    const docStatus = tournament.status
    if (docStatus === 'live' || docStatus === 'completed') {
      return res.status(409).json({ message: 'Cannot grant a bye after the tournament has launched.' })
    }

    const { teamId } = req.body ?? {}
    if (!teamId) {
      return res.status(400).json({ message: 'teamId is required to grant a bye.' })
    }

    const nextState = grantMatchBye(tournament.state, req.params.matchId, teamId)
    if (nextState === tournament.state) {
      return res.status(409).json({ message: 'Match not eligible for a bye at this stage (must be pending and unattached).' })
    }
    await persistTournamentState(tournament, nextState)
    return res.json({ tournament: sanitizeTournament(tournament) })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/matches/:matchId/attach', requireUser, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null

    const { liveMatchId } = req.body ?? {}
    if (!liveMatchId) {
      return res.status(400).json({ message: 'liveMatchId is required.' })
    }

    const existingMatchRef = tournament.state?.matches?.[req.params.matchId]?.matchRefId
    if (existingMatchRef && existingMatchRef === liveMatchId) {
      return res.json({ tournament: sanitizeTournament(tournament) })
    }

    if (!canAttachMatch(tournament.state, req.params.matchId, req.user)) {
      return res.status(403).json({ message: 'Insufficient permissions to attach this match.' })
    }

    const nextState = attachLiveMatch(tournament.state, req.params.matchId, liveMatchId)
    await persistTournamentState(tournament, nextState)
    return res.json({ tournament: sanitizeTournament(tournament) })
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/matches/:matchId/detach', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null

    const nextState = detachLiveMatch(tournament.state, req.params.matchId)
    await persistTournamentState(tournament, nextState)
    return res.json({ tournament: sanitizeTournament(tournament) })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id/stages', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null
    const stages = listStages(tournament.state)
    return res.json({ stages })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id/stages/:stageId/matches', requireAdmin, async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null
    const matches = listMatchesForStage(tournament.state, req.params.stageId)
    return res.json({ matches })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id/matches/:matchId', async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null
    const match = getMatch(tournament.state, req.params.matchId)
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }
    return res.json({ match })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id/matches/find', async (req, res, next) => {
  try {
    const tournament = await loadTournamentOr404(req, res)
    if (!tournament) return null
    const { teamA, teamB } = req.query
    if (!teamA || !teamB) {
      return res.status(400).json({ message: 'teamA and teamB query params are required.' })
    }
    const match = findMatchForTeams(tournament.state, teamA, teamB)
    if (!match) {
      return res.status(404).json({ message: 'Match not found for provided teams' })
    }
    return res.json({ match })
  } catch (error) {
    return next(error)
  }
})

export default router
