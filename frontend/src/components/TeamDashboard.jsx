import { useEffect, useMemo, useState } from 'react'
import CoinTossStatusCard from './teamDashboard/CoinTossStatusCard'
import CurrentMatchCard from './teamDashboard/CurrentMatchCard'
import GameRoomPlaceholder from './teamDashboard/GameRoomPlaceholder'
import ModeratorPresenceCard from './teamDashboard/ModeratorPresenceCard'
import RecentResults from './teamDashboard/RecentResults'
import UpcomingOpponentLine from './teamDashboard/UpcomingOpponentLine'
import { LiveMatchPanel } from './MatchPanels'
import ScoreboardTable from './ScoreboardTable'

function OverviewPanel({ team, tournamentLaunched, upcomingMatch, teams, moderators }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(260px,0.8fr)]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200 shadow shadow-slate-900/30">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Team profile</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{team.name}</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wins</p>
              <p className="text-xl font-bold text-white">{team.wins}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Losses</p>
              <p className="text-xl font-bold text-white">{team.losses}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total points</p>
              <p className="text-xl font-bold text-white">{team.totalScore}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-300">
            Stay sharp—leaderboards refresh automatically as matches conclude, so your seeding may shift between rounds.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200 shadow shadow-slate-900/30">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Tournament status</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {tournamentLaunched ? 'Tournament in progress' : 'Tournament Not Started Yet'}
          </h3>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next opponent</p>
            <UpcomingOpponentLine match={upcomingMatch} teamId={team.id} teams={teams} />
          </div>

          <p className="mt-4 text-sm text-slate-300">
            {tournamentLaunched
              ? 'Once the moderator activates your match, you can enter the Game Room to follow the toss and answer live.'
              : 'We will announce the official start shortly. Use this time to review practice questions and coordinate your lineup.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1">
              {moderators.length ? `${moderators.length} moderators on duty` : 'Moderator roster pending'}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1">
              Double elimination format
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200 shadow shadow-slate-900/30">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Locker room briefing</p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200">
          <li>Review the last five matches below to study opponent tendencies.</li>
          <li>Keep a captain assigned to coin-toss decisions—they arrive quickly once moderators connect.</li>
          <li>Use the Game Room when live prompts begin so your answers lock in immediately.</li>
        </ul>
      </div>
    </div>
  )
}

function AnalyticsSection({ team, teams, history, tournament }) {
  const currentTournamentId = tournament?.backendId || tournament?.id || null
  const activeIds = tournament?.teams || []
  const activeTeams = activeIds.length ? teams.filter((t) => activeIds.includes(t.id)) : teams
  const filteredHistory =
    currentTournamentId && Array.isArray(history)
      ? history.filter(
          (m) =>
            m.tournamentId === currentTournamentId ||
            m.tournament?.id === currentTournamentId ||
            m.metadata?.tournamentId === currentTournamentId,
        )
      : history

  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr,1fr]">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Tournament Standings</h2>
        <ScoreboardTable teams={activeTeams} highlightTeamId={team.id} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Recent Matches</h2>
        <RecentResults history={filteredHistory} teamId={team.id} teams={activeTeams} />
      </div>
    </section>
  )
}

export default function TeamDashboard({
  team,
  teams,
  match,
  history,
  tournament,
  tournamentLaunched,
  moderators = [],
  resultToast,
  answerToast,
  onUploadAvatar,
  socketConnected,
  onAnswer,
  onSelectFirst,
  onLogout,
}) {
  const [viewMode, setViewMode] = useState('overview')
  const [avatarStatus, setAvatarStatus] = useState(null)
  const safeModerators = useMemo(
    () => (Array.isArray(moderators) ? moderators : []),
    [moderators],
  )
  const tournamentActive = Boolean(tournamentLaunched && tournament)
  const isInLiveMatch = Boolean(match && match.teams.includes(team.id))

  useEffect(() => {
    if (!tournamentActive && viewMode !== 'overview') {
      setViewMode('overview')
    }
  }, [tournamentActive, viewMode])

  useEffect(() => {
    if (tournamentActive && isInLiveMatch) {
      setViewMode('game-room')
    }
  }, [tournamentActive, isInLiveMatch])

  const upcomingMatch = useMemo(() => {
    if (match?.tournamentMatchId && tournament?.matches?.[match.tournamentMatchId]) {
      return tournament.matches[match.tournamentMatchId]
    }

    if (!tournament?.matches) return null

    const candidateMatches = Object.values(tournament.matches).filter((item) => {
      if (!Array.isArray(item?.teams)) return false
      if (item.status === 'completed') return false
      return item.teams.includes(team.id)
    })

    if (!candidateMatches.length) return null

    const stageOrder = (item) => tournament.stages?.[item.stageId]?.order ?? Number.MAX_SAFE_INTEGER

    return candidateMatches.sort((left, right) => {
      const orderDiff = stageOrder(left) - stageOrder(right)
      if (orderDiff !== 0) return orderDiff
      return (left.label ?? left.id).localeCompare(right.label ?? right.id)
    })[0]
  }, [match?.tournamentMatchId, team.id, tournament])

  const assignedModerator = useMemo(() => {
    if (!match) return null
    return safeModerators.find((item) => item.id === match.moderatorId) ?? null
  }, [match, safeModerators])

  const showGameRoom = tournamentActive && viewMode === 'game-room'
  const tournamentStatusLabel = tournamentActive
    ? 'Tournament Live'
    : tournamentLaunched
      ? 'Tournament syncing'
      : 'Awaiting kickoff'

  const handleSelectFirstTeam = (matchId, firstTeamId) => {
    onSelectFirst?.(matchId, firstTeamId)
  }

  const handleAnswer = (matchId, option, questionInstanceId) => {
    onAnswer?.(matchId, option, questionInstanceId)
  }

  return (
    <div
      className="
        relative min-h-screen text-slate-100 antialiased
        [--txtshadow:0_1px_2px_rgba(0,0,0,.85)]
        [--headshadow:0_2px_8px_rgba(0,0,0,.9)]
        [&_*:where(h1,h2,h3)]:[text-shadow:var(--headshadow)]
        [&_*:where(h1,h2,h3)]:[-webkit-text-stroke:0.4px_rgba(0,0,0,.45)]
        [&_*:where(p,span,li,small,label,strong)]:[text-shadow:var(--txtshadow)]
        [&_button]:[text-shadow:0_1px_2px_rgba(0,0,0,.7)]
      "
    >
      <video
        className="fixed inset-0 -z-10 h-dvh w-screen md:h-screen object-cover object-center brightness-30 contrast-125"
        src="/assets/american-football.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="fixed inset-0 -z-10 bg-black/55" aria-hidden="true" />

      <header className="border-b border-white/10 bg-transparent">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Team Arena</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome, {team.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {team.avatarUrl ? (
              <img
                src={team.avatarUrl}
                alt={team.name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : null}
            <a
              href="https://drive.google.com/file/d/1RStK7_4Y-tqvMBv_iwxE6CjawFLbD4yX/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-200 hover:border-amber-300 hover:text-amber-100"
            >
              Media consent: print and bring a signed copy to the venue
            </a>
            <span className="rounded-full border border-white/20 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
              {tournamentStatusLabel}
            </span>
            <div className="rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm">
              <div className="flex items-center gap-3 text-slate-100">
                <span className="font-semibold text-white">Wins:</span>
                <span>{team.wins}</span>
                <span className="font-semibold text-white">Losses:</span>
                <span>{team.losses}</span>
              </div>
            </div>
            {team.avatarUrl ? (
              <img
                src={team.avatarUrl}
                alt={team.name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : null}
            {avatarStatus ? (
              <span className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                {avatarStatus}
              </span>
            ) : null}
            {onUploadAvatar ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/20 bg-slate-900/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setAvatarStatus('Updating avatar...')
                        onUploadAvatar(reader.result)
                          .then((url) => {
                            setAvatarStatus(url ? 'Avatar updated' : 'Update failed')
                          })
                          .catch((err) => {
                            console.error('Avatar upload failed', err)
                            setAvatarStatus('Update failed')
                          })
                          .finally(() => {
                            setTimeout(() => setAvatarStatus(null), 2000)
                          })
                      }
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <span>Update Avatar</span>
              </label>
            ) : null}
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-900/40 p-1 text-sm">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`rounded-xl px-4 py-2 font-semibold transition ${viewMode === 'overview'
                  ? 'bg-sky-500 text-white shadow shadow-sky-500/40'
                  : 'text-slate-200 hover:text-white'
                  }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => tournamentActive && setViewMode('game-room')}
                disabled={!tournamentActive}
                className={`rounded-xl px-4 py-2 font-semibold transition ${showGameRoom
                  ? 'bg-emerald-500 text-white shadow shadow-emerald-500/40'
                  : tournamentActive
                    ? 'text-slate-200 hover:text-white'
                    : 'cursor-not-allowed text-slate-500'
                  }`}
              >
                Game Room
              </button>
            </div>
            <a
              href="/tournament"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/20 bg-slate-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/40"
            >
              View Bracket
            </a>
            {!socketConnected ? (
              <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                Connection lost. Reconnecting…
              </span>
            ) : null}
            <button
              onClick={onLogout}
              className="rounded-2xl border border-white/25 bg-transparent px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40"
              type="button"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 relative">
        {resultToast ? (
          <div className="pointer-events-none absolute left-1/2 top-4 z-50 w-full max-w-xl -translate-x-1/2 px-6">
            <div className="rounded-3xl border border-white/40 bg-black/90 px-7 py-5 text-center text-xl font-extrabold text-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.75)] backdrop-blur-md">
              {resultToast.message}
            </div>
          </div>
        ) : null}
        {answerToast ? (
          <div className="pointer-events-none absolute left-1/2 top-24 z-40 w-full max-w-lg -translate-x-1/2 px-6">
            <div className="rounded-2xl border border-amber-400/60 bg-amber-500/10 px-5 py-3 text-center text-base font-semibold text-amber-100 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.75)] backdrop-blur-md">
              {answerToast.message}
            </div>
          </div>
        ) : null}
        {showGameRoom ? (
          <div className="space-y-8">
            {isInLiveMatch ? (
              <>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr),minmax(260px,0.85fr)]">
                  <div>
                    {match.status === 'coin-toss' ? (
                      <CoinTossStatusCard
                        match={match}
                        teamId={team.id}
                        teams={teams}
                        onSelectFirst={handleSelectFirstTeam}
                      />
                    ) : (
                      <CurrentMatchCard match={match} teamId={team.id} teams={teams} onAnswer={handleAnswer} />
                    )}
                  </div>

                  <div className="space-y-6">
                    <ModeratorPresenceCard match={match} moderators={safeModerators} />

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-200 shadow shadow-slate-900/40">
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Match briefing</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{match.label ?? 'Live match'}</h3>
                      <p className="mt-3 text-sm text-slate-300">
                        {assignedModerator
                          ? `${assignedModerator.name} is supervising from the control booth. Keep your communications clear and be ready for quick rulings.`
                          : 'A moderator will connect shortly to supervise this matchup. Stay prepared for the toss and opening prompt.'}
                      </p>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Format</p>
                          <p className="text-sm font-semibold text-white">Double elimination — second loss knocks you out.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your record</p>
                          <p className="text-sm font-semibold text-white">{team.wins}W / {team.losses}L</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {match.status === 'coin-toss' ? (
                  <div className="rounded-3xl border border-dashed border-white/20 bg-slate-900/40 p-6 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator feed</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Once the first question is live, you&apos;ll see the moderator&apos;s control-room view here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator feed</p>
                      <h2 className="mt-2 text-xl font-bold text-white">What the moderator sees</h2>
                      <p className="mt-2 text-sm text-slate-300">
                        This mirrored panel shows the same scoreboard, timers, and prompts the moderator uses to officiate your match in real time.
                      </p>
                    </div>
                    <LiveMatchPanel
                      match={match}
                      teams={teams}
                      moderators={safeModerators}
                      actions={null}
                      description="Mirrored from the moderator console for transparency."
                    />
                  </div>
                )}
              </>
            ) : (
              <GameRoomPlaceholder
                tournamentLaunched={tournamentLaunched}
                upcomingMatch={upcomingMatch}
                team={team}
                moderators={safeModerators}
                teams={teams}
                tournament={tournament}
              />
            )}
          </div>
        ) : (
          <>
            <OverviewPanel
              team={team}
              teams={teams}
              tournamentLaunched={tournamentLaunched}
              upcomingMatch={upcomingMatch}
              moderators={safeModerators}
            />
            <AnalyticsSection team={team} teams={teams} history={history} tournament={tournament} />
          </>
        )}


      </main>
    </div>
  )
}
