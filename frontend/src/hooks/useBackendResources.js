import {
  fetchMatchHistory,
  fetchModerators,
  fetchQuestions,
  fetchTeams,
  fetchTournament,
} from '../api/data'
import useApiData from './useApiData'

function mergeLoadingStates(...flags) {
  return flags.some(Boolean)
}

function firstError(...errors) {
  return errors.find(Boolean) || null
}

export function useBackendData() {
  const teams = useApiData(fetchTeams, [])
  const moderators = useApiData(fetchModerators, [])
  const history = useApiData(fetchMatchHistory, [])
  const tournament = useApiData(fetchTournament, [])
  const questions = useApiData(fetchQuestions, [])

  const loading = mergeLoadingStates(
    teams.loading,
    moderators.loading,
    history.loading,
    tournament.loading,
    questions.loading,
  )

  const error = firstError(
    teams.error,
    moderators.error,
    history.error,
    tournament.error,
    questions.error,
  )

  const refreshAll = () => {
    teams.refresh()
    moderators.refresh()
    history.refresh()
    tournament.refresh()
    questions.refresh()
  }

  return {
    teams,
    moderators,
    history,
    tournament,
    questions,
    loading,
    error,
    refreshAll,
  }
}

export { mergeLoadingStates, firstError }
