import { useMemo } from 'react'
import RosterSelectionPanel from '../RosterSelectionPanel'

function SuperAdminOverview({ superAdmin, teams, moderators, activeMatches, history, tournament }) {
  const liveMatchCount = activeMatches.filter((match) => match.status !== 'completed').length
  const totalBracketMatches = tournament ? Object.keys(tournament.matches).length : 0
  const stageCount = tournament ? Object.keys(tournament.stages).length : 0
  const contactDetails = [superAdmin?.email, superAdmin?.phone].filter(Boolean).join(' • ')
  const initialByeTeamId = tournament?.initialByeTeamId ?? null
  const initialByeTeam = initialByeTeamId ? teams.find((team) => team.id === initialByeTeamId) ?? null : null

  const stats = [
    { label: 'Registered Teams', value: teams.length },
    { label: 'Moderators', value: moderators.length },
    { label: 'Live Matches', value: liveMatchCount },
    { label: 'Completed Matches', value: history.length },
    { label: 'Bracket Matches Seeded', value: totalBracketMatches },
    { label: 'Bracket Stages', value: stageCount },
  ]

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-200 shadow-lg shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Super Admin</p>
          <h2 className="text-2xl font-semibold text-white">{superAdmin?.name ?? 'Super Admin'}</h2>
          <p className="mt-2 text-sm text-slate-300">Contact {contactDetails || 'Not available'}</p>
        </div>
        <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Tournament oversight
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-center shadow-inner shadow-slate-900/20"
          >
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      {initialByeTeam ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-300">System bye awarded</p>
          <p className="mt-2 text-base font-semibold text-white">{initialByeTeam.name}</p>
          <p className="mt-1 text-xs text-emerald-200/80">
            Automatically advanced past the opening round because the initial bracket had an odd number of teams.
          </p>
        </div>
      ) : null}
    </section>
  )
}

export default function AdminOverviewTab({
  teams,
  moderators,
  activeMatches,
  history,
  tournament,
  superAdmin,
  recentResult,
  selectedTeamIds,
  matchMakingLimit,
  tournamentLaunched,
  onToggleTeamSelection,
  onMatchMake,
  onLaunchTournament,
  onDeleteTournament,
  onDownloadArchive,
  onDismissRecent,
}) {
  const launchReadyCount = useMemo(() => {
    if (!tournament) return 0
    return Object.values(tournament.matches ?? {}).filter((match) => {
      if (match.status === 'completed') return false
      if (!match.teams?.every((teamId) => Boolean(teamId))) return false
      if (match.matchRefId) return false
      return true
    }).length
  }, [tournament])

  const tournamentCompleted = tournament?.status === 'completed'

  return (
    <div className="space-y-8">
      <RosterSelectionPanel
        teams={teams}
        selectedTeamIds={selectedTeamIds}
        limit={matchMakingLimit}
        tournamentSeeded={Boolean(tournament)}
        tournamentLaunched={tournamentLaunched && !tournamentCompleted}
        canEdit
        onToggleTeam={onToggleTeamSelection}
        onSubmit={onMatchMake}
        onLaunch={onLaunchTournament}
        launchReadyCount={launchReadyCount}
        description={`Select up to ${Math.min(matchMakingLimit, teams.length)} teams for the opening round, then randomize their pairings.`}
        footerNote="Click Match making to lock in randomized first-round pairings."
      />

      <SuperAdminOverview
        superAdmin={superAdmin}
        teams={teams}
        moderators={moderators}
        activeMatches={activeMatches}
        history={history}
        tournament={tournament}
      />

      {tournament ? (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-100 shadow shadow-rose-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Danger zone</p>
              <p className="text-base font-semibold text-white">
                Delete the current tournament, live matches, and match history.
              </p>
              <p className="mt-1 text-xs text-rose-200/80">
                This cannot be undone.
              </p>
            </div>
            {onDeleteTournament ? (
              <button
                type="button"
                onClick={onDeleteTournament}
                className="rounded-full border border-rose-500/70 bg-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-100 transition hover:border-rose-400 hover:text-white"
              >
                Delete Tournament
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {recentResult ? (
        <div className="rounded-3xl border border-emerald-600/40 bg-emerald-500/10 p-5 text-sm text-emerald-200 shadow shadow-emerald-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Match completed</p>
              <p className="text-base font-semibold text-white">{recentResult.summary}</p>
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

      {tournamentCompleted ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Tournament archived</p>
              <p className="text-base font-semibold text-white">
                Champion: {tournament.champions?.winners || 'Unrecorded'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Bracket completed. You can download the archive and start a new tournament.
              </p>
            </div>
            {onDownloadArchive ? (
              <button
                type="button"
                onClick={onDownloadArchive}
                className="rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200 transition hover:border-sky-400 hover:text-white"
              >
                Download archive CSV
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
