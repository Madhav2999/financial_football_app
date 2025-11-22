import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [selectedTeamIds, setSelectedTeamIds] = useState(() =>
    buildDefaultTeamSelection(INITIAL_TEAM_STATE.map(normalizeTeamRecord), TOURNAMENT_TEAM_LIMIT),
  )
  const [tournament, setTournament] = useState(null)
  const [tournamentLaunched, setTournamentLaunched] = useState(false)
  const [teamRegistrations, setTeamRegistrations] = useState([])
  const [moderatorRegistrations, setModeratorRegistrations] = useState([])
  const finalizedMatchesRef = useRef(new Set())
  const rosterSeedKeyRef = useRef('')
  const hydratingSessionRef = useRef(false)

  const navigate = useNavigate()

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

      const minimumRequired = Math.min(limit, MIN_TOURNAMENT_TEAM_COUNT)
      const canMeetMinimum = availableIds.length >= MIN_TOURNAMENT_TEAM_COUNT
      let nextSelection = filtered

      if (canMeetMinimum && filtered.length < minimumRequired) {
        const toAdd = rosterOrder
          .filter((id) => !filtered.includes(id))
          .slice(0, minimumRequired - filtered.length)
        nextSelection = [...filtered, ...toAdd]
      }

      const unchanged =
        nextSelection.length === previous.length &&
        nextSelection.every((id, index) => id === previous[index])

      return unchanged ? previous : nextSelection
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
    writeStoredSession(session)
  }, [session])

  const API_BASE = 'http://localhost:5000/api'

  const withApiBase = (path) => {
    if (!path) return API_BASE
    return path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  }

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
    if (session.type !== 'admin') return
    loadAdminData().catch((error) => {
      console.error('Failed to refresh admin data', error)
    })
  }, [session.type, loadAdminData])

  useEffect(() => {
    if (!tournamentLaunched || !tournament) {
      return
    }
    //already has live match ids
    const activeTournamentMatches = new Set(
      activeMatches
        .filter((match) => match.status !== 'completed' && match.tournamentMatchId)
        .map((match) => match.tournamentMatchId),
    )
    //scans every match defined on the current tournament and keeps only those that are ready to spin up a live matches .
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

  const handleGrantMatchBye = useCallback(
    (matchId, teamId) => {
      if (!matchId || !teamId) {
        return
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
    },
    [teams],
  )

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
        ? `${teams.find((team) => team.id === winnerId)?.name} defeated ${teams.find((team) => team.id === (winnerId === teamAId ? teamBId : teamAId))?.name
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

  return (
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
  )
}