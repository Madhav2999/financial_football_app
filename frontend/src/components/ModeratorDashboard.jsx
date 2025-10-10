import { useMemo } from 'react'

export default function ModeratorDashboard({ moderator, matches, teams, tournament, onLogout }) {
  const liveAssignments = useMemo(() => {
    if (!moderator) return []
    return matches.filter((match) => match.moderatorId === moderator.id)
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

  const hasAssignments = Boolean(liveAssignments.length || bracketAssignments.length)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator Console</p>
            <h1 className="text-2xl font-semibold text-white">
              {moderator ? `${moderator.name}'s Assignments` : 'Moderator Access'}
            </h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
          >
            Log out
          </button>
        </header>

        {!moderator ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
            <p>Moderator details could not be loaded. Try logging out and back in.</p>
          </section>
        ) : hasAssignments ? (
          <section className="space-y-6">
            {liveAssignments.length ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
                <h2 className="text-lg font-semibold text-white">Live Matches</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {liveAssignments.map((match) => {
                    const teamA = teams.find((team) => team.id === match.teams[0])
                    const teamB = teams.find((team) => team.id === match.teams[1])
                    return (
                      <li key={match.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="text-slate-200">{match.label}</p>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mt-1">{match.status}</p>
                        <p className="mt-2 text-sm text-slate-300">
                          {teamA?.name ?? 'TBD'} vs {teamB?.name ?? 'TBD'}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            {bracketAssignments.length ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
                <h2 className="text-lg font-semibold text-white">Upcoming Bracket Matches</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {bracketAssignments.map((assignment) => {
                    return (
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
                    )
                  })}
                </ul>
              </div>
            ) : null}
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
