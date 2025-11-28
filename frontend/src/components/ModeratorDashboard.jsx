// ⬇️ put your image anywhere you like (e.g. /public/assets/moderator-bg.jpg)
// then point the import (or plain string path) to it.
import bgHero from '/assets/moderator-bg.jpg'; // <-- update this path for your project

import { useMemo } from 'react'
import { CoinTossPanel, LiveMatchPanel, MatchControlButtons } from './MatchPanels'
import RosterSelectionPanel from './RosterSelectionPanel'

function AssignmentHeader({ moderator }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator Console</p>
        <h1 className="text-2xl font-semibold text-white">
          {moderator ? `${moderator.name}'s Assignments` : 'Moderator Access'}
        </h1>
      </div>
    </header>
  )
}

function UpcomingAssignments({ bracketAssignments }) {
  if (!bracketAssignments.length) {
    return null
  }
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
      <h2 className="text-lg font-semibold text-white">Upcoming Bracket Matches</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-300">
        {bracketAssignments.map((assignment) => (
          <li key={assignment.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{assignment.stageLabel}</p>
                <p className="mt-1 text-base text-white">{assignment.label}</p>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-200">
                {assignment.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {assignment.teamA?.name ?? 'TBD'} vs {assignment.teamB?.name ?? 'TBD'}
            </p>
            {assignment.liveMatchId ? (
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-300">
                Linked live match: {assignment.liveMatchId}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ModeratorDashboard({
  moderator,
  matches,
  teams,
  tournament,
  moderators,
  onUploadAvatar,
  socketConnected,
  onFlipCoin,
  onSelectFirst,
  onPauseMatch,
  onResumeMatch,
  onResetMatch,
  onLogout,
}) {
  const interactiveAssignments = useMemo(() => {
    if (!moderator) return []
    return matches
      .filter((match) => match.moderatorId === moderator.id && match.status !== 'completed')
      .sort((left, right) => {
        const priority = { 'coin-toss': 0, paused: 1, 'in-progress': 2 }
        return (priority[left.status] ?? 3) - (priority[right.status] ?? 3)
      })
  }, [matches, moderator])

  const bracketAssignments = useMemo(() => {
    if (!tournament || !moderator) return []

    return Object.values(tournament.matches)
      .filter((match) => match.moderatorId === moderator.id && match.status !== 'completed')
      .map((match) => {
        const stage = tournament.stages[match.stageId]
        const [teamAId, teamBId] = match.teams
        const teamA = teams.find((team) => team.id === teamAId) ?? null
        const teamB = teams.find((team) => team.id === teamBId) ?? null
        const liveMatch = matches.find((item) => item.tournamentMatchId === match.id) ?? null
        return {
          id: match.id,
          label: match.label,
          bracket: stage?.bracket ?? 'bracket',
          stageLabel: stage?.label ?? 'Bracket Match',
          teamA,
          teamB,
          status: match.status,
          liveMatchId: liveMatch?.id ?? null,
        }
      })
      .sort((l, r) => {
        const order = { active: 0, scheduled: 1, pending: 2 }
        return (order[l.status] ?? 3) - (order[r.status] ?? 3)
      })
  }, [tournament, moderator, teams, matches])

  const hasAssignments = Boolean(interactiveAssignments.length || bracketAssignments.length)

  const renderActions = (match) => (
    <MatchControlButtons
      match={match}
      onPause={() => onPauseMatch?.(match.id)}
      onResume={() => onResumeMatch?.(match.id)}
      onReset={() => onResetMatch?.(match.id)}
    />
  )

  return (
    <div className="relative min-h-dvh md:min-h-screen text-slate-100">
      {/* background image + gradient/blur overlay */}
      {/* Fixed, viewport-sized background */}
      <div className="fixed inset-0 -z-10">
        <img
          src={bgHero}            // your image import/path
          alt=""
          className="h-dvh w-screen md:h-screen object-cover object-[70%_35%] brightness-110 contrast-105"
        />

        {/* light vertical fade so text stays readable but image is visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/25" />

        {/* soft edge vignette only */}
        {/* <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_72%_22%,transparent,rgba(2,6,23,0.25)_55%,rgba(2,6,23,0.4)_90%)]" /> */}
      </div>


      <div className="relative p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <AssignmentHeader moderator={moderator} />
            {!socketConnected ? (
              <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                Connection lost. Please refresh.
              </span>
            ) : null}
            {moderator?.avatarUrl ? (
              <img
                src={moderator.avatarUrl}
                alt={moderator.displayName || moderator.loginId}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : null}
            {onUploadAvatar ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/20 bg-slate-900/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
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
                        onUploadAvatar(reader.result).catch((err) => console.error('Avatar upload failed', err))
                      }
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <span>Update Avatar</span>
              </label>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-white/15 bg-slate-900/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
            >
              Log out
            </button>
          </div>

          {!moderator ? (
            <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200 backdrop-blur-md">
              <p>Moderator details could not be loaded. Try logging out and back in.</p>
            </section>
          ) : hasAssignments ? (
            <section className="space-y-6">
              {interactiveAssignments.length ? (
                <div className="space-y-6 rounded-3xl">
                  <h2 className="text-3xl font-semibold text-white items-center flex justify-center">Quiz Moderator</h2>
                  <div className="space-y-6">
                    {interactiveAssignments.map((match) =>
                      match.status === 'coin-toss' ? (
                        <CoinTossPanel
                          key={match.id}
                          match={match}
                          teams={teams}
                          moderators={moderators}
                          canControl
                          onFlip={() => onFlipCoin?.(match.id)}
                          onSelectFirst={(deciderId, firstTeamId) =>
                            onSelectFirst?.(match.id, deciderId, firstTeamId)
                          }
                          description="Flip the coin and choose who receives the opening question."
                        />
                      ) : (
                        <LiveMatchPanel
                          key={match.id}
                          match={match}
                          teams={teams}
                          moderators={moderators}
                          actions={renderActions(match)}
                          description="Monitor scoring, track question progress, and adjust tempo as needed."
                        />
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {/* <UpcomingAssignments bracketAssignments={bracketAssignments} /> */}
            </section>
          ) : (
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300 backdrop-blur-md">
              <p>No bracket assignments yet. Once the tournament assigns you to a match, it will appear here.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
