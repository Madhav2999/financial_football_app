import { useMemo, useState } from 'react'
import AuthenticationGateway from './components/AuthenticationGateway'
import AdminDashboard from './components/AdminDashboard'
import LandingPage from './components/LandingPage'
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

export default function App() {
  const [teams, setTeams] = useState(buildInitialTeams)
  const [session, setSession] = useState({ type: 'guest' })
  const [guestView, setGuestView] = useState('landing')
  const [activeMatches, setActiveMatches] = useState([])
  const [matchHistory, setMatchHistory] = useState([])
  const [recentResult, setRecentResult] = useState(null)
  const [authError, setAuthError] = useState(null)

  const activeTeam = useMemo(() => {
    if (session.type !== 'team') return null
    return teams.find((team) => team.id === session.teamId) ?? null
  }, [session, teams])

  const activeTeamMatch = useMemo(() => {
    if (session.type !== 'team') return null
    return activeMatches.find((match) => match.teams.includes(session.teamId)) ?? null
  }, [activeMatches, session])

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
    setActiveMatches((previousMatches) => {
      const isTeamBusy = previousMatches.some(
        (match) =>
          match.status !== 'completed' &&
          match.teams.some((teamId) => teamId === teamAId || teamId === teamBId),
      )

      if (isTeamBusy) {
        return previousMatches
      }

      const questionQueue = drawQuestions(QUESTIONS_PER_TEAM * 2)

      const match = {
        id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      }

      return [...previousMatches, match]
    })
  }

  const handleModeratorStart = (matchId) => {
    setActiveMatches((previousMatches) =>
      previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.status !== 'pending-start' || match.coinToss.status !== 'pending') {
          return match
        }

        return {
          ...match,
          status: 'coin-toss',
          coinToss: {
            ...match.coinToss,
            status: 'ready',
          },
        }
      }),
    )
  }

  const handleFlipCoin = (matchId) => {
    setActiveMatches((previousMatches) => {
      const targetMatch = previousMatches.find((match) => match.id === matchId)

      if (!targetMatch || targetMatch.coinToss.status !== 'ready') {
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

  const handleSelectFirst = (matchId, deciderId, firstTeamId) => {
    setActiveMatches((previousMatches) =>
      previousMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.status !== 'coin-toss') return match
        if (match.coinToss.status !== 'flipped') return match
        if (match.coinToss.winnerId !== deciderId) return match
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

  }

  const handleTeamAnswer = (matchId, teamId, selectedOption) => {
    let completedMatch = null

    setActiveMatches((previousMatches) =>
      previousMatches.reduce((updated, match) => {
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
      }, []),
    )

    if (completedMatch) {
      finalizeMatch(completedMatch)
    }
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
        activeMatches={activeMatches}
        recentResult={recentResult}
        history={matchHistory}
        onStartMatch={handleStartMatch}
        onFlipCoin={handleFlipCoin}
        onSelectFirst={handleSelectFirst}
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
        match={activeTeamMatch}
        history={matchHistory}
        onAnswer={(matchId, option) => handleTeamAnswer(matchId, activeTeam.id, option)}
        onSelectFirst={(matchId, firstTeamId) => handleSelectFirst(matchId, activeTeam.id, firstTeamId)}
        onLogout={handleLogout}
      />
    )
  }

  return null
}