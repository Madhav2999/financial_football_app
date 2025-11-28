function getTeamStatus(team) {
  if (team.eliminated) {
    return 'Eliminated'
  }
  if (team.losses >= 1) {
    return 'On the brink'
  }
  return 'In contention'
}

export default function ScoreboardTable({ teams, highlightTeamId, showAvatars = false }) {
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    return b.totalScore - a.totalScore
  })

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-slate-900/40">
      <table className="min-w-full divide-y divide-slate-800">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-6 py-4">Team</th>
            <th className="px-6 py-4">Wins</th>
            <th className="px-6 py-4">Losses</th>
            <th className="px-6 py-4">Total Points</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
          {sortedTeams.map((team) => (
            <tr
              key={team.id}
              className={`transition-colors ${
                team.id === highlightTeamId
                  ? 'bg-sky-500/10 text-white'
                  : 'hover:bg-slate-800/60'
              }`}
            >
              <td className="px-6 py-4 font-semibold">
                <div className="flex items-center gap-3">
                  {showAvatars && team.avatarUrl ? (
                    <img
                      src={team.avatarUrl}
                      alt={team.name}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
                    />
                  ) : null}
                  <span>{team.name}</span>
                </div>
              </td>
              <td className="px-6 py-4">{team.wins}</td>
              <td className="px-6 py-4">{team.losses}</td>
              <td className="px-6 py-4">{team.totalScore}</td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    team.eliminated
                      ? 'bg-rose-500/10 text-rose-300'
                      : team.losses >= 1
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  {getTeamStatus(team)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
