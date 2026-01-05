import UpcomingOpponentLine from './UpcomingOpponentLine'

export default function GameRoomPlaceholder({ tournamentLaunched, upcomingMatch, team, moderators, teams, tournament }) {
  const hasModerator = Boolean(upcomingMatch?.moderatorId)
  const moderator = hasModerator ? moderators?.find((item) => item.id === upcomingMatch.moderatorId) : null

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-200 shadow-xl shadow-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Game Room</p>
          <h3 className="text-xl font-bold text-white">
            {
              tournament.status == 'completed' ? 'Tournament Over' : 'Awaiting Moderator' 
            }
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            {tournamentLaunched
              ? 'The next match will begin shortly. Stay ready for the moderator to join.'
              : 'Tournament will launch once brackets are ready. Stay tuned!'}
          </p>
          {upcomingMatch ? <UpcomingOpponentLine match={upcomingMatch} teamId={team.id} teams={teams} /> : null}
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Assigned Moderator</p>
          <p className="text-base font-semibold text-white">{hasModerator ? moderator?.name ?? 'TBD' : 'To be assigned'}</p>
        </div>
      </div>
    </div>
  )
}
