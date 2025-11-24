import { EventEmitter } from 'events'

const tournamentEmitter = new EventEmitter()

export const publishTournamentUpdate = (payload) => {
  tournamentEmitter.emit('update', payload)
}

export const subscribeToTournamentUpdates = (listener) => {
  tournamentEmitter.on('update', listener)
  return () => {
    tournamentEmitter.off('update', listener)
  }
}

export default tournamentEmitter
