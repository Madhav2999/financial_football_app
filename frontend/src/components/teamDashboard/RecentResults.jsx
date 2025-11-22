export default function RecentResults({ history, teamId, teams }) {
  const entries = history.filter((match) => match.teams.includes(teamId)).slice(0, 5)

  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-lg shadow-slate-900/40">
        Your match history will appear here once you complete your first showdown.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const opponentId = entry.teams.find((id) => id !== teamId)
        const opponent = teams.find((team) => team.id === opponentId)
        const didWin = entry.winnerId === teamId
        const isTie = entry.winnerId === null

        return (
          <div
            key={entry.id}
            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">
                vs {opponent?.name}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  isTie
                    ? 'bg-slate-700 text-slate-200'
                    : didWin
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {isTie ? 'Tie' : didWin ? 'Win' : 'Loss'}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Final Score</p>
            <p className="text-base font-semibold text-white">
              {teams.find((team) => team.id === teamId)?.name} {entry.scores[teamId]} - {opponent?.name}{' '}
              {entry.scores[opponentId]}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {new Date(entry.completedAt).toLocaleString()}
            </p>
          </div>
        )
      })}
    </div>
  )
}
