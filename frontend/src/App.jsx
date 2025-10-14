import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AuthenticationGateway from './components/AuthenticationGateway'
import AdminDashboard from './components/AdminDashboard'
import LandingPage from './components/LandingPage'
import ModeratorDashboard from './components/ModeratorDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { initialTeams } from './data/teams'
import { questionBank } from './data/questions'
import { moderatorAccounts } from './data/moderators'
import TeamDashboard from './components/TeamDashboard'
import { initializeTournament, recordMatchResult, attachLiveMatch, detachLiveMatch } from './tournament/engine'

const QUESTIONS_PER_TEAM = 1
const ADMIN_CREDENTIALS = { loginId: 'admin', password: 'moderator' }
const SUPER_ADMIN_PROFILE = {
  name: 'Jordan Maxwell',
  email: 'super@financialfootball.com',
  phone: '+1 (555) 013-3700',
}
const MODERATOR_ACCOUNTS = moderatorAccounts

function buildInitialTeams() {
  return initialTeams.map((team) => ({
    ...team,
    wins: 0,
    losses: 0,
    totalScore: 0,
    eliminated: false,
  }))
}

function shuffleArray(array) {
  const items = [...array]
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
  }
  return items
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
  }

  if (nextIndex >= match.questionQueue.length) {
    return {
      completed: true,
      match: {
        ...base,
        status: 'completed',
      },
    }
  }

  return {
    completed: false,
    match: {
      ...base,
      status: 'in-progress',
      activeTeamId: match.assignedTeamOrder[nextIndex],
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
  const [teams, setTeams] = useState(buildInitialTeams)
  const [session, setSession] = useState({ type: 'guest' })
  const [activeMatches, setActiveMatches] = useState([])
  const [matchHistory, setMatchHistory] = useState([])
  const [recentResult, setRecentResult] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [tournament, setTournament] = useState(() => initializeTournament(teams, MODERATOR_ACCOUNTS))
  const [tournamentLaunched, setTournamentLaunched] = useState(false)
  const finalizedMatchesRef = useRef(new Set())

  const navigate = useNavigate()

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
    return MODERATOR_ACCOUNTS.find((account) => account.id === session.moderatorId) ?? null
  }, [session])

  const handleTeamLogin = (loginId, password, options = {}) => {
    const team = teams.find((item) => item.loginId === loginId)

    if (!team || team.password !== password) {
      setAuthError('Invalid team credentials. Please try again.')
      return
    }

    setSession({ type: 'team', teamId: team.id })
    setAuthError(null)
    navigate(options.redirectTo ?? '/team', { replace: true })
  }

  const handleAdminLogin = (loginId, password, options = {}) => {
    if (loginId !== ADMIN_CREDENTIALS.loginId || password !== ADMIN_CREDENTIALS.password) {
      setAuthError('Incorrect admin login details.')
      return
    }

    setSession({ type: 'admin' })
    setAuthError(null)
    navigate(options.redirectTo ?? '/admin', { replace: true })
  }

  const handleModeratorLogin = (loginId, password, options = {}) => {
    const moderator = MODERATOR_ACCOUNTS.find((item) => item.loginId === loginId)

    if (!moderator || moderator.password !== password) {
      setAuthError('Invalid moderator credentials. Please try again.')
      return
    }

    setSession({ type: 'moderator', moderatorId: moderator.id })
    setAuthError(null)
    navigate(options.redirectTo ?? '/moderator', { replace: true })
  }

  const handleLogout = () => {
    setSession({ type: 'guest' })
    setAuthError(null)
    navigate('/', { replace: true })
  }

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
    setTournamentLaunched((previous) => (previous ? previous : true))
  }

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

  const finalizeMatch = (match) => {
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
  }

  const scheduleFinalization = (match) => {
    if (!match) return

    const runFinalization = () => finalizeMatch(match)

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(runFinalization)
    } else {
      Promise.resolve().then(runFinalization)
    }
  }

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

        const question = match.questionQueue[match.questionIndex]
        const isCorrect = question.answer === selectedOption

        if (match.awaitingSteal) {
          const updatedScores = isCorrect
            ? {
                ...match.scores,
                [teamId]: match.scores[teamId] + 1,
              }
            : { ...match.scores }

          const { completed, match: nextMatch } = advanceMatchState(match, updatedScores)

          if (completed) {
            completedMatch = nextMatch
            return updated
          }

          updated.push(nextMatch)
          return updated
        }

        if (isCorrect) {
          const updatedScores = {
            ...match.scores,
            [teamId]: match.scores[teamId] + 1,
          }

          const { completed, match: nextMatch } = advanceMatchState(match, updatedScores)

          if (completed) {
            completedMatch = nextMatch
            return updated
          }

          updated.push(nextMatch)
          return updated
        }

        const opponentId = match.teams.find((id) => id !== teamId)
        updated.push({
          ...match,
          awaitingSteal: true,
          activeTeamId: opponentId,
        })
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

  const navigateToLogin = (mode = 'team') => {
    setAuthError(null)
    const modeParam = mode && mode !== 'team' ? `?mode=${mode}` : ''
    navigate(`/login${modeParam}`)
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            teams={teams}
            onEnter={() => navigateToLogin('team')}
            onAdminEnter={() => navigateToLogin('admin')}
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
              moderators={MODERATOR_ACCOUNTS}
              superAdmin={SUPER_ADMIN_PROFILE}
              tournamentLaunched={tournamentLaunched}
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
          <ProtectedRoute isAllowed={session.type === 'moderator'} redirectTo="/login?mode=moderator">
            <ModeratorDashboard
              moderator={activeModerator}
              matches={activeMatches}
              teams={teams}
              tournament={tournament}
              moderators={MODERATOR_ACCOUNTS}
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

function LoginPage({
  authError,
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  onBack,
  session,
}) {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const allowedModes = new Set(['team', 'admin', 'moderator'])
  const requestedModeParam = searchParams.get('mode') ?? 'team'
  const requestedMode = allowedModes.has(requestedModeParam) ? requestedModeParam : 'team'

  const fromLocation = location.state?.from
  const pathToMode = [
    ['/admin', 'admin'],
    ['/team', 'team'],
    ['/moderator', 'moderator'],
  ]

  let inferredMode = requestedMode
  if (fromLocation?.pathname) {
    const match = pathToMode.find(([prefix]) => fromLocation.pathname.startsWith(prefix))
    if (match) {
      inferredMode = match[1]
    }
  }

  const redirectTarget = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search ?? ''}${fromLocation.hash ?? ''}`
    : null

  if (session.type === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (session.type === 'team') {
    return <Navigate to="/team" replace />
  }

  if (session.type === 'moderator') {
    return <Navigate to="/moderator" replace />
  }

  return (
    <AuthenticationGateway
      initialMode={inferredMode}
      onTeamLogin={(loginId, password) =>
        onTeamLogin(loginId, password, { redirectTo: redirectTarget ?? '/team' })
      }
      onAdminLogin={(loginId, password) =>
        onAdminLogin(loginId, password, { redirectTo: redirectTarget ?? '/admin' })
      }
      onModeratorLogin={(loginId, password) =>
        onModeratorLogin(loginId, password, { redirectTo: redirectTarget ?? '/moderator' })
      }
      onBack={onBack}
      error={authError}
    />
  )
}