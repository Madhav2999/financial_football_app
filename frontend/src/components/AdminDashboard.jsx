import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import AdminOverviewTab from './admin/AdminOverviewTab'
import AdminMatchesTab from './admin/AdminMatchesTab'
import AdminStandingsTab from './admin/AdminStandingsTab'
import AdminAnalyticsTab from './admin/AdminAnalyticsTab'
import AdminApprovalsTab from './admin/AdminApprovalsTab'
import AdminArchiveTab from './admin/AdminArchiveTab'
import AdminQuestionsTab from './admin/AdminQuestionsTab'
import AdminProfilesTab from './admin/AdminProfilesTab'
import AdminAllQuestionsTab from './admin/AdminAllQuestionsTab'

const NAV_ITEMS = [
  { to: 'overview', label: 'Overview' },
  { to: 'approvals', label: 'Approvals' },
  { to: 'matches', label: 'Matches' },
  { to: 'standings', label: 'Standings' },
  { to: 'analytics', label: 'Analytics' },
  { to: 'archive', label: 'Archive' },
  { to: 'questions', label: 'Questions' },
  { to: 'all-questions', label: 'All Questions' },
  { to: 'profiles', label: 'Profiles' },
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
  onDeleteTournament,
  onPauseMatch,
    onResumeMatch,
    onResetMatch,
    onGrantBye,
    onDismissRecent,
    onLogout,
    teamRegistrations,
    moderatorRegistrations,
    onApproveTeamRegistration,
    onApproveModeratorRegistration,
    onReloadData,
    onDeleteTeam,
    onDeleteModerator,
    analyticsSummary,
    analyticsQuestions,
    analyticsQuestionHistory,
    onDownloadArchive,
    fetchArchives,
    onDeleteTournamentArchive,
    onImportQuestions,
    onFetchAllQuestions,
    onSearchQuestions,
    onUpdateQuestion,
    onDeleteQuestion,
    profiles,
    onSetProfilePassword,
    onDeleteTeamProfile,
    onDeleteModeratorProfile,
  } = props

  return (
    <div
      className="min-h-screen bg-slate-850 text-slate-100"
      style={{
        backgroundImage: 'url(/assets/admin-background.jpg)',
        backgroundSize: '100% auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'repeat-y',
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-black/15" aria-hidden="true" />
      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className='flex flex-row gap-2'>
            <img src="/assets/ff-logo-2.png" alt="" className='h-20 w-20' />
            <h1 className="text-3xl font-semibold text-white pt-5">Tournament Admin Dashboard</h1>
          </div>
          <button
            onClick={onLogout}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-8xl flex-col gap-6 px-6 pb-10 pt-8 lg:flex-row">
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
                onDeleteTournament={onDeleteTournament}
                onDownloadArchive={onDownloadArchive}
                onDismissRecent={onDismissRecent}
              />
              }
            />
            <Route
              path="approvals"
              element={
                <AdminApprovalsTab
                  teamRegistrations={teamRegistrations}
                  moderatorRegistrations={moderatorRegistrations}
                  teams={teams}
                  moderators={moderators}
                  onApproveTeam={onApproveTeamRegistration}
                  onApproveModerator={onApproveModeratorRegistration}
                  onReload={onReloadData}
                  onDeleteTeam={onDeleteTeam}
                  onDeleteModerator={onDeleteModerator}
                />
              }
            />
            <Route
              path="matches"
              element={
                <AdminMatchesTab
                  tournament={tournament}
                  teams={teams}
                  activeMatches={activeMatches.filter((match) => match.status !== 'coin-toss')}
                  moderators={moderators}
                  tournamentLaunched={tournamentLaunched}
                  onPauseMatch={onPauseMatch}
                  onResumeMatch={onResumeMatch}
                  onResetMatch={onResetMatch}
                  onGrantBye={onGrantBye}
                />
              }
            />
            <Route path="standings" element={<AdminStandingsTab teams={teams} tournament={tournament} />} />
            <Route
              path="analytics"
              element={
                <AdminAnalyticsTab
                  history={history}
                  teams={teams}
                  summary={analyticsSummary}
                  questions={analyticsQuestions}
                  analyticsQuestionHistory={analyticsQuestionHistory}
                  tournament = {tournament}
                />
              }
            />
            <Route
              path="archive"
              element={
                <AdminArchiveTab
                  onFetchArchives={fetchArchives}
                  onDownload={onDownloadArchive}
                  onDelete={onDeleteTournamentArchive}
                />
              }
            />
            <Route
              path="questions"
              element={<AdminQuestionsTab onImport={onImportQuestions} />}
            />
            <Route
              path="all-questions"
              element={
                <AdminAllQuestionsTab
                  getQuestions={onFetchAllQuestions}
                  onSearch={onSearchQuestions}
                  onUpdate={onUpdateQuestion}
                  onDelete={onDeleteQuestion}
                />
              }
            />
            <Route
              path="profiles"
              element={
                <AdminProfilesTab
                  teams={profiles?.teams || teams}
                  moderators={profiles?.moderators || moderators}
                  onSetPassword={onSetProfilePassword}
                  onDeleteTeam={onDeleteTeamProfile}
                  onDeleteModerator={onDeleteModeratorProfile}
                />
              }
            />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
