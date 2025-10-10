export default function SuperAdminDashboard({ teams, activeMatches, matchHistory, moderators, tournament, onLogout }) {
  const tournamentStatus = tournament?.status ?? 'pending'
  const totalBracketMatches = tournament ? Object.keys(tournament.matches).length : 0
  const stageCount = tournament ? Object.keys(tournament.stages).length : 0
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">Super Admin Control</p>
            <h1 className="text-3xl font-semibold text-white">Tournament Operations Overview</h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            Log out
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Registered Teams</p>
            <p className="mt-3 text-3xl font-semibold text-white">{teams.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Moderators</p>
            <p className="mt-3 text-3xl font-semibold text-white">{moderators.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live Matches</p>
            <p className="mt-3 text-3xl font-semibold text-white">{activeMatches.filter((match) => match.status !== 'completed').length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completed Matches</p>
            <p className="mt-3 text-3xl font-semibold text-white">{matchHistory.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bracket Matches Seeded</p>
            <p className="mt-3 text-3xl font-semibold text-white">{totalBracketMatches}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Tournament Status</p>
          <p className="mt-3 text-lg text-white">{tournamentStatus.charAt(0).toUpperCase() + tournamentStatus.slice(1)}</p>
          <p className="mt-2 max-w-2xl text-slate-300">
            {stageCount} bracket stages are configured. Upcoming milestones will surface the bracket layout, live match
            control, and automated advancement based on match outcomes.
          </p>
        </section>
      </div>
    </div>
  )
}
