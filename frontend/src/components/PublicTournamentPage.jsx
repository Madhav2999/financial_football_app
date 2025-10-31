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
        {matches.map((match) => (
          <article
            key={match.id}
            className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.4em] text-slate-300">
                <span>{match.label}</span>
                <span className="rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.45em] text-white/80">
                  {match.status}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 text-white">
                  <span>{match.teamA?.name ?? "TBD"}</span>
                  <span className="text-xs text-slate-300">vs</span>
                  <span>{match.teamB?.name ?? "TBD"}</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                  Moderator: {match.moderatorName}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] uppercase">
                <span
                  className={`rounded-full border px-3 py-1 tracking-[0.45em] ${match.queueState.classes}`}
                >
                  {match.queueState.label}
                </span>
                {match.winner ? (
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 tracking-[0.45em] text-amber-100">
                    {match.winner.name} advanced
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        ))}
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
            const isActive = activeMatches?.some(
              (liveMatch) => liveMatch.tournamentMatchId === match.id
            );
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
              <img src="/assets/ff-logo.svg" alt="Financial Football" className="h-12 w-12" />
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
                  const teamA = teams.find((team) => team.id === teamAId);
                  const teamB = teams.find((team) => team.id === teamBId);
                  const winner = teams.find((team) => team.id === item.winnerId);

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-200 shadow shadow-black/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                        <span className="font-semibold">{teamA?.name} vs {teamB?.name}</span>
                        <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.45em] text-emerald-100">
                          {winner ? `${winner.name} won` : "Tied"}
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.45em] text-slate-400">Scoreline</p>
                      <p className="text-base font-semibold text-white">
                        {teamA?.name} {item.scores?.[teamAId] ?? 0} - {teamB?.name} {item.scores?.[teamBId] ?? 0}
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