import { moderatorAccounts } from '../data/moderators'
import {
  PRIMARY_QUESTION_DURATION_MS,
  STEAL_QUESTION_DURATION_MS,
} from '../constants/matchSettings'

export const QUESTIONS_PER_TEAM = 10
export const TOURNAMENT_TEAM_LIMIT = Number.POSITIVE_INFINITY
export const MIN_TOURNAMENT_TEAM_COUNT = 2

export const ADMIN_CREDENTIALS = { loginId: 'admin', password: 'moderator' }

export const SUPER_ADMIN_PROFILE = {
  name: 'SUNCOAST ADMIN',
  email: 'admin@financialfootball.com',
  phone: '+1 (555) 013-3700',
}

export const MODERATOR_ACCOUNTS = moderatorAccounts

export const TIMER_DURATIONS = {
  primary: PRIMARY_QUESTION_DURATION_MS,
  steal: STEAL_QUESTION_DURATION_MS,
}
