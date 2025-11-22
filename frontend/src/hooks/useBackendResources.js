import {
  fetchMatchHistory,
  fetchModerators,
  fetchQuestions,
  fetchTeams,
  fetchTournament,
} from '../api/data'
import useApiData from './useApiData'

export function useTeams() {
  return useApiData(fetchTeams, [])
}

export function useModerators() {
  return useApiData(fetchModerators, [])
}

export function useMatchHistory() {
  return useApiData(fetchMatchHistory, [])
}

export function useTournament() {
  return useApiData(fetchTournament, [])
}

export function useQuestionBank() {
  return useApiData(fetchQuestions, [])
}

export function mergeLoadingStates(...flags) {
  return flags.some(Boolean)
}

export function firstError(...errors) {
  return errors.find(Boolean) || null
}
