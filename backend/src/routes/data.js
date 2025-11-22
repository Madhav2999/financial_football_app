import { Router } from 'express'
import {
  Match,
  Moderator,
  Question,
  Team,
  Tournament,
} from '../db/models/index.js'

const dataRouter = Router()

const sanitizeTeam = (teamDoc) => ({
  id: teamDoc._id.toString(),
  loginId: teamDoc.loginId,
  name: teamDoc.name,
  region: teamDoc.region,
  seed: teamDoc.seed,
  avatarUrl: teamDoc.avatarUrl,
  metadata: teamDoc.metadata ?? {},
})

const sanitizeModerator = (moderatorDoc) => ({
  id: moderatorDoc._id.toString(),
  loginId: moderatorDoc.loginId,
  email: moderatorDoc.email,
  displayName: moderatorDoc.displayName,
  role: moderatorDoc.role,
  permissions: moderatorDoc.permissions,
})

const sanitizeQuestion = (questionDoc) => ({
  id: questionDoc._id.toString(),
  prompt: questionDoc.prompt,
  answer: questionDoc.answer,
  difficulty: questionDoc.difficulty,
  category: questionDoc.category,
})

dataRouter.get('/teams', async (_req, res, next) => {
  try {
    const teams = await Team.find({}).sort({ createdAt: -1 })
    res.json({ teams: teams.map(sanitizeTeam) })
  } catch (error) {
    next(error)
  }
})

dataRouter.get('/teams/:id', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    return res.json({ team: sanitizeTeam(team) })
  } catch (error) {
    return next(error)
  }
})

dataRouter.get('/moderators', async (_req, res, next) => {
  try {
    const moderators = await Moderator.find({}).sort({ createdAt: -1 })
    res.json({ moderators: moderators.map(sanitizeModerator) })
  } catch (error) {
    next(error)
  }
})

dataRouter.get('/matches/history', async (_req, res, next) => {
  try {
    const matches = await Match.find({})
      .populate('homeTeam')
      .populate('awayTeam')
      .populate('tournament')
      .sort({ createdAt: -1 })
      .limit(200)

    const history = matches.map((match) => ({
      id: match._id.toString(),
      matchRefId: match.matchRefId,
      status: match.status,
      scheduledAt: match.scheduledAt,
      tournamentId: match.tournament?._id?.toString() ?? null,
      tournamentName: match.tournament?.name ?? null,
      homeTeam: match.homeTeam ? sanitizeTeam(match.homeTeam) : null,
      awayTeam: match.awayTeam ? sanitizeTeam(match.awayTeam) : null,
      result: match.result ?? null,
      createdAt: match.createdAt,
    }))

    res.json({ history })
  } catch (error) {
    next(error)
  }
})

dataRouter.get('/tournament', async (_req, res, next) => {
  try {
    const tournament = await Tournament.findOne({})
      .populate('teams')
      .populate('stages')
      .sort({ createdAt: -1 })

    if (!tournament) {
      return res.json({ tournament: null })
    }

    res.json({
      tournament: {
        id: tournament._id.toString(),
        name: tournament.name,
        slug: tournament.slug,
        status: tournament.status,
        description: tournament.description,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        teams: (tournament.teams || []).map(sanitizeTeam),
        standings: tournament.standings ?? [],
        settings: tournament.settings ?? {},
      },
    })
  } catch (error) {
    next(error)
  }
})

dataRouter.get('/questions', async (_req, res, next) => {
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 })
    res.json({ questions: questions.map(sanitizeQuestion) })
  } catch (error) {
    next(error)
  }
})

export default dataRouter
