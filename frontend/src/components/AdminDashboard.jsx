import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import AdminOverviewTab from './admin/AdminOverviewTab'
import AdminMatchesTab from './admin/AdminMatchesTab'
import AdminStandingsTab from './admin/AdminStandingsTab'
import AdminAnalyticsTab from './admin/AdminAnalyticsTab'

const NAV_ITEMS = [
  { to: 'overview', label: 'Overview' },
  { to: 'matches', label: 'Matches' },
  { to: 'standings', label: 'Standings' },
  { to: 'analytics', label: 'Analytics' },
]

export default function AdminDashboard(props) {
  const {
    teams,
    activeMatches,
    recentResult,
    history,
    tournament,
    moderators,
    superAdmin,
    selectedTeamIds,
    matchMakingLimit,
    tournamentLaunched,
    onToggleTeamSelection,
    onMatchMake,
    onLaunchTournament,
    onPauseMatch,
    onResumeMatch,
    onResetMatch,
    onGrantBye,
    onDismissRecent,
    onLogout,
  } = props

  return (
    <div className="absolute inset-0 min-h-screen bg-slate-850 text-slate-100" style={{
          backgroundImage: 'url(/assets/admin-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Admin Control Booth</p>
            <h1 className="text-3xl font-semibold text-white">Tournament Moderator</h1>
          </div>
          <button
            onClick={onLogout}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-10 pt-8 lg:flex-row">
        <aside className="w-full rounded-3xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-900/40 lg:w-64">
          <nav aria-label="Admin dashboard sections" className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition focus-visible:outline  focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${isActive
                    ? 'bg-slate-800 text-white shadow-inner shadow-slate-900/40'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
                end
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 space-y-8">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={
                <AdminOverviewTab
                  teams={teams}
                  moderators={moderators}
                  activeMatches={activeMatches}
                  history={history}
                  tournament={tournament}
                  superAdmin={superAdmin}
                  recentResult={recentResult}
                  selectedTeamIds={selectedTeamIds}
                  matchMakingLimit={matchMakingLimit}
                  tournamentLaunched={tournamentLaunched}
                  onToggleTeamSelection={onToggleTeamSelection}
                  onMatchMake={onMatchMake}
                  onLaunchTournament={onLaunchTournament}
                  onDismissRecent={onDismissRecent}
                />
              }
            />
            <Route
              path="matches"
              element={
                <AdminMatchesTab
                  tournament={tournament}
                  teams={teams}
                  activeMatches={activeMatches}
                  moderators={moderators}
                  tournamentLaunched={tournamentLaunched}
                  onPauseMatch={onPauseMatch}
                  onResumeMatch={onResumeMatch}
                  onResetMatch={onResetMatch}
                  onGrantBye={onGrantBye}
                />
              }
            />
            <Route path="standings" element={<AdminStandingsTab teams={teams} />} />
            <Route path="analytics" element={<AdminAnalyticsTab history={history} teams={teams} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
