import { useMemo } from 'react'
import { CoinTossPanel, LiveMatchPanel } from './MatchPanels'

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

function ActionButtons({ match, onPause, onResume, onReset }) {
  const isInProgress = match.status === 'in-progress'
  const isPaused = match.status === 'paused'
  const buttons = []

  if (isInProgress) {
    buttons.push(
      <button
        key="pause"
        type="button"
        onClick={onPause}
        className="rounded-2xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-500 hover:text-white"
      >
        Pause match
      </button>,
    )
  }

  if (isPaused) {
    buttons.push(
      <button
        key="resume"
        type="button"
        onClick={onResume}
        className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-400 hover:text-white"
      >
        Resume match
      </button>,
    )
  }

  if (match.status !== 'completed') {
    buttons.push(
      <button
        key="reset"
        type="button"
        onClick={onReset}
        className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-200 transition hover:border-rose-400 hover:text-white"
      >
        Reset match
      </button>,
    )
  }

  if (!buttons.length) {
    return null
  }

  return <div className="flex flex-wrap items-center justify-end gap-3">{buttons}</div>
}

export default function ModeratorDashboard({
  moderator,
  matches,
  teams,
  tournament,
  moderators,
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
    <ActionButtons
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
