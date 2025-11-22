export default function ModeratorPresenceCard({ match, moderators }) {
  const moderator = match ? moderators?.find((item) => item.id === match.moderatorId) ?? null : null
  const status = match?.status ?? 'pending'
  const isLive = ['coin-toss', 'in-progress', 'paused'].includes(status)
  const indicatorClass = isLive ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300/90 text-amber-900'
  const indicatorLabel = isLive ? 'Connected' : 'Standby'
  const moderatorName = moderator ? moderator.name : 'Awaiting assignment'

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-200 shadow shadow-slate-900/40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Moderator</p>
          <p className="text-lg font-semibold text-white">{moderatorName}</p>
          <p className="text-xs text-slate-400">Ensuring fair play and smooth gameplay.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${indicatorClass}`}>{indicatorLabel}</span>
      </div>
    </div>
  )
}
