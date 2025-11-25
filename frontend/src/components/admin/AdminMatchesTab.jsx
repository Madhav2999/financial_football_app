import { useMemo } from 'react'
import { listMatchesForStage, listStages } from '../../tournament/engine'
import { CoinTossPanel, LiveMatchPanel, MatchControlButtons } from '../MatchPanels'

function TournamentMatchQueue({
  tournament,
  teams,
  activeMatches,
  moderators,
  autoLaunchActive,
  onGrantBye,
}) {
  if (!tournament) {
    return null
  }

  const queue = listStages(tournament)
    .filter((stage) => stage?.matchIds?.length)
    .flatMap((stage) => {
      const matches = listMatchesForStage(tournament, stage.id)
      return matches
        .filter((match) => match.status !== 'completed')
        .map((match) => ({ stage, match }))
    })

  if (!queue.length) {
    return null
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Bracket Queue</p>
          <h2 className="text-2xl font-semibold text-white">Upcoming Matches</h2>
          <p className="mt-2 text-sm text-slate-400">Automatically seeded by the tournament engine.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {queue.map(({ stage, match }) => {
          const [teamAId, teamBId] = match.teams
          const teamA = teams.find((team) => team.id === teamAId) ?? null
          const teamB = teams.find((team) => team.id === teamBId) ?? null
          const isActive = activeMatches.some((liveMatch) => liveMatch.tournamentMatchId === match.id)
          const isReady = Boolean(teamA && teamB)
          const isLinked = Boolean(match.matchRefId)
          const moderatorName = moderators?.find((mod) => mod.id === match.moderatorId)?.name ?? 'Unassigned'
          const byeAwarded = Boolean(match.meta?.byeAwarded)
          const queueState = (() => {
            if (isActive) {
              return {
                label: 'Live match',
                classes: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
              }
            }

            if (byeAwarded) {
              return {
                label: 'Bye awarded',
                classes: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100',
              }
            }

            if (!isReady) {
              return {
                label: 'Awaiting teams',
                classes: 'border-slate-700 bg-slate-900 text-slate-400',
              }
            }

            if (isLinked) {
              return {
                label: 'Awaiting toss',
                classes: 'border-sky-500/60 bg-sky-500/10 text-sky-200',
              }
            }

            if (autoLaunchActive) {
              return {
                label: 'Auto-launch queued',
                classes: 'border-sky-500/60 bg-sky-500/10 text-sky-200',
              }
            }

            return {
              label: 'Pending launch',
              classes: 'border-slate-700 bg-slate-900 text-slate-400',
            }
          })()

          const winner = match.winnerId ? teams.find((team) => team.id === match.winnerId) ?? null : null
          const tournamentLive = tournament?.status === 'live'
          const disallowedStatuses = new Set(['active', 'in-progress', 'live', 'completed'])
          const canGrantBye =
            Boolean(onGrantBye) &&
            !byeAwarded &&
            !isActive &&
            isReady &&
            !disallowedStatuses.has(match.status) &&
            !isLinked &&
            !tournamentLive

          const handleByeClick = (teamId, teamName) => {
            if (!teamId) return
            const confirmed =
              !teamName ||
              window.confirm(
                `Grant a bye to ${teamName}? ${teamName} will advance and their opponent will receive a loss.`,
              )
            if (confirmed) {
              onGrantBye?.(match.id, teamId)
            }
          }

          return (
            <div key={match.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stage.label}</p>
                  <p className="mt-1 text-base text-white">{match.label}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {teamA?.name ?? 'TBD'} vs {teamB?.name ?? 'TBD'}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Moderator: {moderatorName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                    {match.status}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${queueState.classes}`}
                  >
                    {queueState.label}
                  </span>
                </div>
              </div>
              {winner ? (
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-emerald-300">
                  {winner.name} advanced by bye
                </p>
              ) : null}
              {canGrantBye ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleByeClick(teamAId, teamA?.name)}
                    className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-400 hover:text-white"
                  >
                    Bye {teamA?.name ?? 'Team A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleByeClick(teamBId, teamB?.name)}
                    className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-400 hover:text-white"
                  >
                    Bye {teamB?.name ?? 'Team B'}
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminMatchesTab({
  tournament,
  teams,
  activeMatches,
  moderators,
  tournamentLaunched,
  onPauseMatch,
  onResumeMatch,
  onResetMatch,
  onGrantBye,
}) {
  const orderedMatches = useMemo(
    () =>
      activeMatches
        .filter((match) => match.status !== 'completed')
        .sort((a, b) => {
          const priority = { 'coin-toss': 0, paused: 1, 'in-progress': 2 }
          return (priority[a.status] ?? 2) - (priority[b.status] ?? 2)
        }),
    [activeMatches],
  )

  const renderMatchControls = (match) => (
    <MatchControlButtons
      match={match}
      onPause={() => onPauseMatch?.(match.id)}
      onResume={() => onResumeMatch?.(match.id)}
      onReset={() => onResetMatch?.(match.id)}
    />
  )

  return (
    <div className="space-y-8">
      <TournamentMatchQueue
        tournament={tournament}
        teams={teams}
        activeMatches={activeMatches}
        moderators={moderators}
        autoLaunchActive={tournamentLaunched}
        onGrantBye={onGrantBye}
      />

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
                  moderators={moderators}
                  canControl={false}
                  onFlip={() => {}}
                  onSelectFirst={() => {}}
                  description="The assigned moderator will run this toss and begin the match."
                />
              ) : (
                <LiveMatchPanel
                  key={match.id}
                  match={match}
                  teams={teams}
                  moderators={moderators}
                  actions={renderMatchControls(match)}
                  description="Track progress in real time or step in to pause or reset a quiz if needed."
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-inner shadow-slate-900/30">
            No matches are running right now. Launch the tournament to activate the opening round.
          </div>
        )}
      </div>
    </div>
  )
}
