import { useMemo, useState } from 'react'
import ScoreboardTable from './ScoreboardTable'


function MatchSetupForm({ teams, activeMatches, onStart }) {
  const eligibleTeams = useMemo(() => {
    const engaged = new Set()
    activeMatches.forEach((match) => {
      if (match.status === 'completed') return
      match.teams.forEach((teamId) => engaged.add(teamId))
    })
    return teams.filter((team) => !team.eliminated && !engaged.has(team.id))
  }, [teams, activeMatches])
  const [selection, setSelection] = useState({ teamA: '', teamB: '' })

  const canStart =
    selection.teamA &&
    selection.teamB &&
    selection.teamA !== selection.teamB
  const isSubmitDisabled = !canStart || eligibleTeams.length < 2

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSubmitDisabled) {
      return
    }
    onStart(selection.teamA, selection.teamB)
    setSelection({ teamA: '', teamB: '' })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Create Match</p>
          <h2 className="text-2xl font-semibold text-white">Select competitors</h2>
          <p className="mt-2 text-sm text-slate-400">
            Only eligible teams are displayed. Eliminated or currently competing teams are hidden automatically.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
            !isSubmitDisabled
              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
          }`}
        >
          Launch match
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">
          Team A
          <select
            value={selection.teamA}
            onChange={(event) => setSelection((prev) => ({ ...prev, teamA: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <option value="">Select team</option>
            {eligibleTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-200">
          Team B
          <select
            value={selection.teamB}
            onChange={(event) => setSelection((prev) => ({ ...prev, teamB: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <option value="">Select team</option>
            {eligibleTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {eligibleTeams.length < 2 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
          Not enough eligible teams are available to launch a new match right now.
        </p>
      ) : null}
    </form>
  )
}

function CoinFlipAnimation({ status, teamAName, teamBName, resultFace }) {
  const classes = ['coin-flip']

  if (status === 'flipping') {
    classes.push('coin-flip--spinning')
  } else if (resultFace) {
    classes.push(`coin-flip--${resultFace}`)
  }

  return (
    <div className="coin-flip__scene">
      <div className={classes.join(' ')}>
        <div className="coin-flip__face coin-flip__face--heads">
          <span className="coin-flip__label">Heads</span>
          <span className="coin-flip__team">{teamAName}</span>
        </div>
        <div className="coin-flip__face coin-flip__face--tails">
          <span className="coin-flip__label">Tails</span>
          <span className="coin-flip__team">{teamBName}</span>
        </div>
      </div>
    </div>
  )
}



function CoinTossPanel({ match, teams, onFlip, onSelectFirst }) {
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId)
  const teamB = teams.find((team) => team.id === teamBId)
  const status = match.coinToss.status
  const resultFace = match.coinToss.resultFace
  const winnerId = match.coinToss.winnerId
  const winner = teams.find((team) => team.id === winnerId) ?? null
  const opponentId =
    winnerId === teamAId ? teamBId : winnerId === teamBId ? teamAId : null
  const opponent = opponentId ? teams.find((team) => team.id === opponentId) : null
  const decision = match.coinToss.decision
  const firstTeam = decision ? teams.find((team) => team.id === decision.firstTeamId) : null
  const resultFaceLabel = resultFace === 'heads' ? 'Heads' : resultFace === 'tails' ? 'Tails' : null

  let statusContent = null

  if (status === 'ready') {
    statusContent = (
      <p className="text-slate-300">Flip the coin to decide who takes the opening question.</p>
    )
  } else if (status === 'flipping') {
    statusContent = (
      <p className="text-slate-300">Coin in motion... we will reveal the toss winner momentarily.</p>
    )
  } else if (status === 'flipped') {
    statusContent = (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">
          {resultFaceLabel ? `${resultFaceLabel} - ` : ''}
          {winner ? `${winner.name} won the toss.` : 'Toss winner decided.'}
        </p>
        <p className="text-slate-300">Choose which team starts the match.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSelectFirst(match.id, winnerId, winnerId)}
            disabled={!winnerId}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              winnerId
                ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-400'
            }`}
          >
            {winner ? `${winner.name} begins` : 'Winner begins'}
          </button>
          <button
            onClick={() => onSelectFirst(match.id, winnerId, opponentId)}
            disabled={!winnerId || !opponentId}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              winnerId && opponentId
                ? 'border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
            }`}
          >
            Defer to {opponent?.name ?? 'opponent'}
          </button>
        </div>
      </div>
    )
  } else if (status === 'decided') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">
          {winner ? `${winner.name}` : 'Toss winner'} selected {firstTeam?.name ?? 'a team'} to open the quiz.
        </p>
        <p className="text-slate-300">Monitor the live match below as the first question is underway.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Coin Toss</p>
          <h2 className="text-2xl font-semibold text-white">
            {teamA?.name} vs {teamB?.name}
          </h2>
        </div>
        <button
          onClick={() => onFlip(match.id)}
          disabled={status !== 'ready'}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
            status === 'ready'
              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-400'
          }`}
        >
          {status === 'flipping' ? 'Flipping...' : 'Flip coin'}
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center">
          <CoinFlipAnimation
            status={status}
            teamAName={teamA?.name ?? 'Team A'}
            teamBName={teamB?.name ?? 'Team B'}
            resultFace={resultFace}
          />
          <p className="mt-4 text-xs uppercase tracking-widest text-slate-400">
            Heads - {teamA?.name ?? 'Team A'} | Tails - {teamB?.name ?? 'Team B'}
          </p>
          {resultFaceLabel && status !== 'flipping' ? (
            <p className="mt-2 text-sm font-semibold text-white">Result: {resultFaceLabel}</p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
          {statusContent}
        </div>
      </div>
    </div>
  )
}



function LiveMatchPanel({ match, teams }) {
  const question = match.questionQueue[match.questionIndex]
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId) ?? null
  const teamB = teams.find((team) => team.id === teamBId) ?? null
  const activeTeam = teams.find((team) => team.id === match.activeTeamId) ?? null
  const awaitingSteal = match.awaitingSteal
  const progress = Math.round(((match.questionIndex + 1) / match.questionQueue.length) * 100)
  const timeline = match.assignedTeamOrder.length ? match.assignedTeamOrder : []

  const statusMessage = awaitingSteal
    ? `${teamAId === match.activeTeamId ? teamB?.name ?? 'Opponent' : teamA?.name ?? 'Opponent'} attempting a steal`
    : `${activeTeam?.name ?? 'Team'} answering now`

  return (
    <div
      className="relative overflow-hidden rounded-[32px] border border-white/10 text-white shadow-[0_40px_120px_rgba(8,47,73,0.45)]"
      style={{
        backgroundImage: 'linear-gradient(130deg, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.6)), url(/assets/moderator-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" aria-hidden />
      <div className="relative z-10 grid gap-10 px-8 py-10 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-emerald-300">Quiz Moderator</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight">{teamA?.name} vs {teamB?.name}</h2>
            </div>
            <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.4em] text-slate-200">
              Question {match.questionIndex + 1} / {match.questionQueue.length}
            </div>
          </div>

          <div className="space-y-6 rounded-[28px] border border-white/10 bg-black/40 p-8 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-lg font-semibold text-slate-900">
                  Q{match.questionIndex + 1}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Category</p>
                  <p className="text-lg font-semibold text-white">{question.category}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-emerald-200">
                  {statusMessage}
                </span>
                <span className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-slate-200">{progress}% complete</span>
              </div>
            </div>
            <p className="text-base leading-relaxed text-slate-100">{question.prompt}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {question.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index)
                return (
                  <div
                    key={option}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:border-emerald-300/70 hover:bg-emerald-300/10"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-slate-900">
                      {letter}
                    </span>
                    <span className="text-slate-100">{option}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-[28px] border border-white/10 bg-black/50 p-8 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Scoreboard</p>
            <div className="mt-6 space-y-4 text-sm">
              {[{ team: teamA, id: teamAId }, { team: teamB, id: teamBId }].map(({ team, id }) => (
                <div
                  key={id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    match.activeTeamId === id ? 'border-emerald-400/70 bg-emerald-400/15' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-white">{team?.name ?? 'Team'}</p>
                    <span className="text-2xl font-bold text-emerald-300">{match.scores[id]}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: match.questionQueue.length }).map((_, index) => {
                      const base = 'h-2 w-6 rounded-full transition'
                      const isCompleted = index < match.questionIndex
                      const isCurrent = index === match.questionIndex
                      if (isCurrent) return <span key={index} className={`${base} bg-emerald-300 animate-pulse`} />
                      if (isCompleted) {
                        const owner = timeline[index]
                        const ownedByTeam = owner === id
                        return <span key={index} className={`${base} ${ownedByTeam ? 'bg-emerald-400/70' : 'bg-white/25'}`} />
                      }
                      return <span key={index} className={`${base} bg-white/10`} />
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Moderator Notes</p>
            <p className="mt-3 text-sm text-slate-200">
              Keep teams muted on stage, announce the active side before revealing options, and note any disputed calls here for review.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


function MatchHistoryList({ history, teams }) {
  if (!history.length) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-lg shadow-slate-900/40">
        No matches have been completed yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((match) => {
        const [teamAId, teamBId] = match.teams
        const teamA = teams.find((team) => team.id === teamAId)
        const teamB = teams.find((team) => team.id === teamBId)
        const isTie = match.winnerId === null
        const winner = teams.find((team) => team.id === match.winnerId)

        return (
          <div
            key={match.id}
            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">
                {teamA?.name} vs {teamB?.name}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  isTie
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {isTie ? 'Tie' : `${winner?.name} won`}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Final Score</p>
            <p className="text-base font-semibold text-white">
              {teamA?.name} {match.scores[teamAId]} - {teamB?.name} {match.scores[teamBId]}
            </p>
            <p className="mt-3 text-xs text-slate-400">{new Date(match.completedAt).toLocaleString()}</p>
          </div>
        )
      })}
    </div>
  )
}

function TeamAnalyticsPanel({ teams }) {
  const activeTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    wins: team.wins,
    losses: team.losses,
    points: team.totalScore,
    eliminated: team.eliminated,
  }))

  return (
    <div className="space-y-4">
      {activeTeams.map((team) => (
        <div
          key={team.id}
          className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-white">{team.name}</p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                team.eliminated ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {team.eliminated ? 'Eliminated' : 'Active'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Wins</p>
              <p className="text-lg font-semibold text-white">{team.wins}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Losses</p>
              <p className="text-lg font-semibold text-white">{team.losses}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Points</p>
              <p className="text-lg font-semibold text-white">{team.points}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard({
  teams,
  activeMatches,
  recentResult,
  history,
  onStartMatch,
  onFlipCoin,
  onSelectFirst,
  onDismissRecent,
  onLogout,
}) {
  const orderedMatches = useMemo(
    () =>
      activeMatches
        .filter((match) => match.status !== 'completed')
        .sort((a, b) => {
          const priority = { 'coin-toss': 0, 'in-progress': 1 }
          return (priority[a.status] ?? 2) - (priority[b.status] ?? 2)
        }),
    [activeMatches],
  )

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        backgroundImage: 'linear-gradient(180deg, rgba(2, 6, 23, 0.95), rgba(2, 6, 23, 0.85)), url(/assets/moderator-bg.jpg)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      }}
    >
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Admin Control Booth</p>
            <h1 className="text-3xl font-semibold text-white">Tournament Moderator</h1>
          </div>
          <button
            onClick={onLogout}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        {recentResult ? (
          <div className="rounded-3xl border border-emerald-600/40 bg-emerald-500/10 p-5 text-sm text-emerald-200 shadow shadow-emerald-500/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Match completed</p>
                <p className="text-base font-semibold text-white">
                  {recentResult.summary}
                </p>
              </div>
              <button
                onClick={onDismissRecent}
                className="rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}



        <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <MatchSetupForm teams={teams} activeMatches={activeMatches} onStart={onStartMatch} />
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Active Matches</h2>
              {orderedMatches.length ? (
                <div className="space-y-4">
                  {orderedMatches.map((match) =>
                    match.status === 'coin-toss' ? (
                      <CoinTossPanel
                        key={match.id}
                        match={match}
                        teams={teams}
                        onFlip={onFlipCoin}
                        onSelectFirst={onSelectFirst}
                      />
                    ) : (
                      <LiveMatchPanel key={match.id} match={match} teams={teams} />
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-inner shadow-slate-900/30">
                  No matches are running right now. Launch a new showdown above.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Tournament Standings</h2>
              <ScoreboardTable teams={teams} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Team Analytics</h2>
              <TeamAnalyticsPanel teams={teams} />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Match History</h2>
              <MatchHistoryList history={history} teams={teams} />
            </div>
          </div>
        </section>


      </main>
    </div>
  )
}