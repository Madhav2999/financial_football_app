import ScoreboardTable from '../ScoreboardTable'

export default function AdminStandingsTab({ teams, tournament }) {
  const activeIds = tournament?.teams || []
  const activeTeams = activeIds.length ? teams.filter((t) => activeIds.includes(t.id)) : teams

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Tournament Standings</h2>
      <ScoreboardTable teams={activeTeams} showAvatars />
    </div>
  )
}
