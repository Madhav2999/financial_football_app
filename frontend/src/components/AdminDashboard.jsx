import { useMemo } from 'react'
import { listMatchesForStage, listStages } from '../tournament/engine'
import ScoreboardTable from './ScoreboardTable'
import { CoinTossPanel, LiveMatchPanel, MatchControlButtons } from './MatchPanels'
import RosterSelectionPanel from './RosterSelectionPanel'

function TournamentMatchQueue({ tournament, teams, activeMatches, moderators, autoLaunchActive }) {
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
          const queueState = (() => {
            if (isActive) {
              return {
                label: 'Live match',
                classes: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
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

          return (
            <div key={match.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stage.label}</p>
                  <p className="mt-1 text-base text-white">{match.label}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {teamA?.name ?? 'TBD'} vs {teamB?.name ?? 'TBD'}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    Moderator: {moderatorName}
                  </p>
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
            </div>
          )
        })}
      </div>
    </div>
  )
}


function TournamentLaunchPanel({ tournament, launched, onLaunch }) {
  const readyCount = useMemo(() => {
    if (!tournament) return 0
    return Object.values(tournament.matches).filter((match) => {
      if (match.status === 'completed') return false
      if (!match.teams?.every((teamId) => Boolean(teamId))) return false
      if (match.matchRefId) return false
      return true
    }).length
  }, [tournament])

  const buttonDisabled = launched || readyCount === 0
  const buttonLabel = launched ? 'Tournament live' : 'Launch tournament'

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-400">Bracket kickoff</p>
          <h2 className="text-2xl font-semibold text-white">One-click tournament launch</h2>
          <p className="mt-2 text-sm text-slate-300">
            {launched
              ? 'Automated pairing is active. New bracket rounds will open for moderators as soon as teams advance.'
              : 'Queue every opening-round match and hand control to the assigned moderators with a single action.'}
          </p>
          {!launched ? (
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              {readyCount} match{readyCount === 1 ? '' : 'es'} ready to open
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onLaunch?.()}
          disabled={buttonDisabled}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] transition ${
            !buttonDisabled
              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </section>
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

function SuperAdminOverview({ superAdmin, teams, moderators, activeMatches, history, tournament }) {
  const liveMatchCount = activeMatches.filter((match) => match.status !== 'completed').length
  const totalBracketMatches = tournament ? Object.keys(tournament.matches).length : 0
  const stageCount = tournament ? Object.keys(tournament.stages).length : 0
  const contactDetails = [superAdmin?.email, superAdmin?.phone].filter(Boolean).join(' • ')

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
          <p className="mt-2 text-sm text-slate-300">
            Contact {contactDetails || 'Not available'}
          </p>
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
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AdminDashboard({
  teams,
  activeMatches,
  recentResult,
  history,
  tournament,
  moderators,
  superAdmin,
  selectedTeamIds,
  matchMakingLimit,
  tournamentLaunched,
  onToggleTeamSelection,
  onMatchMake,
  onLaunchTournament,
  onPauseMatch,
  onResumeMatch,
  onResetMatch,
  onDismissRecent,
  onLogout,
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
        <RosterSelectionPanel
          teams={teams}
          selectedTeamIds={selectedTeamIds}
          limit={matchMakingLimit}
          tournamentSeeded={Boolean(tournament)}
          tournamentLaunched={tournamentLaunched}
          canEdit
          onToggleTeam={onToggleTeamSelection}
          onSubmit={onMatchMake}
          description={`Select up to ${Math.min(
            matchMakingLimit,
            teams.length,
          )} teams for the opening round, then randomize their pairings.`}
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
        <TournamentLaunchPanel
          tournament={tournament}
          launched={tournamentLaunched}
          onLaunch={onLaunchTournament}
        />
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
            <TournamentMatchQueue
              tournament={tournament}
              teams={teams}
              activeMatches={activeMatches}
              moderators={moderators}
              autoLaunchActive={tournamentLaunched}
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
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-inner shadow-slate-900/30">
                  No matches are running right now. Launch the tournament to activate the opening round.
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