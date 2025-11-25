import Tournament from '../db/models/tournament.js'
import Question from '../db/models/question.js'
import { publishTournamentUpdate } from './tournamentEvents.js'

const sanitizeTournament = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  status: doc.status,
  teams: doc.teams?.map((teamId) => teamId.toString()) ?? [],
  settings: doc.settings ?? {},
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  state: doc.state ?? null,
})

const syncTournamentStatus = (tournamentDoc, state) => {
  if (!state) return
  if (state.status === 'completed') {
    tournamentDoc.status = 'completed'
  } else if (state.status === 'active') {
    tournamentDoc.status = 'live'
  } else {
    tournamentDoc.status = 'upcoming'
  }
}

const persistTournamentState = async (tournamentDoc, nextState) => {
  tournamentDoc.state = nextState
  tournamentDoc.markModified('state')
  syncTournamentStatus(tournamentDoc, nextState)
  await tournamentDoc.save()
  if (nextState.status === 'completed') {
    try {
      await Question.updateMany(
        { 'metadata.currentTournamentId': tournamentDoc._id.toString() },
        { $unset: { 'metadata.currentTournamentId': '' } },
      )
    } catch (error) {
      console.error('Failed to reset question tournament flags', error)
    }
  }
  publishTournamentUpdate(sanitizeTournament(tournamentDoc))
  return tournamentDoc
}

const loadTournamentById = async (id) => {
  if (!id) return null
  return Tournament.findById(id)
}

export { sanitizeTournament, syncTournamentStatus, persistTournamentState, loadTournamentById }
