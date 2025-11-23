export default function UpcomingOpponentLine({ match, teamId, teams }) {
  if (!match) return null

  const opponentId = match.teams.find((id) => id !== teamId)
  const opponent = teams.find((team) => team.id === opponentId)

  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
      Next Opponent: <span className="text-white">{opponent?.name ?? 'TBD'}</span>
    </p>
  )
}
