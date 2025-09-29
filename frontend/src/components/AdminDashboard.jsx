import { useMemo, useState } from 'react'
import ScoreboardTable from './ScoreboardTable'
import CoinFlipAnimation from './CoinFlipAnimation'

function MatchSetupForm({ teams, onStart, disabled }) {
  const eligibleTeams = useMemo(
    () => teams.filter((team) => !team.eliminated),
    [teams],
  )
  const [selection, setSelection] = useState({ teamA: '', teamB: '' })

  const canStart =
    selection.teamA &&
    selection.teamB &&
    selection.teamA !== selection.teamB &&
    !disabled

  const handleSubmit = (event) => {
    event.preventDefault()
    if (canStart) {
      onStart(selection.teamA, selection.teamB)
      setSelection({ teamA: '', teamB: '' })
    }
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
            Only active teams are displayed. Eliminated teams are automatically hidden.
          </p>
        </div>
        <button
          type="submit"
          disabled={!canStart}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
            canStart
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
    </form>
  )
}

function CoinTossPanel({ match, teams, onFlip, onSelectFirst }) {
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId)
  const teamB = teams.find((team) => team.id === teamBId)
  const winner = teams.find((team) => team.id === match.coinToss.winnerId)
  const opponentId = match.coinToss.winnerId === teamAId ? teamBId : teamAId
  const decision = match.coinToss.decision
  const firstTeam = decision ? teams.find((team) => team.id === decision.firstTeamId) : null
  const status = match.coinToss.status
  const isFlipping = status === 'flipping'

  let statusMessage = null

  if (status === 'ready') {
    statusMessage = (
      <p className="text-slate-300">
        Flip the coin to determine who gains the opening question advantage.
      </p>
    )
  } else if (status === 'flipping') {
    statusMessage = (
      <p className="text-slate-300">
        The coin is in the air&mdash;once it lands the winning team will choose who starts.
      </p>
    )
  } else if (status === 'flipped') {
    statusMessage = (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">
          {winner ? `${winner.name} won the toss!` : 'Toss result received.'}
        </p>
        <p className="text-slate-300">Decide who should answer first.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSelectFirst(match.coinToss.winnerId, match.coinToss.winnerId)}
            className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow shadow-sky-500/40 transition hover:bg-sky-400"
          >
            {winner?.name} will answer first
          </button>
          <button
            onClick={() => onSelectFirst(match.coinToss.winnerId, opponentId)}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Defer to {teams.find((team) => team.id === opponentId)?.name}
          </button>
        </div>
      </div>
    )
  } else if (status === 'decided') {
    statusMessage = (
      <p className="text-slate-300">
        Coin toss decision locked in. {winner?.name} chose {firstTeam?.name} to begin the quiz.
      </p>
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
          onClick={onFlip}
          disabled={status !== 'ready'}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
            status === 'ready'

              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-400'
          }`}
        >
          {isFlipping ? 'Flipping…' : 'Flip coin'}
        </button>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
        <div className="flex flex-col items-center gap-4 text-center">
          <CoinFlipAnimation status={status} teamA={teamA} teamB={teamB} winner={winner} />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Heads: {teamA?.name ?? 'Team A'} &bull; Tails: {teamB?.name ?? 'Team B'}
          </p>
        </div>
        {statusMessage}
      </div>

    </div>
  )
}

function LiveMatchPanel({ match, teams }) {
  const question = match.questionQueue[match.questionIndex]
  const [teamAId, teamBId] = match.teams
  const activeTeam = teams.find((team) => team.id === match.activeTeamId)
  const opponentId = match.activeTeamId === teamAId ? teamBId : teamAId
  const opponent = teams.find((team) => team.id === opponentId)
  const awaitingSteal = match.awaitingSteal

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Live Question</p>
          <h2 className="text-2xl font-semibold text-white">Question {match.questionIndex + 1}</h2>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-200">
          <span className="font-semibold text-white">{match.questionIndex + 1}</span>
          <span className="text-slate-400">/ {match.questionQueue.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Category</p>
          <p className="text-lg font-semibold text-sky-300">{question.category}</p>
          <p className="text-sm leading-relaxed text-slate-200">{question.prompt}</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{teams.find((team) => team.id === teamAId)?.name}</span>
            <span className="text-lg font-bold text-sky-400">{match.scores[teamAId]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{teams.find((team) => team.id === teamBId)?.name}</span>
            <span className="text-lg font-bold text-amber-400">{match.scores[teamBId]}</span>
          </div>
          <div className="mt-4 space-y-3">
            <p className="font-semibold text-white">{awaitingSteal ? `${opponent?.name} is attempting a steal.` : `${activeTeam?.name} is responding.`}</p>
            <p className="text-xs text-slate-400">
              The moderator now observes progress only. Teams submit answers directly from their dashboards.
            </p>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">Multiple-choice options</p>
              <ol className="mt-3 space-y-2">
                {question.options.map((option, index) => (
                  <li key={option} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-[11px] uppercase text-slate-400">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </li>
                ))}
              </ol>
            </div>
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
  currentMatch,
  recentResult,
  history,
  onStartMatch,
  onFlipCoin,
  onSelectFirst,
  onDismissRecent,
  onLogout,
}) {
  return (
    <div className="flex min-h-screen flex-col text-slate-100">

      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur">
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
            {currentMatch ? (
              currentMatch.status === 'coin-toss' ? (
                <CoinTossPanel match={currentMatch} teams={teams} onFlip={onFlipCoin} onSelectFirst={onSelectFirst} />
              ) : (
                <LiveMatchPanel match={currentMatch} teams={teams} />
              )
            ) : (
              <MatchSetupForm teams={teams} onStart={onStartMatch} disabled={Boolean(currentMatch)} />
            )}

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
