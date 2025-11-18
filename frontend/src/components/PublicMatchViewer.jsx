import { Link, Navigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { CoinTossPanel, LiveMatchPanel } from './MatchPanels'

function SpectatorHeader({ match, teams, moderators }) {
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId) ?? { name: 'Team A' }
  const teamB = teams.find((team) => team.id === teamBId) ?? { name: 'Team B' }
  const moderatorName = moderators.find((mod) => mod.id === match.moderatorId)?.name ?? 'Unassigned'

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.45em] text-emerald-300">Spectator room</p>
        <h1 className="text-3xl font-semibold text-white">
          {teamA.name} vs {teamB.name}
        </h1>
        <p className="mt-2 text-sm text-slate-300">Moderated by {moderatorName}</p>
      </div>
      <Link
        to="/tournament"
        className="rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200 transition hover:border-emerald-300 hover:text-white"
      >
        Back to bracket
      </Link>
    </header>
  )
}

function SpectatorBody({ match, teams, moderators }) {
  if (match.status === 'coin-toss') {
    return (
      <CoinTossPanel
        match={match}
        teams={teams}
        moderators={moderators}
        canControl={false}
        onFlip={() => {}}
        onSelectFirst={() => {}}
        description="Waiting for the moderator to conclude the toss."
      />
    )
  }

  if (match.status === 'completed') {
    const [teamAId, teamBId] = match.teams
    const teamA = teams.find((team) => team.id === teamAId) ?? { name: 'Team A' }
    const teamB = teams.find((team) => team.id === teamBId) ?? { name: 'Team B' }
    const teamAScore = match.scores?.[teamAId] ?? 0
    const teamBScore = match.scores?.[teamBId] ?? 0
    const winnerId = match.winnerId ?? null
    const winner = winnerId ? teams.find((team) => team.id === winnerId) ?? null : null

    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center text-slate-100 shadow-xl shadow-black/30">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-300">Final score</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {teamA.name} {teamAScore} – {teamB.name} {teamBScore}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {winner ? `${winner.name} advanced from this matchup.` : 'The match finished without a winner record.'}
        </p>
      </div>
    )
  }

  return (
    <LiveMatchPanel
      match={match}
      teams={teams}
      moderators={moderators}
      actions={null}
      description="Live match feed (read-only for spectators)."
    />
  )
}

export default function PublicMatchViewer({ matches = [], teams = [], moderators = [] }) {
  const { matchId } = useParams()
  const liveMatch = useMemo(() => matches.find((match) => match.id === matchId) ?? null, [matches, matchId])

  if (!matchId) {
    return <Navigate to="/tournament" replace />
  }

  if (!liveMatch) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-400">Match unavailable</p>
              <h1 className="text-3xl font-semibold text-white">This match is not currently live.</h1>
              <p className="mt-2 text-sm text-slate-300">
                It may have concluded or has not yet been launched. Return to the bracket to pick another matchup.
              </p>
            </div>
            <Link
              to="/tournament"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:border-emerald-300 hover:text-white"
            >
              Back to bracket
            </Link>
          </header>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15)_0%,_transparent_60%)]" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12">
        <SpectatorHeader match={liveMatch} teams={teams} moderators={moderators} />
        <SpectatorBody match={liveMatch} teams={teams} moderators={moderators} />
      </div>
    </div>
  )
}
