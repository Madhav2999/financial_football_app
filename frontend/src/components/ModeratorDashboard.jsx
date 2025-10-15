import { useMemo } from 'react'
import { CoinTossPanel, LiveMatchPanel, MatchControlButtons } from './MatchPanels'

function MatchMakingPanel({
  teams,
  selectedTeamIds,
  limit,
  tournamentSeeded,
  tournamentLaunched,
  onToggleTeam,
  onMatchMake,
}) {
  const roster = useMemo(() => {
    const selection = new Set(selectedTeamIds)
    return [...teams]
      .map((team) => ({
        ...team,
        selected: selection.has(team.id),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [teams, selectedTeamIds])

  const requiredCount = Math.min(limit, teams.length)
  const selectedCount = roster.filter((team) => team.selected).length
  const remainingSlots = Math.max(0, requiredCount - selectedCount)
  const selectionLocked = tournamentLaunched
  const buttonDisabled =
    selectionLocked || selectedCount !== requiredCount || !teams.length

  const statusBadge = (() => {
    if (tournamentLaunched) {
      return {
        label: 'Tournament launched',
        classes: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
      }
    }

    if (tournamentSeeded) {
      return {
        label: 'Match making ready',
        classes: 'border-sky-500/60 bg-sky-500/10 text-sky-200',
      }
    }

    return {
      label: 'Awaiting match making',
      classes: 'border-slate-700 bg-slate-900 text-slate-300',
    }
  })()

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Tournament roster</p>
          <h2 className="text-2xl font-semibold text-white">Select opening round teams</h2>
          <p className="mt-2 text-sm text-slate-300">
            Choose {requiredCount} teams for the first round, then lock in their pairings with the match making button.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
            {selectedCount} selected • {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} remaining
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${statusBadge.classes}`}
        >
          {statusBadge.label}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roster.map((team) => {
          const isSelected = team.selected
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onToggleTeam?.(team.id)}
              disabled={selectionLocked}
              aria-pressed={isSelected}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? 'border-sky-500/60 bg-sky-500/10 text-sky-100 shadow-inner shadow-sky-500/20'
                  : 'border-slate-800 bg-slate-950/50 text-slate-200 hover:border-sky-500/60 hover:text-white'
              } ${selectionLocked ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <span className="font-semibold text-white">{team.name}</span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${
                  isSelected ? 'border-sky-500/60 text-sky-200' : 'border-slate-700 text-slate-400'
                }`}
              >
                {isSelected ? 'Selected' : 'Reserve'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          {selectionLocked
            ? 'Selections are locked while the tournament is live.'
            : `Press Match making to randomize the opening round with the chosen teams.`}
        </div>
        <button
          type="button"
          onClick={() => onMatchMake?.()}
          disabled={buttonDisabled}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] transition ${
            !buttonDisabled
              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
          }`}
        >
          Match making
        </button>
      </div>
    </section>
  )
}

function AssignmentHeader({ moderator }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator Console</p>
        <h1 className="text-2xl font-semibold text-white">
          {moderator ? `${moderator.name}'s Assignments` : 'Moderator Access'}
        </h1>
      </div>
    </header>
  )
}

function UpcomingAssignments({ bracketAssignments }) {
  if (!bracketAssignments.length) {
    return null
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold text-white">Upcoming Bracket Matches</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-300">
        {bracketAssignments.map((assignment) => (
          <li key={assignment.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{assignment.stageLabel}</p>
                <p className="mt-1 text-base text-white">{assignment.label}</p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                {assignment.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {assignment.teamA?.name ?? 'TBD'} vs {assignment.teamB?.name ?? 'TBD'}
            </p>
            {assignment.liveMatchId ? (
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-300">
                Linked live match: {assignment.liveMatchId}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ModeratorDashboard({
  moderator,
  matches,
  teams,
  tournament,
  moderators,
  selectedTeamIds,
  matchMakingLimit,
  tournamentLaunched,
  onToggleTeamSelection,
  onMatchMake,
  onFlipCoin,
  onSelectFirst,
  onPauseMatch,
  onResumeMatch,
  onResetMatch,
  onLogout,
}) {
  const interactiveAssignments = useMemo(() => {
    if (!moderator) return []
    return matches
      .filter((match) => match.moderatorId === moderator.id && match.status !== 'completed')
      .sort((left, right) => {
        const priority = { 'coin-toss': 0, paused: 1, 'in-progress': 2 }
        return (priority[left.status] ?? 3) - (priority[right.status] ?? 3)
      })
  }, [matches, moderator])

  const bracketAssignments = useMemo(() => {
    if (!tournament || !moderator) return []

    return Object.values(tournament.matches)
      .filter((match) => match.moderatorId === moderator.id && match.status !== 'completed')
      .map((match) => {
        const stage = tournament.stages[match.stageId]
        const [teamAId, teamBId] = match.teams
        const teamA = teams.find((team) => team.id === teamAId) ?? null
        const teamB = teams.find((team) => team.id === teamBId) ?? null
        const liveMatch = matches.find((item) => item.tournamentMatchId === match.id) ?? null
        return {
          id: match.id,
          label: match.label,
          bracket: stage?.bracket ?? 'bracket',
          stageLabel: stage?.label ?? 'Bracket Match',
          teamA,
          teamB,
          status: match.status,
          liveMatchId: liveMatch?.id ?? null,
        }
      })
      .sort((left, right) => {
        const order = { active: 0, scheduled: 1, pending: 2 }
        return (order[left.status] ?? 3) - (order[right.status] ?? 3)
      })
  }, [tournament, moderator, teams, matches])

  const hasAssignments = Boolean(interactiveAssignments.length || bracketAssignments.length)

  const renderActions = (match) => (
    <MatchControlButtons
      match={match}
      onPause={() => onPauseMatch?.(match.id)}
      onResume={() => onResumeMatch?.(match.id)}
      onReset={() => onResetMatch?.(match.id)}
    />
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AssignmentHeader moderator={moderator} />
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
          >
            Log out
          </button>
        </div>

        <MatchMakingPanel
          teams={teams}
          selectedTeamIds={selectedTeamIds}
          limit={matchMakingLimit}
          tournamentSeeded={Boolean(tournament)}
          tournamentLaunched={tournamentLaunched}
          onToggleTeam={onToggleTeamSelection}
          onMatchMake={onMatchMake}
        />

        {!moderator ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
            <p>Moderator details could not be loaded. Try logging out and back in.</p>
          </section>
        ) : hasAssignments ? (
          <section className="space-y-6">
            {interactiveAssignments.length ? (
              <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
                <h2 className="text-lg font-semibold text-white">Live Match Controls</h2>
                <div className="space-y-6">
                  {interactiveAssignments.map((match) =>
                    match.status === 'coin-toss' ? (
                      <CoinTossPanel
                        key={match.id}
                        match={match}
                        teams={teams}
                        moderators={moderators}
                        canControl
                        onFlip={() => onFlipCoin?.(match.id)}
                        onSelectFirst={(deciderId, firstTeamId) =>
                          onSelectFirst?.(match.id, deciderId, firstTeamId)
                        }
                        description="Flip the coin and choose who receives the opening question."
                      />
                    ) : (
                      <LiveMatchPanel
                        key={match.id}
                        match={match}
                        teams={teams}
                        moderators={moderators}
                        actions={renderActions(match)}
                        description="Monitor scoring, track question progress, and adjust tempo as needed."
                      />
                    ),
                  )}
                </div>
              </div>
            ) : null}

            <UpcomingAssignments bracketAssignments={bracketAssignments} />
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
            <p>No bracket assignments yet. Once the tournament assigns you to a match, it will appear here.</p>
          </section>
        )}
      </div>
    </div>
  )
}
