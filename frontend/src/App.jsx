import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  ADMIN_CREDENTIALS,
  MIN_TOURNAMENT_TEAM_COUNT,
  MODERATOR_ACCOUNTS,
  QUESTIONS_PER_TEAM,
  SUPER_ADMIN_PROFILE,
  TOURNAMENT_TEAM_LIMIT,
} from './app/constants'
import { advanceMatchState, applyAnswerResult, buildQuestionOrder, createLiveMatch } from './app/matchLifecycle'
import {
  INITIAL_TEAM_STATE,
  normalizeModeratorRecord,
  normalizeTeamRecord,
} from './app/normalizers'
import { buildDefaultTeamSelection, createSelectionKey } from './app/selection'
import { clearStoredSession, readStoredSession, writeStoredSession } from './app/sessionStorage'
import { createRunningTimer, pauseTimer, resumeTimer } from './app/matchTiming'
import AdminDashboard from './components/AdminDashboard'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import ModeratorDashboard from './components/ModeratorDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import TeamDashboard from './components/TeamDashboard'
import ResetPasswordPage from './components/authentication/ResetPasswordPage'
import {
  initializeTournament,
  recordMatchResult,
  attachLiveMatch,
  detachLiveMatch,
  grantMatchBye,
} from './tournament/engine'
import LearnToPlay from './components/LearnToPlay'
import PublicTournamentPage from './components/PublicTournamentPage'
import PublicMatchViewer from './components/PublicMatchViewer'

const mapTournamentFromApi = (apiTournament) => {
  if (!apiTournament?.state) return null
  const baseState = apiTournament.state
  return {
    ...baseState,
    backendId: apiTournament.id,
    name: apiTournament.name,
    status: baseState.status || apiTournament.status,
    createdAt: baseState.createdAt ?? apiTournament.createdAt,
    updatedAt: baseState.updatedAt ?? apiTournament.updatedAt,
    teams: (apiTournament.teams || baseState.teams || []).map((t) => (t?.toString ? t.toString() : t)),
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
  const [teams, setTeams] = useState(() => INITIAL_TEAM_STATE.map(normalizeTeamRecord))
  const [moderators, setModerators] = useState(() => MODERATOR_ACCOUNTS.map(normalizeModeratorRecord))
  const [session, setSession] = useState(() => readStoredSession() ?? { type: 'guest' })
  const [activeMatches, setActiveMatches] = useState([])
  const [matchHistory, setMatchHistory] = useState([])
  const [recentResult, setRecentResult] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [selectedTeamIds, setSelectedTeamIds] = useState([])
  const [tournament, setTournament] = useState(null)
  const [tournamentLaunched, setTournamentLaunched] = useState(false)
  const [teamRegistrations, setTeamRegistrations] = useState([])
  const [moderatorRegistrations, setModeratorRegistrations] = useState([])
  const [, setMatchSettings] = useState(null)
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [analyticsQuestions, setAnalyticsQuestions] = useState([])
  const [analyticsQuestionHistory, setAnalyticsQuestionHistory] = useState([])
  const [profiles, setProfiles] = useState({ teams: [], moderators: [] })
  const [teamResultToast, setTeamResultToast] = useState(null)
  const [teamAnswerToast, setTeamAnswerToast] = useState(null)
  const [moderatorResultToasts, setModeratorResultToasts] = useState([])
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'
  const SOCKET_BASE = API_BASE.replace(/\/api$/, '')
  const apiBaseHost = useMemo(() => API_BASE.replace(/\/api$/, ''), [API_BASE])
  const normalizeAvatar = useCallback(
    (url) => {
      if (!url) return url
      return url.startsWith('http') ? url : `${apiBaseHost}${url}`
    },
    [apiBaseHost],
  )
  useEffect(() => {
    setTeams((prev) => {
      let changed = false
      const next = prev.map((team) => {
        if (team?.avatarUrl && !team.avatarUrl.startsWith('http')) {
          changed = true
          return { ...team, avatarUrl: normalizeAvatar(team.avatarUrl) }
        }
        return team
      })
      return changed ? next : prev
    })
    setModerators((prev) => {
      let changed = false
      const next = prev.map((mod) => {
        if (mod?.avatarUrl && !mod.avatarUrl.startsWith('http')) {
          changed = true
          return { ...mod, avatarUrl: normalizeAvatar(mod.avatarUrl) }
        }
        return mod
      })
      return changed ? next : prev
    })
  }, [normalizeAvatar, teams, moderators])
  const [archivedTournaments, setArchivedTournaments] = useState([])
  const [socketConnected, setSocketConnected] = useState(true)
  const finalizedMatchesRef = useRef(new Set())
  const rosterSeedKeyRef = useRef('')
  const rosterHydratedRef = useRef(false)
  const hydratingSessionRef = useRef(false)
  const activeMatchesRef = useRef([])
  const socketRef = useRef(null)
  const eventSourceRef = useRef(null)
  const liveMatchCreationRef = useRef(new Set())
  const coinFlipAnimRef = useRef(new Map())
  const seenResultToastRef = useRef(new Set())
  const teamNameMapRef = useRef({})
  const upsertActiveMatch = useCallback((match) => {
    if (!match?.id) return
    const bracketKey = match.tournamentMatchId || match.id
    setActiveMatches((previous) => {
      // Drop any other entries that represent the same bracket match (tournamentMatchId) to avoid duplicates.
      let next = previous
      if (bracketKey) {
        const filtered = previous.filter(
          (item) => (item.tournamentMatchId || item.id) !== bracketKey || item.id === match.id,
        )
        if (filtered.length !== previous.length) {
          next = filtered
        }
      }

      const existing = next.find((item) => item.id === match.id)
      if (existing) {
        return next.map((item) => (item.id === match.id ? { ...existing, ...match } : item))
      }
      return [...next, match]
    })
  }, [])

  const navigate = useNavigate()
  const location = useLocation()

  const activeTeam = useMemo(() => {
    if (session.type !== 'team') return null
    return teams.find((team) => team.id === session.teamId) ?? null
  }, [session, teams])

  useEffect(() => {
    setSelectedTeamIds((previous) => {
      const availableIds = teams.map((team) => team.id)
      const rosterOrder = teams.map((team) => team.id)
      const limit = Math.min(TOURNAMENT_TEAM_LIMIT, availableIds.length)
      const filtered = rosterOrder.filter((id) => previous.includes(id)).slice(0, limit)
      return filtered
    })
  }, [teams])

  const activeTeamMatch = useMemo(() => {
    if (session.type !== 'team') return null
    return activeMatches.find((match) => match.teams.includes(session.teamId)) ?? null
  }, [activeMatches, session])

  const activeModerator = useMemo(() => {
    if (session.type !== 'moderator') return null
    return moderators.find((account) => account.id === session.moderatorId) ?? null
  }, [session, moderators])

  useEffect(() => {
    activeMatchesRef.current = activeMatches
  }, [activeMatches])

  useEffect(() => {
    const unique = Array.from(new Map(activeMatches.map((m) => [m.id, m])).values())
    if (unique.length !== activeMatches.length) {
      setActiveMatches(unique)
    }
  }, [activeMatches])

  useEffect(() => {
    writeStoredSession(session)
  }, [session])

  // Redirect to role dashboard if a valid session exists and we’re on a neutral path
  useEffect(() => {
    const neutral = ['/', '/login']
    if (!neutral.includes(location.pathname)) return
    if (session.type === 'team') {
      navigate('/team', { replace: true })
    } else if (session.type === 'moderator') {
      navigate('/moderator', { replace: true })
    } else if (session.type === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [session.type, location.pathname, navigate])
  // top-level in App component
  const teamNameMap = useMemo(() => {
    const entries = (teams || []).map((t) => {
      const key = String(t.id ?? t._id ?? t.loginId ?? '')
      return [key, t.name || t.teamName || t.organization || t.loginId || key]
    })
    // also map loginId → name to cover that case
    const loginEntries = (teams || [])
      .filter((t) => t.loginId)
      .map((t) => [String(t.loginId), t.name || t.teamName || t.organization || t.loginId])
    return Object.fromEntries([...entries, ...loginEntries])
  }, [teams])

  useEffect(() => {
    teamNameMapRef.current = teamNameMap
  }, [teamNameMap])

  const getTeamNameToast = useCallback((id) => {
    if (!id) return ''
    const key = String(id)
    const name = teamNameMapRef.current[key]
    if (!name || name === key) return ''
    return name
  }, [])


  const withApiBase = useCallback(
    (path) => {
      if (!path) return API_BASE
      return path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
    },
    [API_BASE],
  )

  const requestJson = useCallback(
    async (url, { method = 'GET', body, headers = {}, auth = false, token } = {}) => {
      const requestHeaders = { ...headers }
      const requestInit = { method }

      if (body !== undefined) {
        requestInit.body = JSON.stringify(body ?? {})
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json'
        }
      }

      const bearerToken = token ?? session.token
      if (auth && bearerToken) {
        requestHeaders.Authorization = `Bearer ${bearerToken}`
      }

      requestInit.headers = requestHeaders

      try {
        const response = await fetch(withApiBase(url), requestInit)
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Request failed')
        }

        return data
      } catch (error) {
        const message = error?.message || 'Request failed'
        const err = new Error(message)
        err.cause = error
        throw err
      }
    },
    [session.token],
  )

  const postJson = (url, body, options = {}) => requestJson(url, { method: 'POST', body, ...options })

  const applyRecordsToTeams = useCallback((records) => {
    if (!records) return
    setTeams((previous) =>
      previous.map((team) => {
        const record = records[team.id]
        if (!record) return team
        return {
          ...team,
          wins: record.wins ?? team.wins ?? 0,
          losses: record.losses ?? team.losses ?? 0,
          totalScore: record.points ?? team.totalScore ?? 0,
          eliminated: record.eliminated ?? team.eliminated ?? false,
        }
      }),
    )
  }, [])

  const syncMatchHistoryFromTournament = useCallback((state) => {
    if (!state?.matches) return
    setMatchHistory((previous) => {
      const keyFor = (item) => item?.tournamentMatchId || item?.id
      const existing = new Map(previous.map((item) => [keyFor(item), item]))
      Object.values(state.matches)
        .filter((match) => match.status === 'completed')
        .forEach((match) => {
          const key = match.id
          if (existing.has(key)) {
            return
          }
          const lastHistory = Array.isArray(match.history) && match.history.length ? match.history[match.history.length - 1] : null
          const completedAt = lastHistory?.timestamp
            ? new Date(lastHistory.timestamp).toISOString()
            : new Date().toISOString()
          const winnerId = match.winnerId ?? lastHistory?.winnerId ?? null
          const loserId = match.loserId ?? lastHistory?.loserId ?? null
          const scores = lastHistory?.scores ?? match.scores ?? {}
          existing.set(key, {
            id: match.id,
            tournamentMatchId: match.id,
            teams: match.teams ?? [],
            scores,
            winnerId,
            loserId,
            completedAt,
          })
        })
      const next = Array.from(existing.values())
      next.sort((left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0))
      return next
    })
  }, [])

  const applyTournamentFromApi = useCallback(
    (apiTournament) => {
      const mapped = mapTournamentFromApi(apiTournament)
      if (!mapped) return null
      setTournament(mapped)
      setTournamentLaunched(mapped.status === 'active' || mapped.status === 'live')
      applyRecordsToTeams(mapped.records)
      syncMatchHistoryFromTournament(mapped)
      return mapped
    },
    [applyRecordsToTeams, syncMatchHistoryFromTournament],
  )

  const ensureSocket = useCallback(() => {
    if (!socketRef.current) {
      const socket = io(SOCKET_BASE, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        pingInterval: 25000,
        pingTimeout: 60000,
        auth: session?.token ? { token: session.token } : {},
      })

      const deriveOutcome = (m, priorMatch) => {
        let winnerId = m?.winnerId
        let loserId = m?.loserId
        if (winnerId && loserId) {
          return { winnerId, loserId }
        }
        const historySource =
          (Array.isArray(m?.history) && m.history.length && m.history) ||
          (Array.isArray(priorMatch?.history) && priorMatch.history.length && priorMatch.history) ||
          null
        const lastHistory = historySource ? historySource[historySource.length - 1] : null
        if (lastHistory?.scores && Array.isArray(m?.teams) && m.teams.length === 2) {
          const [home, away] = m.teams
          const scoreFor = (id) => {
            const raw = lastHistory.scores?.[id]
            if (typeof raw === 'number') return raw
            if (raw && typeof raw === 'object' && '$numberInt' in raw) return Number(raw.$numberInt)
            return Number(raw ?? 0)
          }
          const homeScore = scoreFor(home)
          const awayScore = scoreFor(away)
          if (homeScore !== awayScore) {
            winnerId = homeScore > awayScore ? home : away
            loserId = homeScore > awayScore ? away : home
          }
        }
        return { winnerId, loserId }
      }

      socket.on('connect', () => {
        setSocketConnected(true)
        socket.emit('tournament:subscribe')
        activeMatchesRef.current.forEach((match) => {
          socket.emit('liveMatch:join', { matchId: match.id })
        })
      })

      socket.on('disconnect', () => {
        setSocketConnected(false)
      })

      socket.on('match:settings', (settings) => setMatchSettings(settings))

      socket.on('liveMatch:update', (match) => {
        if (!match?.id) return
        if (match.status === 'completed') {
          if (teams.length > 0 && session.type === 'team' && match.teams?.includes(session.teamId)) {
            const prior = activeMatchesRef.current.find((item) => item.id === match.id)
            const { winnerId, loserId } = deriveOutcome(match, prior)
            const isWinner = Boolean(winnerId) && winnerId === session.teamId
            const isLoser = Boolean(loserId) && loserId === session.teamId
            const alreadySeen = seenResultToastRef.current.has(match.id)
            const winnerName = getTeamNameToast(winnerId)
            console.log({ alreadySeen, isWinner, isLoser })
            if (!alreadySeen && (isWinner || isLoser)) {
              seenResultToastRef.current.add(match.id)
              const message = winnerName ? `Winner Is Team ${winnerName}` : isWinner ? 'You won!' : 'You lost'
              setTeamResultToast({ message, ts: Date.now() })
              setTimeout(() => setTeamResultToast(null), 10000)
            } else if (!alreadySeen && (!isWinner || !isLoser)) {
              seenResultToastRef.current.add(match.id)
              const message = `Match is Tied`
              setTeamResultToast({ message, ts: Date.now() })
              setTimeout(() => setTeamResultToast(null), 5000)
            }
          }
          if (teams.length > 0 && ((session.type === 'moderator' && match.moderatorId === session.moderatorId) || session.type === 'admin')) {
             const prior = activeMatchesRef.current.find((item)=>item.id === match.id)
             const {winnerId,loserId} = deriveOutcome(match,prior)
             const alreadySeen = seenResultToastRef.current.has(`mod-${match.id}`)
             if(!alreadySeen){
              seenResultToastRef.current.add(`mod-${match.id}`)
              const winnerName = winnerId ? getTeamNameToast(winnerId) : ''
              const loserName = loserId ? getTeamNameToast(loserId) : ''
              const message = winnerId && loserId && winnerName && loserName
                ? `${winnerName} defeated ${loserName}`
                : 'Match completed'
              const toast = {id: match.id,message,ts:Date.now()}
              setModeratorResultToasts((prev)=>{
                const next = [...prev,toast].slice(-3)
                setTimeout(()=>{
                  setModeratorResultToasts((curr)=>curr.filter((t)=>t.ts !== toast.ts))
                },5000)
                return next
              })
             }
          }
          setActiveMatches((prev) => prev.filter((item) => item.id !== match.id))
          return
        }

        // propagate serverNow onto timer for clock offset handling
        if (match.serverNow && match.timer) {
          match.timer = { ...match.timer, serverNow: match.serverNow }
        }
        const prior = activeMatchesRef.current.find((item) => item.id === match.id)
        const isFlipUpdate = match.coinToss?.status === 'flipped' || match.coinToss?.status === 'decided'
        const wasFlipping = prior?.coinToss?.status === 'flipping'
        const flipStart = coinFlipAnimRef.current.get(match.id)
        const applyUpdate = () => upsertActiveMatch(match)

        // If we didn't previously mark it as flipping, but the server sends a final toss state,
        // start a local flip timer so teams still see ~1800ms of spin before the result.
        if (isFlipUpdate && !wasFlipping && !flipStart) {
          const startedAt = Date.now()
          coinFlipAnimRef.current.set(match.id, startedAt)
          const delay = 1800
          setTimeout(() => {
            coinFlipAnimRef.current.delete(match.id)
            applyUpdate()
          }, delay)
          return
        }

        if (isFlipUpdate && wasFlipping && flipStart) {
          const elapsed = Date.now() - flipStart
          const delay = Math.max(0, 1800 - elapsed)
          setTimeout(() => {
            coinFlipAnimRef.current.delete(match.id)
            applyUpdate()
          }, delay)
          return
        }

        if (match.coinToss?.status === 'flipped' || match.coinToss?.status === 'decided') {
          coinFlipAnimRef.current.delete(match.id)
        }
        setActiveMatches((previous) => {
          const existing = previous.find((item) => item.id === match.id)
          if (existing) {
            const merged = {
              ...existing,
              ...match,
              questionQueue: match.questionQueue ?? existing.questionQueue,
              history: match.history ?? existing.history,
            }
            return previous.map((item) => (item.id === match.id ? merged : item))
          }
          return [...previous, match]
        })
      })

      socket.on('tournament:update', (payload) => {
        applyTournamentFromApi(payload)
      })

      socketRef.current = socket
    } else {
      socketRef.current.auth = session?.token ? { token: session.token } : {}
      if (socketRef.current.disconnected) {
        socketRef.current.connect()
      }
    }

    return socketRef.current
  }, [SOCKET_BASE, applyTournamentFromApi, session?.token])

  const joinLiveMatchRoom = useCallback(
    (matchId) => {
      if (!matchId) return
      const socket = ensureSocket()
      if (!socket) return
      socket.emit('liveMatch:join', { matchId })
    },
    [ensureSocket],
  )

  const upsertTeamRecord = useCallback((team) => {
    const normalized = normalizeTeamRecord(team)
    if (!normalized) return

    setTeams((previous) => {
      const existing = previous.find((item) => item.id === normalized.id)
      if (existing) {
        return previous.map((item) =>
          item.id === normalized.id
            ? {
              ...normalized,
              wins: existing.wins ?? normalized.wins,
              losses: existing.losses ?? normalized.losses,
              totalScore: existing.totalScore ?? normalized.totalScore,
              eliminated: existing.eliminated ?? normalized.eliminated,
            }
            : item,
        )
      }

      return [...previous, normalized]
    })
  }, [])

  const upsertModeratorRecord = useCallback((moderator) => {
    const normalized = normalizeModeratorRecord(moderator)
    if (!normalized) return

    setModerators((previous) => {
      const existing = previous.find((item) => item.id === normalized.id)
      if (existing) {
        return previous.map((item) => (item.id === normalized.id ? { ...existing, ...normalized } : item))
      }
      return [...previous, normalized]
    })
  }, [])

  const hydrateSessionFromToken = useCallback(
    async (storedSession) => {
      if (!storedSession?.token) return null

      try {
        const result = await requestJson('/auth/session', { auth: true, token: storedSession.token })
        const role = result.role || storedSession.type
        const resolvedToken = result.token || storedSession.token

        if (role === 'team') {
          const normalizedTeam = normalizeTeamRecord(result.user)
          upsertTeamRecord(normalizedTeam)
          setSession({
            type: 'team',
            teamId: normalizedTeam?.id ?? storedSession.teamId,
            token: resolvedToken,
            profile: normalizedTeam,
          })
          return normalizedTeam
        }

        if (role === 'admin') {
          setSession({ type: 'admin', token: resolvedToken, profile: result.user })
          return result.user
        }

        if (role === 'moderator') {
          const normalizedModerator = normalizeModeratorRecord(result.user)
          upsertModeratorRecord(normalizedModerator)
          setSession({
            type: 'moderator',
            moderatorId: normalizedModerator?.id ?? storedSession.moderatorId,
            token: resolvedToken,
            profile: normalizedModerator,
          })
          return normalizedModerator
        }

        clearStoredSession()
        setSession({ type: 'guest' })
        return null
      } catch (error) {
        console.error('Failed to restore session from token', error)
        clearStoredSession()
        setSession({ type: 'guest' })
        return null
      }
    },
    [requestJson, upsertModeratorRecord, upsertTeamRecord],
  )

  useEffect(() => {
    if (hydratingSessionRef.current) return

    const stored = readStoredSession()
    if (!stored?.token) return

    hydratingSessionRef.current = true
    hydrateSessionFromToken(stored).finally(() => {
      hydratingSessionRef.current = false
    })
  }, [hydrateSessionFromToken])

  const handleTeamLogin = async (loginId, password, options = {}) => {
    setAuthError(null)
    try {
      const result = await postJson('/auth/team', { loginId, password })
      const team = result.user

      upsertTeamRecord(team)

      setSession({ type: 'team', teamId: team?.id ?? loginId, token: result.token, profile: team })
      navigate(options.redirectTo ?? '/team', { replace: true })
      return result
    } catch (error) {
      const message = error?.message || 'Invalid team credentials. Please try again.'
      setAuthError(message)
      throw error
    }
  }

  const handleAdminLogin = async (loginId, password, options = {}) => {
    setAuthError(null)
    try {
      const result = await postJson('/auth/admin', { loginId, password })
      setSession({ type: 'admin', token: result.token, profile: result.user })
      navigate(options.redirectTo ?? '/admin', { replace: true })
      return result
    } catch (error) {
      const message = error?.message || 'Incorrect admin login details.'
      setAuthError(message)
      throw error
    }
  }

  const handleModeratorLogin = async (loginId, password, options = {}) => {
    setAuthError(null)
    try {
      const result = await postJson('/auth/moderator', { loginId, password })
      const moderator = result.user

      upsertModeratorRecord(moderator)

      setSession({ type: 'moderator', moderatorId: moderator?.id, token: result.token, profile: moderator })
      navigate(options.redirectTo ?? '/moderator', { replace: true })
      return result
    } catch (error) {
      const message = error?.message || 'Invalid moderator credentials. Please try again.'
      setAuthError(message)
      throw error
    }
  }

  const handleTeamRegistration = async (payload) => {
    return postJson('/auth/register', payload)
  }

  const handleModeratorRegistration = async (payload) => {
    return postJson('/auth/register/moderator', payload)
  }

  const handleTeamForgotPassword = async (payload) => {
    return postJson('/auth/forgot-password/team', payload)
  }

  const handleModeratorForgotPassword = async (payload) => {
    return postJson('/auth/forgot-password/moderator', payload)
  }

  const handleResetPassword = async (token, newPassword, role) => {
    return postJson('/auth/reset-password', { token, newPassword, role })
  }

  const handleDownloadTournamentArchive = useCallback(
    async (tournamentId = tournament?.id) => {
      let targetTournament = tournament
      let rawTournament = null

      // 1) Fetch the specific tournament if an id is provided and it's not the current one in state.
      if (tournamentId && (!targetTournament || targetTournament.id !== tournamentId)) {
        const result = await requestJson(`/tournaments/${tournamentId}`, { auth: true })
        rawTournament = result?.tournament || null
        targetTournament = rawTournament ? mapTournamentFromApi(rawTournament) : null
      }

      if (!targetTournament) return

      const getTeamName = (id) => teams.find((team) => team.id === id)?.name || id || ''

      // 2) Use tournament state matches directly (instead of global history).
      const stateSource = targetTournament.state || rawTournament?.state || {}
      const matchesState = Object.values(stateSource.matches ?? {})
      const stagesState = stateSource.stages ?? {}
      const stageOrder = (match) => stagesState[match.stageId]?.order ?? Number.MAX_SAFE_INTEGER
      const matchTimestamp = (match) => {
        const lastHistory = Array.isArray(match.history) && match.history.length ? match.history[match.history.length - 1] : null
        return match.completedAt || lastHistory?.timestamp || 0
      }
      const sortedMatches = [...matchesState].sort((a, b) => {
        const orderDiff = stageOrder(a) - stageOrder(b)
        if (orderDiff !== 0) return orderDiff
        return matchTimestamp(a) - matchTimestamp(b)
      })

      const matchRows = [
        ['MatchId', 'HomeTeamId', 'HomeTeamName', 'AwayTeamId', 'AwayTeamName', 'WinnerId', 'WinnerName', 'HomeScore', 'AwayScore', 'CompletedAt'],
        ...sortedMatches.map((match) => {
          const [home, away] = match.teams || []
          const winnerId = match.winnerId || ''
          const lastHistory = Array.isArray(match.history) && match.history.length ? match.history[match.history.length - 1] : null
          const scores = lastHistory?.scores ?? match.scores ?? {}
          return [
            match.id,
            home || '',
            getTeamName(home),
            away || '',
            getTeamName(away),
            winnerId,
            getTeamName(winnerId),
            scores?.[home] ?? 0,
            scores?.[away] ?? 0,
            lastHistory?.timestamp || '',
          ]
        }),
      ]

      // 3) Pick question stats for this tournament.
      const questionsFromHistory =
        analyticsQuestionHistory.find((entry) => entry.tournamentId === targetTournament.id)?.questions ?? null
      const snapshotQuestions = stateSource?.questionStats?.questions ?? targetTournament.questionStats?.questions ?? null
      const questions = snapshotQuestions || questionsFromHistory || analyticsQuestions || []

      // Derive podium (gold/silver/bronze) from matches only.
      const getTimestamp = (m) => m?.completedAt || (m?.history?.length ? m.history[m.history.length - 1]?.timestamp : 0) || 0
      const finalsCompleted = matchesState
        .filter((m) => {
          const key = m.id || ''
          return m.status === 'completed' && key.startsWith('final')
        })
        .sort((a, b) => {
          const roundA = a.meta?.roundNumber ?? 0
          const roundB = b.meta?.roundNumber ?? 0
          if (roundA !== roundB) return roundB - roundA
          return getTimestamp(b) - getTimestamp(a)
        })
      const finalMatch = finalsCompleted[0] || null
      const goldId = finalMatch?.winnerId || ''
      const silverId = finalMatch?.loserId || ''

      let bronzeId = ''
      if (teams.length >= 3) {
        const losersCompleted = matchesState
          .filter((m) => {
            const key = m.id || ''
            return m.status === 'completed' && key.startsWith('losers')
          })
          .sort((a, b) => getTimestamp(b) - getTimestamp(a))
        bronzeId = losersCompleted[0]?.loserId || ''
      }

      // Champion aligns to gold.
      const championId = goldId
      const championName = championId ? getTeamName(championId) : ''

      const podiumRows = [
        ['GoldId', goldId, 'GoldName', getTeamName(goldId)],
        ['SilverId', silverId, 'SilverName', getTeamName(silverId)],
        ['BronzeId', bronzeId, 'BronzeName', getTeamName(bronzeId)],
        [],
      ]

      const questionRows = [
        ['Prompt', 'Category', 'TimesAsked', 'Correct', 'Incorrect', 'AvgAccuracy'],
        ...(questions.map((q) => {
          const totalAsked = q.totalAsked ?? q.stats?.timesAsked ?? 0
          const correct = q.correctCount ?? q.stats?.correctCount ?? 0
          const incorrect = q.incorrectCount ?? q.stats?.incorrectCount ?? 0
          const accuracy =
            q.accuracy ??
            (correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 1000) / 10 : '')
          return [
            q.prompt,
            q.category ?? '',
            totalAsked,
            correct,
            incorrect,
            accuracy,
          ]
        })),
      ]

      const topRows = [
        ['Tournament', targetTournament.name || 'Tournament', 'Status', targetTournament.status || ''],
        ['ChampionId', championId, 'ChampionName', championName],
        ['CompletedAt', targetTournament.completedAt || '', '', ''],
        [],
        ['Matches'],
      ]

      const toCsv = (rows) =>
        rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

      const csv = [
        toCsv(topRows),
        'Podium',
        toCsv(podiumRows),
        'Matches',
        toCsv(matchRows),
        '',
        'Question Analytics',
        toCsv(questionRows),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(targetTournament.name || 'tournament')}-archive.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    [analyticsQuestionHistory, analyticsQuestions, requestJson, teams, tournament],
  )
  const importQuestions = useCallback(
    async (payload) => {
      const body =
        typeof payload === 'string'
          ? { csv: payload }
          : Array.isArray(payload)
            ? { questions: payload }
            : payload?.csv
              ? { csv: payload.csv }
              : payload?.questions
                ? { questions: payload.questions }
                : null

      if (!body) {
        throw new Error('No questions provided')
      }

      const result = await requestJson('/admin/questions/import', {
        method: 'POST',
        auth: true,
        body,
      })
      return result
    },
    [requestJson],
  )

  const fetchAllQuestions = useCallback(
    async ({ page = 1, limit = 20 } = {}) => {
      const params = new URLSearchParams({ page, limit })
      const result = await requestJson(`/allquestions?${params.toString()}`, { auth: true })
      return {
        questions: Array.isArray(result?.questions) ? result.questions : [],
        page: result?.page ?? page,
        totalPages: result?.totalPages ?? 1,
      }
    },
    [requestJson],
  )

  const searchQuestions = useCallback(
    async ({ text = '', category, difficulty, tag, sort = 'recent', page = 1, limit = 20 } = {}) => {
      const params = new URLSearchParams({ text, sort, page, limit })
      if (category) params.set('category', category)
      if (difficulty) params.set('difficulty', difficulty)
      if (tag) params.set('tag', tag)
      const result = await requestJson(`/allquestions/search?${params.toString()}`, { auth: true })
      return {
        questions: Array.isArray(result?.questions) ? result.questions : [],
        total: result?.total ?? 0,
        page: result?.page ?? page,
        totalPages: result?.totalPages ?? 1,
      }
    },
    [requestJson],
  )

  const updateQuestion = useCallback(
    async (id, payload) => {
      if (!id) throw new Error('Question id is required')
      return requestJson(`/allquestions/${id}`, { method: 'PUT', auth: true, body: payload })
    },
    [requestJson],
  )

  const deleteQuestion = useCallback(
    async (id) => {
      if (!id) throw new Error('Question id is required')
      return requestJson(`/allquestions/${id}`, { method: 'DELETE', auth: true })
    },
    [requestJson],
  )

  const loadProfiles = useCallback(async () => {
    if (session.type !== 'admin') return
    try {
      const result = await requestJson('/admin/profiles', { auth: true })
      setProfiles({
        teams: Array.isArray(result?.teams)
          ? result.teams.map((team) => ({ ...team, avatarUrl: normalizeAvatar(team.avatarUrl) }))
          : [],
        moderators: Array.isArray(result?.moderators)
          ? result.moderators.map((mod) => ({ ...mod, avatarUrl: normalizeAvatar(mod.avatarUrl) }))
          : [],
      })
    } catch (error) {
      console.error('Failed to load profiles', error)
    }
  }, [normalizeAvatar, requestJson, session.type])

  const setProfilePassword = useCallback(
    async (type, id, password) => {
      const endpoint =
        type === 'team' ? `/admin/teams/${id}/password` : `/admin/moderators/${id}/password`
      await requestJson(endpoint, { method: 'POST', auth: true, body: { password } })
      await loadProfiles()
    },
    [loadProfiles, requestJson],
  )

  const uploadAvatar = useCallback(
    async (data) => {
      const body =
        typeof data === 'string'
          ? { data }
          : data?.data
            ? { data: data.data }
            : null
      if (!body) throw new Error('No avatar data provided')
      const result = await requestJson('/profile/avatar', { method: 'POST', auth: true, body })
      const rawUrl = result?.url
      if (!rawUrl) return null
      const absoluteUrl = normalizeAvatar(rawUrl)

      if (session.type === 'team' && session.teamId) {
        setTeams((prev) => prev.map((team) => (team.id === session.teamId ? { ...team, avatarUrl: absoluteUrl } : team)))
        setProfiles((prev) => ({
          ...prev,
          teams: prev.teams.map((team) => (team.id === session.teamId ? { ...team, avatarUrl: absoluteUrl } : team)),
        }))
      } else if (session.type === 'moderator' && session.moderatorId) {
        setModerators((prev) =>
          prev.map((mod) => (mod.id === session.moderatorId ? { ...mod, avatarUrl: absoluteUrl } : mod)),
        )
        setProfiles((prev) => ({
          ...prev,
          moderators: prev.moderators.map((mod) =>
            mod.id === session.moderatorId ? { ...mod, avatarUrl: absoluteUrl } : mod,
          ),
        }))
      }

      return absoluteUrl
    },
    [API_BASE, requestJson, session.moderatorId, session.teamId, session.type],
  )
  const fetchArchives = useCallback(async () => {
    const result = await requestJson('/admin/tournaments', { auth: true })
    const tournaments = Array.isArray(result?.tournaments) ? result.tournaments : []
    const completed = tournaments.filter((item) => item.status === 'completed')
    setArchivedTournaments(completed)
    return completed
  }, [requestJson])

  const deleteTournamentArchive = useCallback(
    async (tournamentId) => {
      const result = await requestJson(`/admin/tournaments/${tournamentId}`, { method: 'DELETE', auth: true })
      setArchivedTournaments((prev) => prev.filter((item) => item.id !== tournamentId))
      return result
    },
    [requestJson],
  )

  const deleteCurrentTournament = useCallback(async () => {
    const tournamentId = tournament?.backendId || tournament?.id
    if (!tournamentId) return
    const confirmed = window.confirm(
      'Delete the current tournament? This will remove live matches and match history.',
    )
    if (!confirmed) return
    await requestJson(`/admin/tournaments/${tournamentId}`, { method: 'DELETE', auth: true })
    finalizedMatchesRef.current = new Set()
    setActiveMatches([])
    setMatchHistory([])
    setRecentResult(null)
    setTournament(null)
    setTournamentLaunched(false)
  }, [requestJson, tournament?.backendId, tournament?.id])
  const loadAdminData = useCallback(async () => {
    if (session.type !== 'admin') return null

    const [teamResult, moderatorResult, teamRegResult, moderatorRegResult] = await Promise.all([
      requestJson('/admin/teams', { auth: true }),
      requestJson('/admin/moderators', { auth: true }),
      requestJson('/admin/registrations/teams', { auth: true }),
      requestJson('/admin/registrations/moderators', { auth: true }),
    ])

    setTeams((previous) => {
      const previousMap = new Map(previous.map((team) => [team.id, team]))
      return (teamResult?.teams ?? []).map((team) => {
        const normalized = normalizeTeamRecord(team)
        const existing = previousMap.get(normalized.id)
        return existing
          ? {
            ...normalized,
            wins: existing.wins ?? normalized.wins,
            losses: existing.losses ?? normalized.losses,
            totalScore: existing.totalScore ?? normalized.totalScore,
            eliminated: existing.eliminated ?? normalized.eliminated,
          }
          : normalized
      })
    })

    setModerators((previous) => {
      const previousMap = new Map(previous.map((record) => [record.id, record]))
      return (moderatorResult?.moderators ?? []).map((record) => {
        const normalized = normalizeModeratorRecord(record)
        const existing = previousMap.get(normalized.id)
        return existing ? { ...existing, ...normalized } : normalized
      })
    })

    setTeamRegistrations(teamRegResult?.registrations ?? [])
    setModeratorRegistrations(moderatorRegResult?.registrations ?? [])

    return true
  }, [requestJson, session.type])

  const hydrateApprovedRosters = useCallback(async () => {
    const [teamResult, moderatorResult] = await Promise.all([
      requestJson('/public/teams').catch(() => null),
      requestJson('/public/moderators').catch(() => null),
    ])

    if (Array.isArray(teamResult?.teams) && teamResult.teams.length > 0) {
      setTeams((previous) => {
        const previousMap = new Map(previous.map((team) => [team.id, team]))
        return teamResult.teams
          .map((team) => normalizeTeamRecord({ ...team, avatarUrl: normalizeAvatar(team.avatarUrl) }))
          .filter(Boolean)
          .map((team) => {
            const existing = previousMap.get(team.id)
            return existing
              ? {
                ...team,
                wins: existing.wins ?? team.wins,
                losses: existing.losses ?? team.losses,
                totalScore: existing.totalScore ?? team.totalScore,
                eliminated: existing.eliminated ?? team.eliminated,
              }
              : team
          })
      })
    }

    if (Array.isArray(moderatorResult?.moderators) && moderatorResult.moderators.length > 0) {
      setModerators((previous) => {
        const previousMap = new Map(previous.map((record) => [record.id, record]))
        return moderatorResult.moderators
          .map((record) => normalizeModeratorRecord(record))
          .filter(Boolean)
          .map((record) => {
            const existing = previousMap.get(record.id)
            return existing ? { ...existing, ...record } : record
          })
      })
    }
  }, [requestJson])

  const hydrateLatestTournament = useCallback(async () => {
    try {
      const result = await requestJson('/public/tournaments')
      const list = Array.isArray(result?.tournaments) ? result.tournaments : []
      if (!list.length) return null
      const latest = list[0]
      return applyTournamentFromApi(latest)
    } catch (error) {
      console.error('Failed to hydrate tournament from API', error)
      return null
    }
  }, [applyTournamentFromApi, requestJson])

  const hydrateMatchHistory = useCallback(async () => {
    if (!session?.token) return
    try {
      const currentTournamentId = tournament?.backendId || tournament?.id || null
      const params = new URLSearchParams({ limit: '200' })
      if (currentTournamentId) {
        params.set('tournamentId', currentTournamentId)
      }
      const result = await requestJson(`/matches/history?${params.toString()}`, { auth: true })
      const matches = Array.isArray(result?.matches) ? result.matches : []
      const dedupeMap = new Map()
      matches.forEach((match) => {
        const key = match?.tournamentMatchId || match?.id
        if (!dedupeMap.has(key)) {
          dedupeMap.set(key, match)
        }
      })
      const deduped = Array.from(dedupeMap.values())
      const sorted = deduped.sort(
        (left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0),
      )
      setMatchHistory(sorted)
    } catch (error) {
      console.error('Failed to hydrate match history; using local history', error)
    }
  }, [requestJson, session?.token, tournament?.backendId, tournament?.id])

  const hydrateLiveMatchesFromBackend = useCallback(async () => {
    if (!tournament?.matches) return
    const missing = Object.values(tournament.matches).filter(
      (match) =>
        match.matchRefId &&
        match.status !== 'completed' &&
        !activeMatches.some((live) => live.id === match.matchRefId),
    )
    if (!missing.length) return
    for (const match of missing) {
      try {
        const result = await requestJson(`/live-matches/${match.matchRefId}`, { auth: true })
        if (result?.match) {
          upsertActiveMatch(result.match)
          joinLiveMatchRoom(result.match.id)
        }
      } catch (error) {
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          const deadId = match.matchRefId
          setActiveMatches((prev) => prev.filter((m) => m.id !== deadId))
        }
      }
    }
  }, [activeMatches, joinLiveMatchRoom, requestJson, tournament?.matches])

  const loadAnalytics = useCallback(async () => {
    if (session.type !== 'admin') return
    try {
      const [questionsResult, historyResult] = await Promise.all([
        requestJson('/analytics/questions', { auth: true }),
        requestJson('/analytics/questions/history', { auth: true }),
      ])
      setAnalyticsSummary(questionsResult?.summary ?? null)
      setAnalyticsQuestions(Array.isArray(questionsResult?.questions) ? questionsResult.questions : [])
      setAnalyticsQuestionHistory(Array.isArray(historyResult?.history) ? historyResult.history : [])
    } catch (error) {
      console.error('Failed to load analytics', error)
    }
  }, [requestJson, session.type])

  const approveTeamRegistration = useCallback(
    async (registrationId) => {
      const result = await requestJson(`/admin/registrations/${registrationId}/approve`, {
        method: 'POST',
        auth: true,
      })
      if (result?.team) {
        upsertTeamRecord(result.team)
      }
      if (result?.registration) {
        setTeamRegistrations((previous) => {
          const filtered = previous.filter((entry) => entry.id !== result.registration.id)
          return [...filtered, result.registration]
        })
      }
      return result
    },
    [requestJson, upsertTeamRecord],
  )

  const approveModeratorRegistration = useCallback(
    async (registrationId) => {
      const result = await requestJson(`/admin/registrations/moderators/${registrationId}/approve`, {
        method: 'POST',
        auth: true,
      })
      if (result?.moderator) {
        upsertModeratorRecord(result.moderator)
      }
      if (result?.registration) {
        setModeratorRegistrations((previous) => {
          const filtered = previous.filter((entry) => entry.id !== result.registration.id)
          return [...filtered, result.registration]
        })
      }
      return result
    },
    [requestJson, upsertModeratorRecord],
  )

  const deleteTeamAccount = useCallback(
    async (teamId) => {
      const result = await requestJson(`/admin/teams/${teamId}`, { method: 'DELETE', auth: true })

      setTeams((previous) => previous.filter((team) => team.id !== teamId))
      setSelectedTeamIds((previous) => previous.filter((id) => id !== teamId))
      setActiveMatches((previous) => previous.filter((match) => !(match.teams || []).includes(teamId)))

      await loadAdminData()
      return result
    },
    [loadAdminData, requestJson],
  )

  const deleteModeratorAccount = useCallback(
    async (moderatorId) => {
      const result = await requestJson(`/admin/moderators/${moderatorId}`, { method: 'DELETE', auth: true })

      setModerators((previous) => previous.filter((moderator) => moderator.id !== moderatorId))
      setActiveMatches((previous) => previous.filter((match) => match.moderatorId !== moderatorId))

      await loadAdminData()
      return result
    },
    [loadAdminData, requestJson],
  )

  const deleteProfileTeam = useCallback(
    async (teamId) => {
      await deleteTeamAccount(teamId)
      setProfiles((prev) => ({
        ...prev,
        teams: prev.teams.filter((team) => team.id !== teamId),
      }))
    },
    [deleteTeamAccount],
  )
  const deleteProfileModerator = useCallback(
    async (moderatorId) => {
      await deleteModeratorAccount(moderatorId)
      setProfiles((prev) => ({
        ...prev,
        moderators: prev.moderators.filter((mod) => mod.id !== moderatorId),
      }))
    },
    [deleteModeratorAccount],
  )

  const handleLogout = useCallback(async () => {
    const token = session?.token

    if (token) {
      try {
        await requestJson('/auth/logout', { method: 'POST', auth: true, token })
      } catch (error) {
        console.error('Failed to log out', error)
      }
    }

    setSession({ type: 'guest' })
    setAuthError(null)
    setTeamRegistrations([])
    setModeratorRegistrations([])
    clearStoredSession()
    navigate('/', { replace: true })
  }, [clearStoredSession, navigate, requestJson, session?.token])

  useEffect(() => {
    if (rosterHydratedRef.current) return
    rosterHydratedRef.current = true

    hydrateApprovedRosters()
      .then(() => hydrateLatestTournament())
      .catch((error) => {
        console.error('Failed to hydrate approved rosters', error)
      })
  }, [hydrateApprovedRosters, hydrateLatestTournament])

  useEffect(() => {
    const socket = ensureSocket()
    return () => {
      if (socket) {
        socket.removeAllListeners()
        socket.close()
      }
      socketRef.current = null
    }
  }, [ensureSocket])

  useEffect(() => {
    const socket = ensureSocket()
    if (!socket) return
    if (socket.connected) {
      activeMatches.forEach((match) => socket.emit('liveMatch:join', { matchId: match.id }))
    }
  }, [activeMatches, ensureSocket])

  useEffect(() => {
    const socket = socketRef.current
    if (socket?.connected) {
      socket.emit('tournament:subscribe')
    }
  }, [tournament?.backendId])

  useEffect(() => {
    if (session.type !== 'admin') return
    loadAdminData().catch((error) => {
      console.error('Failed to refresh admin data', error)
    })
  }, [session.type, loadAdminData])

  useEffect(() => {
    if (session.type === 'guest') return
    hydrateMatchHistory().catch((error) => {
      console.error('Failed to refresh match history', error)
    })
  }, [hydrateMatchHistory, session.type])

  useEffect(() => {
    hydrateLiveMatchesFromBackend()
  }, [hydrateLiveMatchesFromBackend])

  // On socket reconnect, rejoin rooms and refetch active live matches to catch up timers/state
  useEffect(() => {
    const socket = ensureSocket()
    if (!socket) return
    const handleReconnect = () => {
      const active = activeMatchesRef.current || []
      active.forEach((match) => {
        socket.emit('liveMatch:join', { matchId: match.id })
        requestJson(`/live-matches/${match.id}`, { auth: true })
          .then((result) => {
            if (result?.match) {
              upsertActiveMatch(result.match)
            }
          })
          .catch(() => {
            // ignore errors; match may be completed/removed
          })
      })
    }
    socket.on('connect', handleReconnect)
    return () => {
      socket.off('connect', handleReconnect)
    }
  }, [ensureSocket, requestJson, upsertActiveMatch])

  useEffect(() => {
    if (session.type !== 'admin') return
    loadAnalytics()
    loadProfiles()
  }, [loadAnalytics, loadProfiles, session.type])

  useEffect(() => {
    const streamUrl = withApiBase('/public/tournaments/stream')
    const source = new EventSource(streamUrl)
    eventSourceRef.current = source
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        applyTournamentFromApi(payload)
      } catch (error) {
        console.error('Failed to parse tournament stream payload', error)
      }
    }
    source.onerror = (error) => {
      console.error('Tournament stream encountered an error', error)
    }
    return () => {
      source.close()
      eventSourceRef.current = null
    }
  }, [applyTournamentFromApi, withApiBase])

  useEffect(() => {
    if (!tournamentLaunched || !tournament) {
      return
    }
    if (session.type !== 'admin') {
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

    const launchMatches = async () => {
      for (const bracketMatch of matchesToLaunch) {
        if (liveMatchCreationRef.current.has(bracketMatch.id)) {
          continue
        }
        liveMatchCreationRef.current.add(bracketMatch.id)
        const [teamAId, teamBId] = bracketMatch.teams

        if (tournament.backendId && session?.token) {
          try {
            const createResult = await postJson(
              '/live-matches',
              {
                teamAId,
                teamBId,
                tournamentMatchId: bracketMatch.id,
                tournamentId: tournament.backendId,
                moderatorId: bracketMatch.moderatorId ?? null,
              },
              { auth: true },
            )

            const liveMatch = createResult?.match
            if (liveMatch) {
              upsertActiveMatch(liveMatch)
              joinLiveMatchRoom(liveMatch.id)

              try {
                const attachResult = await postJson(
                  `/tournaments/${tournament.backendId}/matches/${bracketMatch.id}/attach`,
                  { liveMatchId: liveMatch.id },
                  { auth: true },
                )
                if (attachResult?.tournament) {
                  applyTournamentFromApi(attachResult.tournament)
                } else {
                  setTournament((previous) =>
                    previous ? attachLiveMatch(previous, bracketMatch.id, liveMatch.id) : previous,
                  )
                }
              } catch (error) {
                console.error('Failed to attach live match to tournament; keeping local state', error)
                setTournament((previous) =>
                  previous ? attachLiveMatch(previous, bracketMatch.id, liveMatch.id) : previous,
                )
              }
              continue
            }
          } catch (error) {
            console.error('Failed to create live match via API; falling back to local creation', error)
            liveMatchCreationRef.current.delete(bracketMatch.id)
          }
        }

        const liveMatchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const liveMatch = createLiveMatch(teamAId, teamBId, {
          id: liveMatchId,
          tournamentMatchId: bracketMatch.id,
          moderatorId: bracketMatch.moderatorId ?? null,
        })
        upsertActiveMatch(liveMatch)
        joinLiveMatchRoom(liveMatch.id)
        setTournament((previous) => (previous ? attachLiveMatch(previous, bracketMatch.id, liveMatch.id) : previous))
      }
    }

    launchMatches()
  }, [activeMatches, applyTournamentFromApi, postJson, session?.token, tournament, tournamentLaunched])

  // Moderators: ensure their assigned matches are created/attached if admin is offline
  useEffect(() => {
    if (!tournamentLaunched || !tournament) return
    if (session.type !== 'moderator' || !activeModerator) return

    const assignedMatches = Object.values(tournament.matches ?? {}).filter(
      (match) =>
        match.moderatorId === activeModerator.id &&
        match.status !== 'completed' &&
        match.teams?.every((teamId) => Boolean(teamId)) &&
        !match.matchRefId,
    )
    if (!assignedMatches.length) return

    const ensureMatches = async () => {
      for (const bracketMatch of assignedMatches) {
        if (liveMatchCreationRef.current.has(bracketMatch.id)) continue
        liveMatchCreationRef.current.add(bracketMatch.id)
        const [teamAId, teamBId] = bracketMatch.teams
        try {
          const createResult = await postJson(
            '/live-matches',
            {
              teamAId,
              teamBId,
              tournamentMatchId: bracketMatch.id,
              tournamentId: tournament.backendId,
              moderatorId: bracketMatch.moderatorId ?? activeModerator.id,
            },
            { auth: true },
          )
          const liveMatch = createResult?.match
          if (liveMatch) {
            upsertActiveMatch(liveMatch)
            joinLiveMatchRoom(liveMatch.id)
            try {
              const attachResult = await postJson(
                `/tournaments/${tournament.backendId}/matches/${bracketMatch.id}/attach`,
                { liveMatchId: liveMatch.id },
                { auth: true },
              )
              if (attachResult?.tournament) {
                applyTournamentFromApi(attachResult.tournament)
              } else {
                setTournament((previous) =>
                  previous ? attachLiveMatch(previous, bracketMatch.id, liveMatch.id) : previous,
                )
              }
            } catch (error) {
              console.error('Moderator failed to attach live match; keeping local state', error)
              setTournament((previous) =>
                previous ? attachLiveMatch(previous, bracketMatch.id, liveMatch.id) : previous,
              )
            }
          }
        } catch (error) {
          console.error('Moderator failed to create live match; will retry if needed', error)
          liveMatchCreationRef.current.delete(bracketMatch.id)
        }
      }
    }

    ensureMatches()
  }, [activeModerator, joinLiveMatchRoom, postJson, tournament, tournamentLaunched, session.type, upsertActiveMatch])

  const handleLaunchTournament = async () => {
    if (!tournament) return

    if (tournament.backendId && session.type === 'admin') {
      try {
        const result = await postJson(`/tournaments/${tournament.backendId}/launch`, {}, { auth: true })
        if (result?.tournament) {
          applyTournamentFromApi(result.tournament)
          return
        }
      } catch (error) {
        console.error('Failed to launch tournament via API; keeping local state', error)
      }
    }

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

        return unchanged ? previous : orderedSelection
      })
    },
    [teams, tournament, tournamentLaunched],
  )

  const handleMatchMaking = useCallback(() => {
    if (tournamentLaunched && tournament?.status !== 'completed') {
      return
    }

    const availableIds = teams.map((team) => team.id)
    if (availableIds.length < MIN_TOURNAMENT_TEAM_COUNT) {
      return
    }

    const minimumRequired = Math.min(MIN_TOURNAMENT_TEAM_COUNT, availableIds.length)
    if (selectedTeamIds.length < minimumRequired) {
      return
    }

    const orderedRoster = new Map(teams.map((team, index) => [team.id, index]))
    const seededIds = [...selectedTeamIds]
      .filter((id) => orderedRoster.has(id))
      .sort((left, right) => (orderedRoster.get(left) ?? 0) - (orderedRoster.get(right) ?? 0))
      .slice(0, Math.min(TOURNAMENT_TEAM_LIMIT, selectedTeamIds.length))
    const seededSet = new Set(seededIds)
    const seededTeams = teams.filter((team) => seededSet.has(team.id))

    if (!seededTeams.length) {
      return
    }

    const resetTeams = () =>
      setTeams((previous) =>
        previous.map((team) => ({
          ...team,
          wins: 0,
          losses: 0,
          totalScore: 0,
          eliminated: false,
        })),
      )

    const resetProgress = () => {
      finalizedMatchesRef.current = new Set()
      setActiveMatches([])
      setMatchHistory([])
      setRecentResult(null)
      setTournamentLaunched(false)
    }

    const createTournamentViaApi = async () => {
      try {
        const result = await postJson(
          '/tournaments',
          {
            teamIds: seededTeams.map((team) => team.id),
            moderatorIds: moderators.map((moderator) => moderator.id),
            name: `Tournament ${new Date().toLocaleDateString()}`,
          },
          { auth: true },
        )
        if (result?.tournament) {
          resetProgress()
          resetTeams()
          rosterSeedKeyRef.current = createSelectionKey(seededIds)
          const mapped = applyTournamentFromApi(result.tournament)
          if (!mapped) {
            setTournament(null)
          }
          return mapped
        }
      } catch (error) {
        console.error('Failed to create tournament via API; falling back to local engine', error)
      }
      return null
    }

    const fallbackLocalTournament = () => {
      const nextTournament = initializeTournament(seededTeams, moderators)
      rosterSeedKeyRef.current = createSelectionKey(seededIds)
      resetProgress()
      resetTeams()
      setTournament(nextTournament)
      return nextTournament
    }

    if (session.type === 'admin') {
      createTournamentViaApi().then((created) => {
        if (!created) {
          fallbackLocalTournament()
        }
      })
    } else {
      fallbackLocalTournament()
    }
  }, [applyTournamentFromApi, moderators, postJson, selectedTeamIds, session.type, teams, tournamentLaunched])

  const handleGrantMatchBye = useCallback(
    async (matchId, teamId) => {
      if (!matchId || !teamId) {
        return
      }

      if (tournament?.backendId && session.type === 'admin') {
        try {
          const result = await requestJson(`/tournaments/${tournament.backendId}/matches/${matchId}/bye`, {
            method: 'POST',
            auth: true,
            body: { teamId },
          })
          if (result?.tournament) {
            applyTournamentFromApi(result.tournament)
            return result
          }
        } catch (error) {
          console.error('Failed to grant bye via API; falling back to local state', error)
        }
      }

      let result = null

      setTournament((previous) => {
        if (!previous) return previous
        const match = previous.matches?.[matchId]
        if (!match || match.status === 'completed') {
          return previous
        }

        const [teamAId, teamBId] = match.teams
        if (!teamAId || !teamBId) {
          return previous
        }

        if (teamId !== teamAId && teamId !== teamBId) {
          return previous
        }

        const opponentId = teamId === teamAId ? teamBId : teamAId
        result = {
          matchId,
          winnerId: teamId,
          loserId: opponentId,
          teams: match.teams,
        }

        return grantMatchBye(previous, matchId, teamId)
      })

      if (!result) {
        return
      }

      const { matchId: completedMatchId, winnerId, loserId, teams: matchTeams } = result

      setTeams((previous) =>
        previous.map((team) => {
          if (team.id === winnerId) {
            return { ...team, wins: team.wins + 1 }
          }

          if (team.id === loserId) {
            const losses = team.losses + 1
            return { ...team, losses, eliminated: losses >= 2 }
          }

          return team
        }),
      )

      setActiveMatches((previous) =>
        previous.filter((liveMatch) => liveMatch.tournamentMatchId !== completedMatchId),
      )

      setMatchHistory((previous) => {
        if (previous.some((item) => item.id === completedMatchId)) {
          return previous
        }

        const scores = { [winnerId]: 0, [loserId]: 0 }
        return [
          {
            id: completedMatchId,
            tournamentMatchId: completedMatchId,
            teams: matchTeams,
            scores,
            winnerId,
            loserId,
            completedAt: new Date().toISOString(),
            note: 'bye-awarded',
          },
          ...previous,
        ]
      })

      const winnerName = teams.find((team) => team.id === winnerId)?.name ?? 'Team'
      const loserName = teams.find((team) => team.id === loserId)?.name ?? 'opponent'

      setRecentResult({
        matchId: completedMatchId,
        winnerId,
        summary: `${winnerName} advanced by bye over ${loserName}.`,
      })
      return result
    },
    [applyTournamentFromApi, requestJson, session.type, teams, tournament?.backendId],
  )

  const handleFlipCoin = (matchId, options = {}) => {
    const { moderatorId } = options
    const match = activeMatches.find((item) => item.id === matchId)
    const useSocket = Boolean(match && (tournament?.backendId || match?.tournamentId))

    if (useSocket) {
      joinLiveMatchRoom(matchId)
      const socket = ensureSocket()
      // Optimistically show the flip animation while the server resolves the result.
      coinFlipAnimRef.current.set(matchId, Date.now())
      setActiveMatches((previous) =>
        previous.map((item) =>
          item.id === matchId
            ? {
              ...item,
              coinToss: { ...item.coinToss, status: 'flipping', resultFace: null, winnerId: null },
            }
            : item,
        ),
      )
      socket?.emit('liveMatch:coinToss', { matchId })
      return
    }

    setActiveMatches((previousMatches) => {
      const targetMatch = previousMatches.find((item) => item.id === matchId)

      if (!targetMatch || targetMatch.coinToss.status !== 'ready') {
        return previousMatches
      }

      if (targetMatch.moderatorId && targetMatch.moderatorId !== moderatorId) {
        return previousMatches
      }

      const [teamAId, teamBId] = targetMatch.teams
      const resultFace = Math.random() < 0.5 ? 'heads' : 'tails'
      const winnerId = resultFace === 'heads' ? teamAId : teamBId

      const updatedMatches = previousMatches.map((item) => {
        if (item.id !== matchId) {
          return item
        }

        return {
          ...item,
          coinToss: {
            ...item.coinToss,
            status: 'flipping',
            winnerId: null,
            resultFace,
          },
        }
      })

      setTimeout(() => {
        setActiveMatches((matches) =>
          matches.map((item) => {
            if (item.id !== matchId) {
              return item
            }

            if (item.coinToss.status !== 'flipping') {
              return item
            }

            return {
              ...item,
              coinToss: {
                ...item.coinToss,
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
    const match = activeMatches.find((item) => item.id === matchId)
    const useSocket = Boolean(match && (tournament?.backendId || match?.tournamentId))

    if (useSocket) {
      joinLiveMatchRoom(matchId)
      const socket = ensureSocket()
      socket?.emit('liveMatch:decideFirst', { matchId, deciderId, firstTeamId })
      return
    }

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
    const match = activeMatches.find((item) => item.id === matchId)
    const useSocket = Boolean(match && (tournament?.backendId || match?.tournamentId))
    if (useSocket) {
      joinLiveMatchRoom(matchId)
      const socket = ensureSocket()
      socket?.emit('liveMatch:pause', { matchId })
      return
    }
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
    const match = activeMatches.find((item) => item.id === matchId)
    const useSocket = Boolean(match && (tournament?.backendId || match?.tournamentId))
    if (useSocket) {
      joinLiveMatchRoom(matchId)
      const socket = ensureSocket()
      socket?.emit('liveMatch:resume', { matchId })
      return
    }
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
    const match = activeMatches.find((item) => item.id === matchId)
    const useSocket = Boolean(match && (tournament?.backendId || match?.tournamentId))
    if (useSocket) {
      joinLiveMatchRoom(matchId)
      const socket = ensureSocket()
      socket?.emit('liveMatch:reset', { matchId })
      return
    }
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
    async (match) => {
      if (finalizedMatchesRef.current.has(match.id)) {
        return
      }

      finalizedMatchesRef.current.add(match.id)

      const [teamAId, teamBId] = match.teams
      const normalizeScoreValue = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string' && value.trim() !== '') {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : 0
        }
        if (value && typeof value === 'object') {
          if ('$numberInt' in value) {
            const parsed = Number(value.$numberInt)
            return Number.isFinite(parsed) ? parsed : 0
          }
          if ('$numberDouble' in value) {
            const parsed = Number(value.$numberDouble)
            return Number.isFinite(parsed) ? parsed : 0
          }
        }
        return 0
      }
      const teamAScore = normalizeScoreValue(match.scores?.[teamAId])
      const teamBScore = normalizeScoreValue(match.scores?.[teamBId])
      const normalizedScores = {
        ...match.scores,
        [teamAId]: teamAScore,
        [teamBId]: teamBScore,
      }
      const winnerId = teamAScore === teamBScore ? null : teamAScore > teamBScore ? teamAId : teamBId
      const loserId = winnerId ? (winnerId === teamAId ? teamBId : teamAId) : null

      const record = {
        id: match.tournamentMatchId ?? match.id,
        tournamentMatchId: match.tournamentMatchId ?? null,
        teams: match.teams,
        scores: normalizedScores,
        winnerId,
        loserId,
        completedAt: new Date().toISOString(),
      }

      const applyLocalUpdate = () => {
        setTeams((previous) =>
          previous.map((team) => {
            if (!match.teams.includes(team.id)) {
              return team
            }

            const updatedScore = team.totalScore + normalizeScoreValue(match.scores?.[team.id])

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
                scores: normalizedScores,
              })
            }
            return detachLiveMatch(nextState, match.tournamentMatchId)
          })
        }
      }

      if (tournament?.backendId && session.type === 'admin' && match.tournamentMatchId) {
        try {
          const result = await requestJson(
            `/tournaments/${tournament.backendId}/matches/${match.tournamentMatchId}/result`,
            {
              method: 'POST',
              auth: true,
              body: {
                winnerId,
                loserId,
                scores: match.scores,
              },
            },
          )
          if (result?.tournament) {
            applyTournamentFromApi(result.tournament)
          } else {
            applyLocalUpdate()
          }
        } catch (error) {
          console.error('Failed to persist match result via API; falling back to local state', error)
          applyLocalUpdate()
        }
      } else {
        applyLocalUpdate()
      }

      const teamAName = teams.find((team) => team.id === teamAId)?.name ?? 'Team A'
      const teamBName = teams.find((team) => team.id === teamBId)?.name ?? 'Team B'

      const summary = winnerId
        ? `${teams.find((team) => team.id === winnerId)?.name} defeated ${teams.find((team) => team.id === (winnerId === teamAId ? teamBId : teamAId))?.name
        } ${teamAScore}-${teamBScore}`
        : `Match tied ${teamAName} ${teamAScore} - ${teamBName} ${teamBScore}`

      setRecentResult({
        matchId: match.id,
        winnerId,
        summary,
      })
    },
    [applyTournamentFromApi, requestJson, session.type, teams, tournament?.backendId],
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
          if (match.tournamentId) {
            updated.push(match)
            return updated
          }
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

  const handleTeamAnswer = (matchId, teamId, selectedOption, questionInstanceId) => {
    const match = activeMatches.find((item) => item.id === matchId)
    const useSocket = Boolean(match && (tournament?.backendId || match?.tournamentId))
    if (useSocket) {
      joinLiveMatchRoom(matchId)
      const socket = ensureSocket()
      socket?.emit(
        'liveMatch:answer',
        { matchId, teamId, answerKey: selectedOption, questionInstanceId },
        (response) => {
          if (!response || response.ok) return
          if (response.reason === 'late' || response.reason === 'stale') {
            setTeamAnswerToast({ message: 'Too late - answer missed the deadline.', ts: Date.now() })
            setTimeout(() => setTeamAnswerToast(null), 2500)
          }
        },
      )
      return
    }
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

        const questionQueue = Array.isArray(match.questionQueue) ? match.questionQueue : []
        const question = questionQueue[match.questionIndex]

        if (questionInstanceId && question?.instanceId && questionInstanceId !== question.instanceId) {
          updated.push(match)
          return updated
        }

        if (!question) {
          // If we ran out of questions, finalize the match to avoid blank prompts.
          completedMatch = { ...match, status: 'completed', activeTeamId: null }
          return updated
        }

        const isCorrect =
          question.correctAnswerKey === selectedOption ||
          question.answer === selectedOption ||
          question.answers?.some((option) => option.text === selectedOption && option.key === question.correctAnswerKey)

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
    return
  }

  const handleDismissRecent = () => setRecentResult(null)

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              teams={teams}
              onTeamLogin={(loginId, password) =>
                handleTeamLogin(loginId, password, { redirectTo: '/team' })
              }
              onAdminLogin={(loginId, password) =>
                handleAdminLogin(loginId, password, { redirectTo: '/admin' })
              }
              onModeratorLogin={(loginId, password) =>
                handleModeratorLogin(loginId, password, { redirectTo: '/moderator' })
              }
              authError={authError}
              onClearAuthError={() => setAuthError(null)}
              onTeamRegister={handleTeamRegistration}
              onModeratorRegister={handleModeratorRegistration}
              onTeamForgotPassword={handleTeamForgotPassword}
              onModeratorForgotPassword={handleModeratorForgotPassword}
            />
          }
        />
        <Route
          path="/howtoplay"
          element={
            <LearnToPlay
              teams={teams}
              onTeamLogin={(loginId, password) => handleTeamLogin(loginId, password, { redirectTo: '/team' })}
              onAdminLogin={(loginId, password) => handleAdminLogin(loginId, password, { redirectTo: '/admin' })}
              onModeratorLogin={(loginId, password) => handleModeratorLogin(loginId, password, { redirectTo: '/moderator' })}
              authError={authError}
              onClearAuthError={() => setAuthError(null)}
              onTeamRegister={handleTeamRegistration}
              onModeratorRegister={handleModeratorRegistration}
              onTeamForgotPassword={handleTeamForgotPassword}
              onModeratorForgotPassword={handleModeratorForgotPassword}
            />
          }
        />
        <Route
          path="/tournament"
          element={
            <PublicTournamentPage
              tournament={tournament}
              teams={teams}
              activeMatches={activeMatches}
              moderators={moderators}
              history={matchHistory}
            />
          }
        />
        <Route
          path="/tournament/match/:matchId"
          element={
            <PublicMatchViewer matches={activeMatches} teams={teams} moderators={moderators} />
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage onResetPassword={handleResetPassword} />} />
        <Route
          path="/login"
          element={
            <LoginPage
              authError={authError}
              onTeamLogin={handleTeamLogin}
              onAdminLogin={handleAdminLogin}
              onModeratorLogin={handleModeratorLogin}
              onTeamRegister={handleTeamRegistration}
              onModeratorRegister={handleModeratorRegistration}
              onTeamForgotPassword={handleTeamForgotPassword}
              onModeratorForgotPassword={handleModeratorForgotPassword}
              onBack={() => {
                setAuthError(null)
                navigate('/')
              }}
              session={session}
            />
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute isAllowed={session.type === 'admin'} redirectTo="/login?mode=admin">
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
                onDeleteTournament={deleteCurrentTournament}
                onPauseMatch={(matchId) => handlePauseMatch(matchId, { isAdmin: true })}
                onResumeMatch={(matchId) => handleResumeMatch(matchId, { isAdmin: true })}
                onResetMatch={(matchId) => handleResetMatch(matchId, { isAdmin: true })}
                onGrantBye={handleGrantMatchBye}
                onDismissRecent={handleDismissRecent}
                onLogout={handleLogout}
                teamRegistrations={teamRegistrations}
                moderatorRegistrations={moderatorRegistrations}
                onApproveTeamRegistration={approveTeamRegistration}
                onApproveModeratorRegistration={approveModeratorRegistration}
                onReloadData={loadAdminData}
                onDeleteTeam={deleteTeamAccount}
                onDeleteModerator={deleteModeratorAccount}
                analyticsSummary={analyticsSummary}
                analyticsQuestions={analyticsQuestions}
                analyticsQuestionHistory={analyticsQuestionHistory}
                onDownloadArchive={handleDownloadTournamentArchive}
                fetchArchives={fetchArchives}
                onDeleteTournamentArchive={deleteTournamentArchive}
                onImportQuestions={importQuestions}
                onFetchAllQuestions={fetchAllQuestions}
                onSearchQuestions={searchQuestions}
                onUpdateQuestion={updateQuestion}
                onDeleteQuestion={deleteQuestion}
                profiles={profiles}
                onSetProfilePassword={setProfilePassword}
                onDeleteTeamProfile={deleteTeamAccount}
                onDeleteModeratorProfile={deleteModeratorAccount}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/moderator"
          element={
            <ProtectedRoute isAllowed={session.type === 'moderator'} redirectTo="/login?mode=moderator">
              <ModeratorDashboard
                moderator={activeModerator}
                matches={activeMatches}
                teams={teams}
                tournament={tournament}
                moderators={moderators}
                socketConnected={socketConnected}
                onUploadAvatar={uploadAvatar}
                selectedTeamIds={selectedTeamIds}
                matchMakingLimit={TOURNAMENT_TEAM_LIMIT}
                tournamentLaunched={tournamentLaunched}
                resultToasts={moderatorResultToasts}
                onFlipCoin={(matchId) =>
                  handleFlipCoin(matchId, { moderatorId: activeModerator?.id })
                }
                onSelectFirst={(matchId, deciderId, firstTeamId) =>
                  handleSelectFirst(matchId, deciderId, firstTeamId, {
                    moderatorId: activeModerator?.id,
                  })
                }
                onPauseMatch={(matchId) => handlePauseMatch(matchId, { moderatorId: activeModerator?.id })}
                onResumeMatch={(matchId) => handleResumeMatch(matchId, { moderatorId: activeModerator?.id })}
                onResetMatch={(matchId) => handleResetMatch(matchId, { moderatorId: activeModerator?.id })}
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
              redirectTo="/login"
            >
              <TeamDashboard
                team={activeTeam}
                teams={teams}
                match={activeTeamMatch}
                history={matchHistory}
                tournament={tournament}
                tournamentLaunched={tournamentLaunched}
                moderators={moderators}
                resultToast={teamResultToast}
                answerToast={teamAnswerToast}
                onUploadAvatar={uploadAvatar}
                socketConnected={socketConnected}
                onAnswer={(matchId, option, questionInstanceId) =>
                  handleTeamAnswer(matchId, activeTeam.id, option, questionInstanceId)
                }
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
    </>
  )
}
