import { useMemo, useRef, useState } from 'react'
import AuthenticationGateway from './components/AuthenticationGateway'
import AdminDashboard from './components/AdminDashboard'
import TeamDashboard from './components/TeamDashboard'
import { initialTeams } from './data/teams'
import { questionBank } from './data/questions'

const QUESTIONS_PER_TEAM = 10
const ADMIN_CREDENTIALS = { loginId: 'admin', password: 'moderator' }
const BACKGROUND_VIDEO_SRC = '/media/quiz-background.mp4'

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


function AppLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <video
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source src={BACKGROUND_VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="pointer-events-none fixed inset-0 bg-slate-950/70 mix-blend-multiply" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-900/20 via-slate-950/40 to-slate-950/80" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

export default function App() {
  const [teams, setTeams] = useState(buildInitialTeams)
  const [session, setSession] = useState({ type: 'guest' })
  const [matches, setMatches] = useState([])
  const [matchHistory, setMatchHistory] = useState([])
  const [recentResult, setRecentResult] = useState(null)
  const [authError, setAuthError] = useState(null)
  const revealTimersRef = useRef(new Map())

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
    setMatches((previous) => {
      const activeTeams = new Set(
        previous
          .filter((match) => match.status !== 'completed')
          .flatMap((match) => match.teams),
      )

      if (activeTeams.has(teamAId) || activeTeams.has(teamBId)) {
        return previous
      }

      const questionQueue = drawQuestions(QUESTIONS_PER_TEAM * 2)

      const matchId = `match-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      return [
        ...previous,
        {
          id: matchId,
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
          lastResponse: null,
        },
      ]
    })
  }

  const handleFlipCoin = (matchId) => {
    setMatches((previous) => {
      const matchToFlip = previous.find((match) => match.id === matchId)
      if (!matchToFlip || matchToFlip.status !== 'coin-toss') {
        return previous
      }

      if (matchToFlip.coinToss.status !== 'ready') {
        return previous
      }

      const timers = revealTimersRef.current
      const existingTimer = timers.get(matchId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timerId = setTimeout(() => {
        revealTimersRef.current.delete(matchId)
        setMatches((current) =>
          current.map((match) => {

            if (match.id !== matchId) return match
            if (match.status !== 'coin-toss') return match
            const winnerId = match.teams[Math.floor(Math.random() * match.teams.length)]
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

      timers.set(matchId, timerId)

      return previous.map((match) => {
        if (match.id !== matchId) return match
        return {
          ...match,
          coinToss: {
            ...match.coinToss,
            status: 'flipping',
            winnerId: null,
            decision: null,
          },
        }
      })
    })

  }

  const handleSelectFirst = (deciderId, matchId, firstTeamId) => {
    setMatches((previous) =>
      previous.map((match) => {
        if (match.id !== matchId) return match
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
          lastResponse: null,
        }
      }),
    )

  }

  const finalizeMatch = (match) => {
    const timers = revealTimersRef.current
    const existingTimer = timers.get(match.id)
    if (existingTimer) {
      clearTimeout(existingTimer)
      timers.delete(match.id)
    }

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

    setMatches((previousMatches) =>
      previousMatches
        .map((match) => {
          if (match.id !== matchId) {
            return match
          }

          if (match.status !== 'in-progress' || match.activeTeamId !== teamId) {
            return match
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

            const baseMatch = {
              ...match,
              scores: updatedScores,
              awaitingSteal: false,
              lastResponse: {
                teamId,
                isCorrect,
                option: selectedOption,
                questionId: question.instanceId,
              },
            }

            const nextIndex = match.questionIndex + 1

            if (nextIndex >= match.questionQueue.length) {
              completedMatch = {
                ...baseMatch,
                questionIndex: nextIndex,
                status: 'completed',
              }
              return null
            }

            return {
              ...baseMatch,
              questionIndex: nextIndex,
              status: 'in-progress',
              activeTeamId: match.assignedTeamOrder[nextIndex],
              lastResponse: null,
            }
          }

          if (isCorrect) {
            const updatedScores = {
              ...match.scores,
              [teamId]: match.scores[teamId] + 1,
            }

            const baseMatch = {
              ...match,
              scores: updatedScores,
              awaitingSteal: false,
              lastResponse: {
                teamId,
                isCorrect: true,
                option: selectedOption,
                questionId: question.instanceId,
              },
            }

            const nextIndex = match.questionIndex + 1

            if (nextIndex >= match.questionQueue.length) {
              completedMatch = {
                ...baseMatch,
                questionIndex: nextIndex,
                status: 'completed',
              }
              return null
            }

            return {
              ...baseMatch,
              questionIndex: nextIndex,
              status: 'in-progress',
              activeTeamId: match.assignedTeamOrder[nextIndex],
              lastResponse: null,
            }
          }

          const opponentId = match.teams.find((item) => item !== teamId)
          return {
            ...match,
            awaitingSteal: true,
            activeTeamId: opponentId,
            lastResponse: {
              teamId,
              isCorrect: false,
              option: selectedOption,
              questionId: question.instanceId,
            },
          }
        })
        .filter(Boolean),
    )

    if (completedMatch) {
      finalizeMatch(completedMatch)
      setMatches((previous) => previous.filter((match) => match.id !== completedMatch.id))
    }
  }

  const handleDismissRecent = () => setRecentResult(null)

  let content = null

  if (session.type === 'guest') {
    content = (
      <AuthenticationGateway
        onTeamLogin={handleTeamLogin}
        onAdminLogin={handleAdminLogin}
        error={authError}
      />
    )
  } else if (session.type === 'admin') {
    content = (
      <AdminDashboard
        teams={teams}
        matches={matches}
        recentResult={recentResult}
        history={matchHistory}
        onStartMatch={handleStartMatch}
        onFlipCoin={handleFlipCoin}
        onSelectFirst={handleSelectFirst}
        onDismissRecent={handleDismissRecent}
        onLogout={handleLogout}
      />
    )
  } else if (session.type === 'team' && activeTeam) {
    const activeMatch = matches.find(
      (match) => match.status !== 'completed' && match.teams.includes(activeTeam.id),
    )

    content = (
      <TeamDashboard
        team={activeTeam}
        teams={teams}
        match={activeMatch ?? null}
        history={matchHistory}
        onAnswer={(matchId, option) => handleTeamAnswer(matchId, activeTeam.id, option)}
        onSelectFirst={(matchId, firstTeamId) => handleSelectFirst(activeTeam.id, matchId, firstTeamId)}

        onLogout={handleLogout}
      />
    )
  }

  return <AppLayout>{content}</AppLayout>
}