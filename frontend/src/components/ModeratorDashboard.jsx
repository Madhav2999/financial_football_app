// ⬇️ put your image anywhere you like (e.g. /public/assets/moderator-bg.jpg)
// then point the import (or plain string path) to it.
import bgHero from '/assets/moderator-bg.jpg'; // <-- update this path for your project

import { useMemo, useState } from 'react'
import { CoinTossPanel, LiveMatchPanel, MatchControlButtons } from './MatchPanels'

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
  resultToasts = [],
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

  const [openMatchIds, setOpenMatchIds] = useState(() => new Set());

  const toggleMatch = (id) => {
    setOpenMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    })
  }

  const expandAll = () => {
    setOpenMatchIds(new Set(interactiveAssignments.map((m) => m.id)))
  }

  const collapseAll = () => {
    setOpenMatchIds(new Set());
  }

  return (
    <div className="relative min-h-dvh md:min-h-screen text-slate-100">
      {Array.isArray(resultToasts) && resultToasts.length ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[2000] space-y-3">
          {resultToasts.map((toast) => (
            <div
              key={`${toast.id}-${toast.ts}`}
              className="rounded-2xl border border-white/25 bg-black/85 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-black/40"
            >
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
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
                Connection lost. Reconnecting...
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
                    {/* {interactiveAssignments.map((match) =>
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
                    )} */}
                    <div className='space-y-4'>
                      <button type='button' onClick={expandAll}
                        className='rounded-full border border-white/15 bg-slate-900/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-100 hover:border-sky-400 hover:text-sky-300'>
                        Expand all
                      </button>
                      <button type='button' onClick={collapseAll}
                        className='rounded-full border border-white/15 bg-slate-900/40 px-3 py-1 text-[11px] uppercase tracking-[0.2 em] text-slate-100 hover:border-sky-400 hover:text-sky-300'>
                        Collapse All
                      </button>
                    </div>
                    {interactiveAssignments.map((match) => {
                      const isOpen = openMatchIds.has(match.id);

                      const [teamAId, teamBId] = match.teams ?? [];
                      const teamA = teams.find((t) => t.id === teamAId) ?? null;
                      const teamB = teams.find((t) => t.id === teamBId) ?? null;

                      const title = `${teamA?.name ?? "TBD"} vs ${teamB?.name ?? "TBD"}`;

                      return (
                        <div key={match.id} className="rounded-3xl border border-white/10 bg-slate-900/50">
                          <button
                            type="button"
                            onClick={() => toggleMatch(match.id)}
                            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{match.status}</p>
                              <p className="mt-1 truncate text-base font-semibold text-white">
                                {title}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100">
                              {isOpen ? "Hide ▲" : "Show ▼"}
                            </span>
                          </button>

                          {isOpen ? (
                            <div className="px-6 pb-6">
                              {match.status === "coin-toss" ? (
                                <CoinTossPanel
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
                                  match={match}
                                  teams={teams}
                                  moderators={moderators}
                                  actions={renderActions(match)}
                                  description="Monitor scoring, track question progress, and adjust tempo as needed."
                                />
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

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
