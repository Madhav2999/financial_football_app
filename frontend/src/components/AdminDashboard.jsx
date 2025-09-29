import { useMemo, useState } from 'react'
import ScoreboardTable from './ScoreboardTable'

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
          disabled={match.coinToss.status !== 'ready'}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
            match.coinToss.status === 'ready'
              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-400'
          }`}
        >
          Flip coin
        </button>
      </div>

      {match.coinToss.status !== 'ready' ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
          <p className="text-base font-semibold text-white">
            Winner: {winner?.name}
          </p>
          {match.coinToss.status === 'flipped' ? (
            <div className="space-y-3">
              <p className="text-slate-300">Decide who answers first.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onSelectFirst(match.coinToss.winnerId)}
                  className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow shadow-sky-500/40 transition hover:bg-sky-400"
                >
                  {winner?.name} will answer first
                </button>
                <button
                  onClick={() => onSelectFirst(opponentId)}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Defer to {teams.find((team) => team.id === opponentId)?.name}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-300">Coin toss decision locked in. Let the quiz begin!</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function LiveMatchPanel({ match, teams, onPrimaryResult, onStealResult }) {
  const question = match.questionQueue[match.questionIndex]
  const [teamAId, teamBId] = match.teams
  const activeTeam = teams.find((team) => team.id === match.activeTeamId)
  const opponentId = match.activeTeamId === teamAId ? teamBId : teamAId
  const opponent = teams.find((team) => team.id === opponentId)

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
            {match.awaitingSteal ? (
              <>
                <p className="font-semibold text-white">{opponent?.name} is attempting a steal.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onStealResult(true)}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow shadow-emerald-500/40 transition hover:bg-emerald-400"
                  >
                    Award steal point
                  </button>
                  <button
                    onClick={() => onStealResult(false)}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Steal missed
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold text-white">{activeTeam?.name} is answering.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onPrimaryResult(true)}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow shadow-emerald-500/40 transition hover:bg-emerald-400"
                  >
                    Mark correct
                  </button>
                  <button
                    onClick={() => onPrimaryResult(false)}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Mark incorrect
                  </button>
                </div>
              </>
            )}
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

export default function AdminDashboard({
  teams,
  currentMatch,
  recentResult,
  history,
  onStartMatch,
  onFlipCoin,
  onSelectFirst,
  onPrimaryResult,
  onStealResult,
  onDismissRecent,
  onLogout,
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
                <LiveMatchPanel
                  match={currentMatch}
                  teams={teams}
                  onPrimaryResult={onPrimaryResult}
                  onStealResult={onStealResult}
                />
              )
            ) : (
              <MatchSetupForm teams={teams} onStart={onStartMatch} disabled={Boolean(currentMatch)} />
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Tournament Standings</h2>
              <ScoreboardTable teams={teams} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Match History</h2>
            <MatchHistoryList history={history} teams={teams} />
          </div>
        </section>
      </main>
    </div>
  )
}
