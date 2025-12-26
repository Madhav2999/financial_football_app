import { Router } from 'express'
import { LiveMatch, Moderator, Team, TeamRecord, Tournament } from '../db/models/index.js'
import { subscribeToTournamentUpdates } from '../services/tournamentEvents.js'
import { sanitizeTournament } from '../services/tournamentState.js'
import { joinMatch } from '../services/liveMatchEngine.js'

const publicRouter = Router()

// const publicLimiter = rateLimit({ windowMs: 60_000, max: 120 }); // 120 req/min/IP
// publicRouter.use(publicLimiter);

const sanitizePublicMatch = (match) => {
  if(!match) return null

  const {questionQueue, history,...rest} = match
  return {
    ...rest,
    id:match.id || match._id?.toString(),
    scores:match.scores || {},
    coinToss: match.coinToss || {},
    status: match.status,
    teams: match.teams || [],
    label: match.label,
    tournamentMatchId: match.tournamentMatchId,
    moderatorId: match.moderatorId
  }
}

const sanitizeTeam = (teamDoc, record = null) => {
  const recordData = record ?? {}
  const points = Number.isFinite(recordData.points) ? recordData.points : 0
  return {
    id: teamDoc._id.toString(),
    loginId: teamDoc.loginId,
    name: teamDoc.name,
    region: teamDoc.region,
    seed: teamDoc.seed,
    avatarUrl: teamDoc.avatarUrl,
    metadata: teamDoc.metadata,
    wins: Number.isFinite(recordData.wins) ? recordData.wins : 0,
    losses: Number.isFinite(recordData.losses) ? recordData.losses : 0,
    totalScore: points,
    points,
    eliminated: Boolean(recordData.eliminated),
    initialBye: Boolean(recordData.initialBye),
  }
}

const sanitizeModerator = (moderatorDoc) => ({
  id: moderatorDoc._id.toString(),
  loginId: moderatorDoc.loginId,
  email: moderatorDoc.email,
  displayName: moderatorDoc.displayName,
  role: moderatorDoc.role,
  permissions: moderatorDoc.permissions,
})

publicRouter.get('/teams', async (req, res, next) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 })
    const teamIds = teams.map((team) => team._id)
    const records = teamIds.length
      ? await TeamRecord.find({ team: { $in: teamIds } }).lean()
      : []
    const recordMap = new Map(records.map((record) => [record.team.toString(), record]))
    res.json({
      teams: teams.map((team) => sanitizeTeam(team, recordMap.get(team._id.toString()))),
    })
  } catch (error) {
    next(error)
  }
})

publicRouter.get('/moderators', async (req, res, next) => {
  try {
    const moderators = await Moderator.find({ role: { $ne: 'admin' }, active: true }).sort({ createdAt: -1 })
    res.json({ moderators: moderators.map(sanitizeModerator) })
  } catch (error) {
    next(error)
  }
})

publicRouter.get('/tournaments', async (req, res, next) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 })
    return res.json({ tournaments: tournaments.map(sanitizeTournament) })
  } catch (error) {
    return next(error)
  }
})

publicRouter.get('/tournaments/stream', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  if (res.flushHeaders) {
    res.flushHeaders()
  }

  try {
    const latest = await Tournament.findOne().sort({ createdAt: -1 })
    if (latest) {
      res.write(`data: ${JSON.stringify(sanitizeTournament(latest))}\n\n`)
    }
  } catch (error) {
    console.error('Failed to send initial tournament snapshot', error)
  }

  const unsubscribe = subscribeToTournamentUpdates((payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  })
  res.on('close', () => {
    unsubscribe()
    res.end()
  })
})

publicRouter.get('/tournaments/:id', async (req, res, next) => {
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

publicRouter.get('/live-matches/:id',async(req,res,next)=>{
    try {
      const inMemory = joinMatch(req.params.id)
      if(inMemory){
        return res.json({match: sanitizePublicMatch(inMemory)})
      }
      const doc = await LiveMatch.findById(req.params.id).lean()
      if(!doc){
        return res.status(404).json({message:'Live match not found'})
      }
      return res.json({match: sanitizePublicMatch(match)})      
    } catch (error) {
      return next(error)
    }
})

export default publicRouter
