import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import Match from '../db/models/match.js'

const router = Router()

router.use(requireUser)

const sanitizeMatch = (doc) => {
  const homeTeam = doc.homeTeam?.toString?.() ?? null
  const awayTeam = doc.awayTeam?.toString?.() ?? null
  const winnerId = doc.result?.winnerTeam?.toString?.() ?? null
  const metadata = doc.metadata ?? {}
  return {
    id: doc._id.toString(),
    matchRefId: doc.matchRefId ?? null,
    tournamentId: doc.tournament?.toString?.() ?? null,
    tournamentMatchId: doc.metadata?.get?.('tournamentMatchId') ?? null,
    tournamentName: metadata.get?.('tournamentName') ?? metadata.tournamentName ?? null,
    homeTeamName: metadata.get?.('homeTeamName') ?? metadata.homeTeamName ?? null,
    awayTeamName: metadata.get?.('awayTeamName') ?? metadata.awayTeamName ?? null,
    winnerTeamName: metadata.get?.('winnerTeamName') ?? metadata.winnerTeamName ?? null,
    teams: [homeTeam, awayTeam].filter(Boolean),
    scores: {
      ...(homeTeam ? { [homeTeam]: doc.result?.homeScore ?? 0 } : {}),
      ...(awayTeam ? { [awayTeam]: doc.result?.awayScore ?? 0 } : {}),
    },
    winnerId,
    status: doc.status ?? 'completed',
    completedAt: doc.updatedAt,
  }
}

router.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const tournamentId = req.query.tournamentId
    const filter = { status: 'completed' }
    if (tournamentId) {
      filter.tournament = tournamentId
    }
    const matches = await Match.find(filter).sort({ updatedAt: -1 }).limit(limit)
    res.json({ matches: matches.map(sanitizeMatch) })
  } catch (error) {
    next(error)
  }
})

export default router
