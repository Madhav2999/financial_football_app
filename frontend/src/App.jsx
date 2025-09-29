import { useMemo, useState } from 'react'
import AuthenticationGateway from './components/AuthenticationGateway'
import AdminDashboard from './components/AdminDashboard'
import TeamDashboard from './components/TeamDashboard'
import { initialTeams } from './data/teams'
import { questionBank } from './data/questions'

const QUESTIONS_PER_TEAM = 10
const ADMIN_CREDENTIALS = { loginId: 'admin', password: 'moderator' }

function buildInitialTeams() {
  return initialTeams.map((team) => ({
    ...team,
    wins: 0,
    losses: 0,
    totalScore: 0,
    eliminated: false,
  }))
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

export default function App() {
  const [teams, setTeams] = useState(buildInitialTeams)
  const [session, setSession] = useState({ type: 'guest' })
  const [currentMatch, setCurrentMatch] = useState(null)
  const [matchHistory, setMatchHistory] = useState([])
  const [recentResult, setRecentResult] = useState(null)
  const [authError, setAuthError] = useState(null)

  const activeTeam = useMemo(() => {
    if (session.type !== 'team') return null
    return teams.find((team) => team.id === session.teamId) ?? null
  }, [session, teams])

  const handleTeamLogin = (loginId, password) => {
    const team = teams.find((item) => item.loginId === loginId)

    if (!team || team.password !== password) {
      setAuthError('Invalid team credentials. Please try again.')
      return
    }

    setSession({ type: 'team', teamId: team.id })
    setAuthError(null)
  }

  const handleAdminLogin = (loginId, password) => {
    if (loginId !== ADMIN_CREDENTIALS.loginId || password !== ADMIN_CREDENTIALS.password) {
      setAuthError('Incorrect admin login details.')
      return
    }

    setSession({ type: 'admin' })
    setAuthError(null)
  }

  const handleLogout = () => {
    setSession({ type: 'guest' })
    setAuthError(null)
  }

  const handleStartMatch = (teamAId, teamBId) => {
    if (currentMatch) return

    const questionQueue = drawQuestions(QUESTIONS_PER_TEAM * 2)

    setCurrentMatch({
      id: `match-${Date.now()}`,
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
      },
    })
  }

  const handleFlipCoin = () => {
    setCurrentMatch((previous) => {
      if (!previous || previous.coinToss.status !== 'ready') return previous
      const winnerId = previous.teams[Math.floor(Math.random() * previous.teams.length)]
      return {
        ...previous,
        coinToss: {
          ...previous.coinToss,
          status: 'flipped',
          winnerId,
        },
      }
    })
  }

  const handleSelectFirst = (teamId) => {
    setCurrentMatch((previous) => {
      if (!previous || previous.coinToss.status !== 'flipped') return previous

      const order = buildQuestionOrder(teamId, previous.teams, QUESTIONS_PER_TEAM)

      return {
        ...previous,
        assignedTeamOrder: order,
        activeTeamId: order[0],
        status: 'in-progress',
        coinToss: {
          ...previous.coinToss,
          status: 'decided',
          decision: teamId,
        },
      }
    })
  }

  const finalizeMatch = (match) => {
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

    setMatchHistory((previous) => [record, ...previous])

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

    setCurrentMatch(null)
  }

  const handlePrimaryResult = (wasCorrect) => {
    setCurrentMatch((previous) => {
      if (!previous || previous.status !== 'in-progress' || previous.awaitingSteal) return previous

      const activeTeamId = previous.activeTeamId
      const opponentId = previous.teams.find((teamId) => teamId !== activeTeamId)

      if (wasCorrect) {
        const updatedScores = {
          ...previous.scores,
          [activeTeamId]: previous.scores[activeTeamId] + 1,
        }

        const { completed, match } = advanceMatchState(previous, updatedScores)
        if (completed) {
          finalizeMatch(match)
          return null
        }

        return match
      }

      return {
        ...previous,
        awaitingSteal: true,
        activeTeamId: opponentId,
      }
    })
  }

  const handleStealResult = (wasCorrect) => {
    setCurrentMatch((previous) => {
      if (!previous || !previous.awaitingSteal) return previous

      const updatedScores = wasCorrect
        ? {
            ...previous.scores,
            [previous.activeTeamId]: previous.scores[previous.activeTeamId] + 1,
          }
        : { ...previous.scores }

      const { completed, match } = advanceMatchState(previous, updatedScores)

      if (completed) {
        finalizeMatch(match)
        return null
      }

      return match
    })
  }

  const handleDismissRecent = () => setRecentResult(null)

  if (session.type === 'guest') {
    return (
      <AuthenticationGateway
        onTeamLogin={handleTeamLogin}
        onAdminLogin={handleAdminLogin}
        error={authError}
      />
    )
  }

  if (session.type === 'admin') {
    return (
      <AdminDashboard
        teams={teams}
        currentMatch={currentMatch}
        recentResult={recentResult}
        history={matchHistory}
        onStartMatch={handleStartMatch}
        onFlipCoin={handleFlipCoin}
        onSelectFirst={handleSelectFirst}
        onPrimaryResult={handlePrimaryResult}
        onStealResult={handleStealResult}
        onDismissRecent={handleDismissRecent}
        onLogout={handleLogout}
      />
    )
  }

  if (session.type === 'team' && activeTeam) {
    return (
      <TeamDashboard
        team={activeTeam}
        teams={teams}
        match={currentMatch}
        history={matchHistory}
        onLogout={handleLogout}
      />
    )
  }

  return null
}
