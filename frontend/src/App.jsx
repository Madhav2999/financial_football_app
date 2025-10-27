import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import LandingPage from './components/LandingPage'
import ModeratorDashboard from './components/ModeratorDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { initialTeams } from './data/teams'
import { questionBank } from './data/questions'
import { moderatorAccounts } from './data/moderators'
import TeamDashboard from './components/TeamDashboard'
import { initializeTournament, recordMatchResult, attachLiveMatch, detachLiveMatch } from './tournament/engine'
import AuthModal from './components/AuthModal'
import {
  PRIMARY_QUESTION_DURATION_MS,
  PRIMARY_QUESTION_POINTS,
  STEAL_QUESTION_DURATION_MS,
  STEAL_QUESTION_POINTS,
} from './constants/matchSettings'

const QUESTIONS_PER_TEAM = 1
const TOURNAMENT_TEAM_LIMIT = 12
const DEFAULT_ADMIN_ACCOUNTS = [
  { id: 'admin-1', name: 'Tournament Admin', loginId: 'admin', password: 'moderator' },
]
const SUPER_ADMIN_PROFILE = {
  name: 'Jordan Maxwell',
  email: 'super@financialfootball.com',
  phone: '+1 (555) 013-3700',
}
const DEFAULT_MODERATOR_ACCOUNTS = moderatorAccounts

function buildInitialTeams() {
  return initialTeams.map((team) => ({
    ...team,
    wins: 0,
    losses: 0,
    totalScore: 0,
    eliminated: false,
  }))
}

const INITIAL_TEAM_STATE = buildInitialTeams()

function buildDefaultTeamSelection(teams, limit = TOURNAMENT_TEAM_LIMIT) {
  const roster = Array.isArray(teams) ? teams : []
  const requiredCount = Math.min(limit, roster.length)
  return roster.slice(0, requiredCount).map((team) => team.id)
}

function createSelectionKey(ids) {
  if (!ids?.length) return ''
  return [...ids].sort().join('|')
}

function shuffleArray(array) {
  const items = [...array]
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
  }
  return items
}

const TIMER_DURATIONS = {
  primary: PRIMARY_QUESTION_DURATION_MS,
  steal: STEAL_QUESTION_DURATION_MS,
}

function createRunningTimer(type = 'primary', remainingOverride = null) {
  const duration = TIMER_DURATIONS[type] ?? TIMER_DURATIONS.primary
  const remainingMs = remainingOverride ?? duration
  const now = Date.now()

  return {
    type,
    status: 'running',
    durationMs: duration,
    remainingMs,
    startedAt: now,
    deadline: now + remainingMs,
  }
}

function pauseTimer(timer) {
  if (!timer || timer.status !== 'running') {
    return timer ?? null
  }

  const now = Date.now()
  const remainingMs = Math.max(0, (timer.deadline ?? now) - now)

  return {
    ...timer,
    status: 'paused',
    remainingMs,
    deadline: null,
  }
}

function resumeTimer(timer) {
  if (!timer || timer.status !== 'paused') {
    return timer ?? null
  }

  const remainingMs = Math.max(0, timer.remainingMs ?? timer.durationMs ?? 0)
  const now = Date.now()

  return {
    ...timer,
    status: 'running',
    startedAt: now,
    deadline: now + remainingMs,
    remainingMs,
  }
}

function buildOptions(question) {
  const distractorPool = questionBank.filter((item) => item.id !== question.id).map((item) => item.answer)
  const distractors = []

  while (distractors.length < 3 && distractorPool.length) {
    const index = Math.floor(Math.random() * distractorPool.length)
    const [choice] = distractorPool.splice(index, 1)

    if (!distractors.includes(choice) && choice !== question.answer) {
      distractors.push(choice)
    }
  }

  const fallbackChoices = ['None of the above', 'All of the above', 'Insufficient information']
  let fallbackIndex = 0
  while (distractors.length < 3) {
    const fallback = fallbackChoices[fallbackIndex % fallbackChoices.length]
    if (!distractors.includes(fallback) && fallback !== question.answer) {
      distractors.push(fallback)
    }
    fallbackIndex += 1
  }

  return shuffleArray([question.answer, ...distractors])
}

function drawQuestions(count) {
  const pool = [...questionBank]
  const selected = []

  while (selected.length < count) {
    if (!pool.length) {
      pool.push(...questionBank)
    }
    const index = Math.floor(Math.random() * pool.length)
    selected.push(pool.splice(index, 1)[0])
  }

  const timestamp = Date.now()
  return selected.map((question, index) => ({
    ...question,
    instanceId: `${question.id}-${timestamp}-${index}`,
    options: buildOptions(question),
  }))
}

function buildQuestionOrder(firstTeamId, teams, questionsPerTeam) {
  const [teamAId, teamBId] = teams
  const counts = {
    [teamAId]: 0,
    [teamBId]: 0,
  }
  const order = []
  let current = firstTeamId

  while (order.length < questionsPerTeam * 2) {
    if (counts[current] >= questionsPerTeam) {
      current = current === teamAId ? teamBId : teamAId
      continue
    }

    order.push(current)
    counts[current] += 1
    current = current === teamAId ? teamBId : teamAId
  }

  return order
}

function advanceMatchState(match, scores) {
  const nextIndex = match.questionIndex + 1
  const base = {
    ...match,
    scores,
    questionIndex: nextIndex,
    awaitingSteal: false,
    timer: null,
  }

  if (nextIndex >= match.questionQueue.length) {
    return {
      completed: true,
      match: {
        ...base,
        status: 'completed',
        activeTeamId: null,
      },
    }
  }

  return {
    completed: false,
    match: {
      ...base,
      status: 'in-progress',
      activeTeamId: match.assignedTeamOrder[nextIndex],
      timer: createRunningTimer('primary'),

    },
    tournamentMatchId,
    moderatorId,
  }
}

function applyAnswerResult(match, teamId, isCorrect) {
  const isStealAttempt = match.awaitingSteal

  if (isStealAttempt) {
    const updatedScores = isCorrect
      ? {
          ...match.scores,
          [teamId]: match.scores[teamId] + STEAL_QUESTION_POINTS,
        }
      : { ...match.scores }

    const sanitizedMatch = {
      ...match,
      timer: null,
    }

    return advanceMatchState(sanitizedMatch, updatedScores)
  }

  if (isCorrect) {
    const updatedScores = {
      ...match.scores,
      [teamId]: match.scores[teamId] + PRIMARY_QUESTION_POINTS,
    }

    const sanitizedMatch = {
      ...match,
      timer: null,
    }

    return advanceMatchState(sanitizedMatch, updatedScores)
  }

  const opponentId = match.teams.find((id) => id && id !== teamId) ?? null

  if (!opponentId) {
    const sanitizedMatch = {
      ...match,
      timer: null,
    }

    return advanceMatchState(sanitizedMatch, { ...match.scores })
  }

  return {
    completed: false,
    match: {
      ...match,
      awaitingSteal: true,
      activeTeamId: opponentId,
      timer: createRunningTimer('steal'),
    },
  }
}

function createLiveMatch(teamAId, teamBId, options = {}) {
  const {
    id = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moderatorId = null,
    tournamentMatchId = null,
  } = options

  const questionQueue = drawQuestions(QUESTIONS_PER_TEAM * 2)

  return {
    id,
    teams: [teamAId, teamBId],
    scores: {
      [teamAId]: 0,
      [teamBId]: 0,
    },
    questionQueue,
    assignedTeamOrder: [],
    questionIndex: 0,
    activeTeamId: null,
    awaitingSteal: false,
    status: 'coin-toss',
    timer: null,
    coinToss: {
      status: 'ready',
      winnerId: null,
      decision: null,
      resultFace: null,
    },
    tournamentMatchId,
    moderatorId,
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const [teams, setTeams] = useState(INITIAL_TEAM_STATE)
  const [session, setSession] = useState({ type: 'guest' })
  const [adminAccounts, setAdminAccounts] = useState(DEFAULT_ADMIN_ACCOUNTS)
  const [moderators, setModerators] = useState(DEFAULT_MODERATOR_ACCOUNTS)
  const [activeMatches, setActiveMatches] = useState([])
  const [matchHistory, setMatchHistory] = useState([])
  const [recentResult, setRecentResult] = useState(null)
  const [authModal, setAuthModal] = useState({
    open: false,
    role: 'team',
    view: 'login',
    redirectTo: null,
  })
  const [authFeedback, setAuthFeedback] = useState({ error: null, success: null })
  const [selectedTeamIds, setSelectedTeamIds] = useState(() =>
    buildDefaultTeamSelection(INITIAL_TEAM_STATE, TOURNAMENT_TEAM_LIMIT),
  )
  const [tournament, setTournament] = useState(null)
  const [tournamentLaunched, setTournamentLaunched] = useState(false)
  const finalizedMatchesRef = useRef(new Set())
  const rosterSeedKeyRef = useRef('')

  const location = useLocation()
  const navigate = useNavigate()

  const clearAuthFeedback = useCallback(() => setAuthFeedback({ error: null, success: null }), [])

  const openAuthModal = useCallback(
    ({ role = 'team', view = 'login', redirectTo = null } = {}) => {
      setAuthModal({ open: true, role, view, redirectTo })
      setAuthFeedback({ error: null, success: null })
    },
    [],
  )

  const closeAuthModal = useCallback(() => {
    setAuthModal((previous) => ({ ...previous, open: false }))
    setAuthFeedback({ error: null, success: null })
  }, [])

  const createIdentifier = useCallback(
    (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    [],
  )

  const activeTeam = useMemo(() => {
    if (session.type !== 'team') return null
    return teams.find((team) => team.id === session.teamId) ?? null
  }, [session, teams])

  const activeTeamMatch = useMemo(() => {
    if (session.type !== 'team') return null
    return activeMatches.find((match) => match.teams.includes(session.teamId)) ?? null
  }, [activeMatches, session])

  const activeModerator = useMemo(() => {
    if (session.type !== 'moderator') return null
    return moderators.find((account) => account.id === session.moderatorId) ?? null
  }, [moderators, session])

  useEffect(() => {
    setSelectedTeamIds((previous) => {
      const availableIds = teams.map((team) => team.id)
      const requiredCount = Math.min(TOURNAMENT_TEAM_LIMIT, availableIds.length)
      const filtered = previous.filter((id) => availableIds.includes(id))
      if (filtered.length >= requiredCount) {
        const limited = filtered.slice(0, requiredCount)
        const unchanged = limited.length === previous.length && limited.every((id, index) => id === previous[index])
        return unchanged ? previous : limited
      }

      const toAdd = availableIds.filter((id) => !filtered.includes(id))
      const next = [...filtered, ...toAdd].slice(0, requiredCount)
      const unchanged = next.length === previous.length && next.every((id, index) => id === previous[index])
      return unchanged ? previous : next
    })
  }, [teams])

  useEffect(() => {
    setSelectedTeamIds((previous) => {
      const availableIds = teams.map((team) => team.id)
      const requiredCount = Math.min(TOURNAMENT_TEAM_LIMIT, availableIds.length)
      const filtered = previous.filter((id) => availableIds.includes(id))
      if (filtered.length >= requiredCount) {
        const limited = filtered.slice(0, requiredCount)
        const unchanged = limited.length === previous.length && limited.every((id, index) => id === previous[index])
        return unchanged ? previous : limited
      }

      const toAdd = availableIds.filter((id) => !filtered.includes(id))
      const next = [...filtered, ...toAdd].slice(0, requiredCount)
      const unchanged = next.length === previous.length && next.every((id, index) => id === previous[index])
      return unchanged ? previous : next
    })
  }, [teams])

  const handleTeamLogin = (loginId, password, options = {}) => {
    clearAuthFeedback()
    const normalizedLogin = loginId.trim().toLowerCase()
    const team = teams.find((item) => item.loginId.toLowerCase() === normalizedLogin)

    if (!team || team.password !== password.trim()) {
      setAuthFeedback({ error: 'Invalid team credentials. Please try again.', success: null })
      return false
    }

    setSession({ type: 'team', teamId: team.id })
    clearAuthFeedback()
    const redirectTo = options.redirectTo ?? authModal.redirectTo ?? '/team'
    navigate(redirectTo, { replace: true })
    options.onSuccess?.()
    return true
  }

  const handleAdminLogin = (loginId, password, options = {}) => {
    clearAuthFeedback()
    const normalizedLogin = loginId.trim().toLowerCase()
    const account = adminAccounts.find((item) => item.loginId.toLowerCase() === normalizedLogin)

    if (!account || account.password !== password.trim()) {
      setAuthFeedback({ error: 'Incorrect admin login details.', success: null })
      return false
    }

    setSession({ type: 'admin', adminId: account.id })
    clearAuthFeedback()
    const redirectTo = options.redirectTo ?? authModal.redirectTo ?? '/admin'
    navigate(redirectTo, { replace: true })
    options.onSuccess?.()
    return true
  }

  const handleModeratorLogin = (loginId, password, options = {}) => {
    clearAuthFeedback()
    const normalizedLogin = loginId.trim().toLowerCase()
    const moderator = moderators.find((item) => item.loginId.toLowerCase() === normalizedLogin)

    if (!moderator || moderator.password !== password.trim()) {
      setAuthFeedback({ error: 'Invalid moderator credentials. Please try again.', success: null })
      return false
    }

    setSession({ type: 'moderator', moderatorId: moderator.id })
    clearAuthFeedback()
    const redirectTo = options.redirectTo ?? authModal.redirectTo ?? '/moderator'
    navigate(redirectTo, { replace: true })
    options.onSuccess?.()
    return true
  }

  const handleTeamRegistration = (form) => {
    clearAuthFeedback()
    const name = form.name.trim()
    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (!name || !loginId || !password) {
      setAuthFeedback({ error: 'All fields are required to register a team.', success: null })
      return false
    }

    const normalizedLogin = loginId.toLowerCase()
    if (teams.some((team) => team.loginId.toLowerCase() === normalizedLogin)) {
      setAuthFeedback({ error: 'A team with that login ID already exists.', success: null })
      return false
    }

    const newTeam = {
      id: createIdentifier('team'),
      name,
      loginId,
      password,
      wins: 0,
      losses: 0,
      totalScore: 0,
      eliminated: false,
    }

    setTeams((previous) => [...previous, newTeam])
    setAuthFeedback({ error: null, success: 'Team registered successfully! You can now log in.' })
    setAuthModal((previous) => ({ ...previous, role: 'team', view: 'login', redirectTo: previous.redirectTo ?? '/team' }))
    return true
  }

  const handleAdminRegistration = (form) => {
    clearAuthFeedback()
    const name = form.name.trim()
    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (!name || !loginId || !password) {
      setAuthFeedback({ error: 'All fields are required to register an admin.', success: null })
      return false
    }

    const normalizedLogin = loginId.toLowerCase()
    if (adminAccounts.some((account) => account.loginId.toLowerCase() === normalizedLogin)) {
      setAuthFeedback({ error: 'An admin with that login ID already exists.', success: null })
      return false
    }

    const newAdmin = {
      id: createIdentifier('admin'),
      name,
      loginId,
      password,
    }

    setAdminAccounts((previous) => [...previous, newAdmin])
    setAuthFeedback({ error: null, success: 'Admin registered successfully! You can now log in.' })
    setAuthModal((previous) => ({ ...previous, role: 'admin', view: 'login', redirectTo: previous.redirectTo ?? '/admin' }))
    return true
  }

  const handleModeratorRegistration = (form) => {
    clearAuthFeedback()
    const name = form.name.trim()
    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (!name || !loginId || !password) {
      setAuthFeedback({ error: 'All fields are required to register a moderator.', success: null })
      return false
    }

    const normalizedLogin = loginId.toLowerCase()
    if (moderators.some((account) => account.loginId.toLowerCase() === normalizedLogin)) {
      setAuthFeedback({ error: 'A moderator with that login ID already exists.', success: null })
      return false
    }

    const newModerator = {
      id: createIdentifier('mod'),
      name,
      loginId,
      password,
    }

    setModerators((previous) => [...previous, newModerator])
    setAuthFeedback({ error: null, success: 'Moderator registered successfully! You can now log in.' })
    setAuthModal((previous) => ({ ...previous, role: 'moderator', view: 'login', redirectTo: previous.redirectTo ?? '/moderator' }))
    return true
  }

  const handleLogout = () => {
    setSession({ type: 'guest' })
    clearAuthFeedback()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    const state = location.state
    if (!state?.authMode) {
      return
    }

    const redirectFrom = state.from
    const redirectTarget = redirectFrom
      ? `${redirectFrom.pathname ?? ''}${redirectFrom.search ?? ''}${redirectFrom.hash ?? ''}`
      : state.authMode === 'admin'
      ? '/admin'
      : state.authMode === 'moderator'
      ? '/moderator'
      : '/team'

    openAuthModal({ role: state.authMode, view: state.authView ?? 'login', redirectTo: redirectTarget })
    navigate(location.pathname, { replace: true })
  }, [location, navigate, openAuthModal])

  useEffect(() => {
    if (!tournamentLaunched || !tournament) {
      return
    }

    const activeTournamentMatches = new Set(
      activeMatches
        .filter((match) => match.status !== 'completed' && match.tournamentMatchId)
        .map((match) => match.tournamentMatchId),
    )

    const matchesToLaunch = Object.values(tournament.matches ?? {}).filter((match) => {
      if (match.status === 'completed') return false
      if (!match.teams?.every((teamId) => Boolean(teamId))) return false
      if (match.matchRefId) return false
      if (activeTournamentMatches.has(match.id)) return false
      return true
    })

    if (!matchesToLaunch.length) {
      return
    }

    const creations = matchesToLaunch.map((bracketMatch) => {
      const liveMatchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      return {
        tournamentMatchId: bracketMatch.id,
        liveMatch: createLiveMatch(bracketMatch.teams[0], bracketMatch.teams[1], {
          id: liveMatchId,
          tournamentMatchId: bracketMatch.id,
          moderatorId: bracketMatch.moderatorId ?? null,
        }),
      }
    })

    setActiveMatches((previous) => [...previous, ...creations.map((item) => item.liveMatch)])
    setTournament((previous) => {
      if (!previous) return previous
      return creations.reduce(
        (state, item) => attachLiveMatch(state, item.tournamentMatchId, item.liveMatch.id),
        previous,
      )
    })
  }, [tournamentLaunched, tournament, activeMatches])

  const handleLaunchTournament = () => {
    if (!tournament) return
    setTournamentLaunched((previous) => (previous ? previous : true))
  }

  const handleToggleTeamSelection = useCallback(
    (teamId) => {
      if (tournamentLaunched) {
        return
      }

      setSelectedTeamIds((previous) => {
        const limit = Math.min(TOURNAMENT_TEAM_LIMIT, teams.length)
        const isSelected = previous.includes(teamId)

        if (!isSelected && previous.length >= limit) {
          return previous
        }

        const tentative = isSelected
          ? previous.filter((id) => id !== teamId)
          : [...previous, teamId]

        const orderedRoster = teams.map((team) => team.id)
        const orderedSelection = orderedRoster.filter((id) => tentative.includes(id))
        const unchanged =
          orderedSelection.length === previous.length &&
          orderedSelection.every((id, index) => id === previous[index])

        if (!unchanged && tournament && !tournamentLaunched) {
          const selectionKey = createSelectionKey(orderedSelection)
          if (selectionKey !== rosterSeedKeyRef.current) {
            rosterSeedKeyRef.current = ''
            setTournament(null)
          }
        }

        return unchanged ? previous : orderedSelection
      })
    },
    [teams, tournament, tournamentLaunched],
  )

  const handleMatchMaking = useCallback(() => {
    if (tournamentLaunched) {
      return
    }

    const availableIds = teams.map((team) => team.id)
    const requiredCount = Math.min(TOURNAMENT_TEAM_LIMIT, availableIds.length)
    if (selectedTeamIds.length < requiredCount) {
      return
    }

    const orderedRoster = new Map(teams.map((team, index) => [team.id, index]))
    const seededIds = [...selectedTeamIds]
      .filter((id) => orderedRoster.has(id))
      .sort((left, right) => (orderedRoster.get(left) ?? 0) - (orderedRoster.get(right) ?? 0))
      .slice(0, requiredCount)
    const seededSet = new Set(seededIds)
    const seededTeams = teams.filter((team) => seededSet.has(team.id))

    if (!seededTeams.length) {
      return
    }

    const nextTournament = initializeTournament(seededTeams, moderators)
    rosterSeedKeyRef.current = createSelectionKey(seededIds)

    finalizedMatchesRef.current = new Set()
    setActiveMatches([])
    setMatchHistory([])
    setRecentResult(null)
    setTournamentLaunched(false)
    setTeams((previous) =>
      previous.map((team) => ({
        ...team,
        wins: 0,
        losses: 0,
        totalScore: 0,
        eliminated: false,
      })),
    )
    setTournament(nextTournament)
  }, [moderators, selectedTeamIds, teams, tournamentLaunched])

  const handleFlipCoin = (matchId, options = {}) => {
    const { moderatorId } = options
    setActiveMatches((previousMatches) => {
      const targetMatch = previousMatches.find((match) => match.id === matchId)

      if (!targetMatch || targetMatch.coinToss.status !== 'ready') {
        return previousMatches
      }

      if (targetMatch.moderatorId && targetMatch.moderatorId !== moderatorId) {
        return previousMatches
      }

      const [teamAId, teamBId] = targetMatch.teams
      const resultFace = Math.random() < 0.5 ? 'heads' : 'tails'
      const winnerId = resultFace === 'heads' ? teamAId : teamBId

      const updatedMatches = previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        return {
          ...match,
          coinToss: {
            ...match.coinToss,
            status: 'flipping',
            winnerId: null,
            resultFace,
          },
        }
      })

      setTimeout(() => {
        setActiveMatches((matches) =>
          matches.map((match) => {
            if (match.id !== matchId) {
              return match
            }

            if (match.coinToss.status !== 'flipping') {
              return match
            }

            return {
              ...match,
              coinToss: {
                ...match.coinToss,
                status: 'flipped',
                winnerId,
              },
            }
          }),
        )
      }, 1800)

      return updatedMatches
    })
  }

  const handleSelectFirst = (matchId, deciderId, firstTeamId, options = {}) => {
    const { moderatorId } = options
    setActiveMatches((previousMatches) =>
      previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.coinToss.status !== 'flipped') return match
        const tossWinnerId = match.coinToss.winnerId
        const moderatorAuthorized =
          Boolean(moderatorId) && (!match.moderatorId || match.moderatorId === moderatorId)
        if (!moderatorAuthorized && tossWinnerId !== deciderId) return match
        if (!match.teams.includes(firstTeamId)) return match

        const order = buildQuestionOrder(firstTeamId, match.teams, QUESTIONS_PER_TEAM)

        return {
          ...match,
          assignedTeamOrder: order,
          activeTeamId: order[0],
          status: 'in-progress',
          timer: createRunningTimer('primary'),
          coinToss: {
            ...match.coinToss,
            status: 'decided',
            decision: {
              deciderId,
              firstTeamId,
            },
          },
        }
      }),
    )
  }

  const handlePauseMatch = (matchId, actor = {}) => {
    const { moderatorId = null, isAdmin = false } = actor
    setActiveMatches((previousMatches) =>
      previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.status !== 'in-progress') return match
        if (!isAdmin && match.moderatorId && match.moderatorId !== moderatorId) return match

        return {
          ...match,
          status: 'paused',
          timer: pauseTimer(match.timer),
        }
      }),
    )
  }

  const handleResumeMatch = (matchId, actor = {}) => {
    const { moderatorId = null, isAdmin = false } = actor
    setActiveMatches((previousMatches) =>
      previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.status !== 'paused') return match
        if (!isAdmin && match.moderatorId && match.moderatorId !== moderatorId) return match

        return {
          ...match,
          status: 'in-progress',
          timer: resumeTimer(match.timer),
        }
      }),
    )
  }

  const handleResetMatch = (matchId, actor = {}) => {
    const { moderatorId = null, isAdmin = false } = actor
    finalizedMatchesRef.current.delete(matchId)
    setActiveMatches((previousMatches) =>
      previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.status === 'completed') return match
        if (!isAdmin && match.moderatorId && match.moderatorId !== moderatorId) return match

        const [teamAId, teamBId] = match.teams

        return {
          ...match,
          scores: {
            [teamAId]: 0,
            [teamBId]: 0,
          },
          questionIndex: 0,
          assignedTeamOrder: [],
          activeTeamId: null,
          awaitingSteal: false,
          status: 'coin-toss',
          timer: null,
          coinToss: {
            status: 'ready',
            winnerId: null,
            decision: null,
            resultFace: null,
          },
        }
      }),
    )
  }

  const finalizeMatch = useCallback(
    (match) => {
      if (finalizedMatchesRef.current.has(match.id)) {
        return
      }

      finalizedMatchesRef.current.add(match.id)

      const [teamAId, teamBId] = match.teams
      const teamAScore = match.scores[teamAId]
      const teamBScore = match.scores[teamBId]
      const winnerId = teamAScore === teamBScore ? null : teamAScore > teamBScore ? teamAId : teamBId
      const loserId = winnerId ? (winnerId === teamAId ? teamBId : teamAId) : null

      setTeams((previous) =>
        previous.map((team) => {
          if (!match.teams.includes(team.id)) {
            return team
          }

          const updatedScore = team.totalScore + match.scores[team.id]

          if (team.id === winnerId) {
            return {
              ...team,
              wins: team.wins + 1,
              totalScore: updatedScore,
            }
          }

          if (team.id === loserId) {
            const losses = team.losses + 1
            return {
              ...team,
              losses,
              totalScore: updatedScore,
              eliminated: losses >= 2,
            }
          }

          return {
            ...team,
            totalScore: updatedScore,
          }
        }),
      )

      const record = {
        id: match.id,
        teams: match.teams,
        scores: match.scores,
        winnerId,
        completedAt: new Date().toISOString(),
      }

      setMatchHistory((previous) => {
        if (previous.some((item) => item.id === match.id)) {
          return previous
        }

        return [record, ...previous]
      })

      if (match.tournamentMatchId) {
        setTournament((previous) => {
          if (!previous) return previous
          let nextState = previous
          if (winnerId && loserId) {
            nextState = recordMatchResult(nextState, match.tournamentMatchId, {
              winnerId,
              loserId,
              scores: match.scores,
            })
          }
          return detachLiveMatch(nextState, match.tournamentMatchId)
        })
      }

      const teamAName = teams.find((team) => team.id === teamAId)?.name ?? 'Team A'
      const teamBName = teams.find((team) => team.id === teamBId)?.name ?? 'Team B'

      const summary = winnerId
        ? `${teams.find((team) => team.id === winnerId)?.name} defeated ${
            teams.find((team) => team.id === (winnerId === teamAId ? teamBId : teamAId))?.name
          } ${teamAScore}-${teamBScore}`
        : `Match tied ${teamAName} ${teamAScore} - ${teamBName} ${teamBScore}`

      setRecentResult({
        matchId: match.id,
        winnerId,
        summary,
      })
    },
    [setMatchHistory, setRecentResult, setTeams, setTournament, teams],
  )

  const scheduleFinalization = useCallback(
    (match) => {
      if (!match) return

      const runFinalization = () => finalizeMatch(match)

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(runFinalization)
      } else {
        Promise.resolve().then(runFinalization)
      }
    },
    [finalizeMatch],
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()

      setActiveMatches((previousMatches) => {
        let mutated = false
        const finalizations = []

        const nextMatches = previousMatches.reduce((updated, match) => {
          if (match.status !== 'in-progress') {
            updated.push(match)
            return updated
          }

          const timer = match.timer

          if (!timer || timer.status !== 'running' || !timer.deadline) {
            updated.push(match)
            return updated
          }

          if (timer.deadline > now) {
            updated.push(match)
            return updated
          }

          mutated = true

          const actingTeamId = match.activeTeamId

          if (!actingTeamId) {
            updated.push({
              ...match,
              timer: null,
            })
            return updated
          }

          const outcome = applyAnswerResult(match, actingTeamId, false)

          if (outcome.completed) {
            finalizations.push(outcome.match)
            return updated
          }

          updated.push(outcome.match)
          return updated
        }, [])

        if (!mutated) {
          return previousMatches
        }

        finalizations.forEach((item) => scheduleFinalization(item))
        return nextMatches
      })
    }, 250)

    return () => clearInterval(interval)
  }, [scheduleFinalization])

  const handleTeamAnswer = (matchId, teamId, selectedOption) => {
    setActiveMatches((previousMatches) => {
      let completedMatch = null

      const nextMatches = previousMatches.reduce((updated, match) => {
        if (match.id !== matchId) {
          updated.push(match)
          return updated
        }

        if (match.status !== 'in-progress' || match.activeTeamId !== teamId) {
          updated.push(match)
          return updated
        }

        const question = match.questionQueue?.[match.questionIndex]

        if (!question) {
          updated.push(match)
          return updated
        }

        const isCorrect = question.answer === selectedOption

        const outcome = applyAnswerResult(match, teamId, isCorrect)

        if (outcome.completed) {
          completedMatch = outcome.match
          return updated
        }

        updated.push(outcome.match)
        return updated
      }, [])

      if (completedMatch) {
        const matchToFinalize = completedMatch
        scheduleFinalization(matchToFinalize)
      }

      return nextMatches
    })
  }

  const handleDismissRecent = () => setRecentResult(null)

  const handleOpenTeamLogin = () =>
    openAuthModal({ role: 'team', view: 'login', redirectTo: '/team' })

  const handleOpenAdminLogin = () =>
    openAuthModal({ role: 'admin', view: 'login', redirectTo: '/admin' })

  const handleOpenModeratorLogin = () =>
    openAuthModal({ role: 'moderator', view: 'login', redirectTo: '/moderator' })

  const handleOpenTeamRegistration = () =>
    openAuthModal({ role: 'team', view: 'register', redirectTo: '/team' })

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            teams={teams}
            onTeamLogin={() => navigateToLogin('team')}
            onModeratorLogin={() => navigateToLogin('moderator')}
            onAdminLogin={() => navigateToLogin('admin')}
          />
        }
      />
      <Route
        path="/login"
        element={
          <LoginPage
            authError={authError}
            onTeamLogin={handleTeamLogin}
            onAdminLogin={handleAdminLogin}
            onModeratorLogin={handleModeratorLogin}
            onSuperAdminLogin={handleSuperAdminLogin}
            onBack={() => {
              setAuthError(null)
              navigate('/')
            }}
            session={session}
          />
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute isAllowed={session.type === 'admin'} redirectTo="/login?mode=admin">
            <AdminDashboard
              teams={teams}
              activeMatches={activeMatches}
              recentResult={recentResult}
              history={matchHistory}
              tournament={tournament}
              onStartMatch={handleStartMatch}
              onFlipCoin={handleFlipCoin}
              onSelectFirst={handleSelectFirst}
              onDismissRecent={handleDismissRecent}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super"
        element={
          <ProtectedRoute isAllowed={session.type === 'super-admin'} redirectTo="/login?mode=super">
            <SuperAdminDashboard
              teams={teams}
              onTeamLogin={handleOpenTeamLogin}
              onModeratorLogin={handleOpenModeratorLogin}
              onAdminLogin={handleOpenAdminLogin}
              onTeamRegister={handleOpenTeamRegistration}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              isAllowed={session.type === 'admin'}
              redirectTo="/"
              redirectState={{ authMode: 'admin', authView: 'login' }}
            >
              <AdminDashboard
                teams={teams}
                activeMatches={activeMatches}
                recentResult={recentResult}
                history={matchHistory}
                tournament={tournament}
                moderators={moderators}
                superAdmin={SUPER_ADMIN_PROFILE}
                tournamentLaunched={tournamentLaunched}
                selectedTeamIds={selectedTeamIds}
                matchMakingLimit={TOURNAMENT_TEAM_LIMIT}
                onToggleTeamSelection={handleToggleTeamSelection}
                onMatchMake={handleMatchMaking}
                onLaunchTournament={handleLaunchTournament}
                onPauseMatch={(matchId) => handlePauseMatch(matchId, { isAdmin: true })}
                onResumeMatch={(matchId) => handleResumeMatch(matchId, { isAdmin: true })}
                onResetMatch={(matchId) => handleResetMatch(matchId, { isAdmin: true })}
                onDismissRecent={handleDismissRecent}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator"
          element={
            <ProtectedRoute
              isAllowed={session.type === 'moderator'}
              redirectTo="/"
              redirectState={{ authMode: 'moderator', authView: 'login' }}
            >
              <ModeratorDashboard
                moderator={activeModerator}
                matches={activeMatches}
                teams={teams}
                tournament={tournament}
                moderators={moderators}
                selectedTeamIds={selectedTeamIds}
                matchMakingLimit={TOURNAMENT_TEAM_LIMIT}
                tournamentLaunched={tournamentLaunched}
                onFlipCoin={(matchId) =>
                  handleFlipCoin(matchId, { moderatorId: activeModerator?.id })
                }
                onSelectFirst={(matchId, deciderId, firstTeamId) =>
                  handleSelectFirst(matchId, deciderId, firstTeamId, {
                    moderatorId: activeModerator?.id,
                  })
                }
                onPauseMatch={(matchId) =>
                  handlePauseMatch(matchId, { moderatorId: activeModerator?.id })
                }
                onResumeMatch={(matchId) =>
                  handleResumeMatch(matchId, { moderatorId: activeModerator?.id })
                }
                onResetMatch={(matchId) =>
                  handleResetMatch(matchId, { moderatorId: activeModerator?.id })
                }
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute
              isAllowed={session.type === 'team' && Boolean(activeTeam)}
              redirectTo="/"
              redirectState={{ authMode: 'team', authView: 'login' }}
            >
              <TeamDashboard
                team={activeTeam}
                teams={teams}
                match={activeTeamMatch}
                history={matchHistory}
                onAnswer={(matchId, option) => handleTeamAnswer(matchId, activeTeam.id, option)}
                onSelectFirst={(matchId, firstTeamId) =>
                  handleSelectFirst(matchId, activeTeam.id, firstTeamId)
                }
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal
        isOpen={authModal.open}
        initialRole={authModal.role}
        initialView={authModal.view}
        error={authFeedback.error}
        successMessage={authFeedback.success}
        onClose={closeAuthModal}
        onTeamLogin={(loginId, password) =>
          handleTeamLogin(loginId, password, {
            redirectTo: authModal.redirectTo ?? '/team',
            onSuccess: closeAuthModal,
          })
        }
        onAdminLogin={(loginId, password) =>
          handleAdminLogin(loginId, password, {
            redirectTo: authModal.redirectTo ?? '/admin',
            onSuccess: closeAuthModal,
          })

        }
        onModeratorLogin={(loginId, password) =>
          handleModeratorLogin(loginId, password, {
            redirectTo: authModal.redirectTo ?? '/moderator',
            onSuccess: closeAuthModal,
          })
        }
        onTeamRegister={handleTeamRegistration}
        onAdminRegister={handleAdminRegistration}
        onModeratorRegister={handleModeratorRegistration}
      />
    </>
  )
}
