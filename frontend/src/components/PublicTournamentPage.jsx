import { useMemo } from "react";
import { Link } from "react-router-dom";
import { listMatchesForStage, listStages } from "../tournament/engine";

const STATUS_STYLES = {
  live: "border-emerald-400/80 bg-emerald-400/10 text-emerald-200",
  ready: "border-sky-400/80 bg-sky-400/10 text-sky-100",
  pending: "border-white/20 bg-white/10 text-slate-200",
  awaiting: "border-white/10 bg-black/20 text-slate-300",
  completed: "border-amber-400/80 bg-amber-400/10 text-amber-100",
};

function resolveStatus(match, { teamA, teamB, isActive }) {
  if (match.status === "completed") {
    return { label: "Final", classes: STATUS_STYLES.completed };
  }

  if (isActive) {
    return { label: "Live", classes: STATUS_STYLES.live };
  }

  if (!teamA || !teamB) {
    return { label: "Awaiting Teams", classes: STATUS_STYLES.awaiting };
  }

  if (match.matchRefId) {
    return { label: "Awaiting Toss", classes: STATUS_STYLES.ready };
  }

  if (match.status === "scheduled") {
    return { label: "Ready", classes: STATUS_STYLES.ready };
  }

  return { label: "Pending", classes: STATUS_STYLES.pending };
}

function StageColumn({ title, matches }) {
  if (!matches.length) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-300/80">Stage</p>
        <h3 className="mt-1 text-lg font-semibold text-white/90">{title}</h3>
      </div>
      <div className="space-y-4">
        {matches.map((match) => {
          const isWatchable = Boolean(match.isActive && match.liveMatchId);
          const baseClasses = 'rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur transition';
          const watchableClasses = isWatchable
            ? ' group-hover:border-emerald-400/60 group-hover:shadow-emerald-500/30'
            : '';

          const body = (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.4em] text-slate-300">
                <span>{match.label}</span>
                <span className="rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.45em] text-white/80">
                  {match.status}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 text-white">
                  <span>{match.teamA?.name ?? 'TBD'}</span>
                  <span className="text-xs text-slate-300">vs</span>
                  <span>{match.teamB?.name ?? 'TBD'}</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                  Moderator: {match.moderatorName}
                </div>
              </div>
              {match.byeAwarded ? (
                <div className="text-[11px] uppercase tracking-[0.45em] text-emerald-300">
                  Advanced by bye
                </div>
              ) : null}
              <div className="flex items-center justify-between text-[11px] uppercase">
                <span
                  className={`rounded-full border px-3 py-1 tracking-[0.45em] ${match.queueState.classes}`}
                >
                  {isWatchable ? `${match.queueState.label} • Watch` : match.queueState.label}
                </span>
                {match.winner ? (
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 tracking-[0.45em] text-amber-100">
                    {match.winner.name} advanced
                  </span>
                ) : null}
              </div>
            </div>
          );

          if (isWatchable) {
            return (
              <Link
                key={match.id}
                to={`/tournament/match/${match.liveMatchId}`}
                className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
                aria-label={`Watch ${match.teamA?.name ?? 'Team A'} vs ${match.teamB?.name ?? 'Team B'} live`}
              >
                <article className={`${baseClasses}${watchableClasses}`}>{body}</article>
              </Link>
            );
          }

          return (
            <article key={match.id} className={baseClasses}>
              {body}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function PublicTournamentPage({
  tournament,
  teams,
  activeMatches,
  moderators = [],
  history = [],
}) {
  const podium = useMemo(() => {
    const teamName = (id) => teams.find((t) => t.id === id)?.name || id || 'TBD'
    const matchesState = Object.values(tournament?.matches ?? tournament?.state?.matches ?? [])
    const getTimestamp = (m) => m?.completedAt || (m?.history?.[m.history.length - 1]?.timestamp) || 0

    const finalsCompleted = matchesState
      .filter((m) => (m.id || '').includes('final'))
      .sort((a, b) => {
        const roundA = a.meta?.roundNumber ?? 0
        const roundB = b.meta?.roundNumber ?? 0
        if (roundA !== roundB) return roundB - roundA
        return getTimestamp(b) - getTimestamp(a)
      })
    const finalMatch = finalsCompleted[0] || null

    const goldId = finalMatch?.winnerId || null
    const silverId = finalMatch?.loserId || null

    let bronzeId = null
    if (teams.length >= 3) {
      const losersCompleted = matchesState
        .filter((m) => (m.id || '').includes('losers'))
        .sort((a, b) => getTimestamp(b) - getTimestamp(a))
      bronzeId = losersCompleted[0]?.loserId || null
      if (!bronzeId && finalMatch) bronzeId = finalMatch.loserId || null
    }

    return {
      gold: goldId ? { id: goldId, name: teamName(goldId) } : null,
      silver: silverId ? { id: silverId, name: teamName(silverId) } : null,
      bronze: bronzeId ? { id: bronzeId, name: teamName(bronzeId) } : null,
    }
  }, [tournament?.state?.matches, teams])


  const stageDetails = useMemo(() => {
    if (!tournament) {
      return [];
    }

    return listStages(tournament)
      .filter((stage) => stage?.matchIds?.length)
      .map((stage) => {
        const matches = listMatchesForStage(tournament, stage.id)
          .filter(Boolean)
          .map((match) => {
            const [teamAId, teamBId] = match.teams;
            const teamA = teams.find((team) => team.id === teamAId) ?? null;
            const teamB = teams.find((team) => team.id === teamBId) ?? null;
            const liveMatch = activeMatches?.find((item) => item.tournamentMatchId === match.id) ?? null;
            const isActive = Boolean(liveMatch);
            const moderatorName =
              moderators.find((mod) => mod.id === match.moderatorId)?.name ?? "Unassigned";
            const queueState = resolveStatus(match, { teamA, teamB, isActive });
            const winner =
              match.winnerId != null ? teams.find((team) => team.id === match.winnerId) ?? null : null;

            return {
              ...match,
              teamA,
              teamB,
              isActive,
              moderatorName,
              queueState,
              liveMatchId: liveMatch?.id ?? null,
              byeAwarded: Boolean(match.meta?.byeAwarded),
              winner,
            };
          });

        return {
          id: stage.id,
          label: stage.label,
          bracket: stage.bracket,
          order: stage.order,
          matches,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [tournament, teams, activeMatches, moderators]);

  const grouped = useMemo(() => {
    return stageDetails.reduce(
      (accumulator, stage) => {
        if (stage.bracket === "winners") {
          accumulator.winners.push(stage);
        } else if (stage.bracket === "losers") {
          accumulator.losers.push(stage);
        } else {
          accumulator.finals.push(stage);
        }
        return accumulator;
      },
      { winners: [], losers: [], finals: [] }
    );
  }, [stageDetails]);

  const hasMatches = stageDetails.some((stage) => stage.matches.length);
  const recentHistory = history.slice(0, 5);

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.85) 45%, rgba(15,23,42,0.95) 100%), url(/assets/public-tournament-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-gray/50 pb-24">
        <header className="border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
            <Link to="/" className="flex items-center gap-4">
              <img src="/assets/ff-logo-2.png" alt="Financial Football" className="h-12 w-12 bg-amber-50 rounded-full" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Financial Football</p>
                <p className="text-lg font-semibold text-white">Championship Bracket</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em]">
              <Link
                to="/"
                className="rounded-full border border-white/30 px-4 py-2 text-white transition hover:border-emerald-300 hover:text-emerald-300"
              >
                Home
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/30 px-4 py-2 text-white transition hover:border-emerald-300 hover:text-emerald-300"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
          <section className="space-y-4 text-center lg:text-left">
            <p className="text-xs uppercase tracking-[0.65em] text-amber-300">Tournament Center</p>
            <h1 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
              Follow the Financial Football Showdown in Real Time
            </h1>
            <p className="mx-auto max-w-3xl text-base text-slate-200 lg:mx-0">
              Explore the latest matchups, track live results, and celebrate every upset. This bracket updates in
              real time as moderators advance teams through the winners and losers brackets all the way to the grand
              final.
            </p>
          </section>

          {!tournament ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-slate-200 backdrop-blur">
              <p className="text-lg font-semibold">The tournament has not been launched yet.</p>
              <p className="mt-2 text-sm text-slate-300">
                Check back soon to see teams advance through the championship bracket.
              </p>
            </div>
          ) : null}

          {tournament && !hasMatches ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-slate-200 backdrop-blur">
              <p className="text-lg font-semibold">Bracket seeding is underway.</p>
              <p className="mt-2 text-sm text-slate-300">
                Once the first matches are scheduled they will appear here automatically.
              </p>
            </div>
          ) : null}

          {tournament && hasMatches ? (
            <section className="space-y-10">
              {podium ? (
                <div className="rounded-3xl border border-amber-400/30 bg-amber-400/5 p-6 shadow shadow-amber-500/20 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.55em] text-amber-300">Podium</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {["gold", "silver", "bronze"].map((medal) => {
                      const entry = podium[medal];
                      if (!entry) return (
                        <div key={medal} className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center text-slate-300">
                          <p className="text-xs uppercase tracking-[0.45em]">{medal}</p>
                          <p className="mt-2 text-sm">TBD</p>
                        </div>
                      );
                      const color =
                        medal === "gold"
                          ? "text-amber-200 border-amber-300/60 bg-amber-300/10"
                          : medal === "silver"
                            ? "text-slate-100 border-slate-300/60 bg-slate-300/10"
                            : "text-amber-400 border-amber-400/50 bg-amber-400/10";
                      const label = medal === "gold" ? "1st" : medal === "silver" ? "2nd" : "3rd";
                      return (
                        <div
                          key={medal}
                          className={`rounded-2xl border ${color} p-4 text-center shadow-sm shadow-black/40`}
                        >
                          <p className="text-xs uppercase tracking-[0.5em]">{label}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{entry.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr]">
                <div className="space-y-8">
                  {grouped.winners.map((stage) => (
                    <StageColumn key={stage.id} title={stage.label} matches={stage.matches} />
                  ))}
                </div>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-1 text-[11px] uppercase tracking-[0.55em] text-amber-100">
                      Finals Hub
                    </span>
                    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-amber-400/60 bg-black/40 text-4xl shadow-inner shadow-amber-500/20">
                      🏆
                    </div>
                    <p className="max-w-xs text-sm text-slate-200">
                      Winners clash here for the title. A bracket reset triggers if the challenger forces a rematch.
                    </p>
                  </div>
                  <div className="w-full space-y-6">
                    {grouped.finals.map((stage) => (
                      <StageColumn key={stage.id} title={stage.label} matches={stage.matches} />
                    ))}
                  </div>
                </div>
                <div className="space-y-8">
                  {grouped.losers.map((stage) => (
                    <StageColumn key={stage.id} title={stage.label} matches={stage.matches} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {recentHistory.length ? (
            <section className="rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-amber-300/80">Recent Finals</p>
                  <h2 className="text-2xl font-semibold text-white">Completed Matches</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {recentHistory.map((item) => {
                  const [teamAId, teamBId] = item.teams;
                  const teamAName = item.homeTeamName || teams.find((team) => team.id === teamAId)?.name || 'Team A';
                  const teamBName = item.awayTeamName || teams.find((team) => team.id === teamBId)?.name || 'Team B';
                  const winnerName =
                    item.winnerTeamName || teams.find((team) => team.id === item.winnerId)?.name || null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-200 shadow shadow-black/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                        <span className="font-semibold">{teamAName} vs {teamBName}</span>
                        <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.45em] text-emerald-100">
                          {winnerName ? `${winnerName} won` : "Tied"}
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.45em] text-slate-400">Scoreline</p>
                      <p className="text-base font-semibold text-white">
                        {teamAName} {item.scores?.[teamAId] ?? 0} - {teamBName} {item.scores?.[teamBId] ?? 0}
                      </p>
                      <p className="mt-3 text-xs text-slate-400">
                        {new Date(item.completedAt ?? Date.now()).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
