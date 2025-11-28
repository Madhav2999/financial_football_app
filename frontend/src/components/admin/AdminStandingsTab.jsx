import ScoreboardTable from '../ScoreboardTable'

export default function AdminStandingsTab({ teams }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Tournament Standings</h2>
      <ScoreboardTable teams={teams} showAvatars />
    </div>
  )
}
