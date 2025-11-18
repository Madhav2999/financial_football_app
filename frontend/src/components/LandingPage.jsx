import { useState, useEffect } from "react";
import AuthenticationGateway from "./AuthenticationGateway";
import { Link, NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "#top" },
  { id: "about", label: "About Us", href: "#about" },
  { id: "play", label: "How To Play", href: "/howtoplay" },
  // { id: "bracket", label: "Tournament Bracket", href: "/tournament" },
]

const PLAY_CARDS = [
  {
    id: 'double-elim',
    title: 'Double Elimination',
    description: 'Teams get a second chance in the losers bracket to keep the dream alive.',
    color: 'bg-sky-50 text-sky-700',
    accent: 'text-sky-500',
  },
  {
    id: 'dynamic-scoring',
    title: 'Dynamic Scoring',
    description: 'Primary answers are worth 3 points, but steals add clutch 1-point swings.',
    color: 'bg-orange-50 text-orange-700',
    accent: 'text-orange-500',
  },
  {
    id: 'timed-questions',
    title: 'Timed Questions',
    description: '20 seconds on the clock keeps teams hustling. 10 seconds when stealing.',
    color: 'bg-emerald-50 text-emerald-700',
    accent: 'text-emerald-500',
  },
  {
    id: 'coin-toss',
    title: 'Coin Toss',
    description: 'Fair mechanics decide question order before every showdown.',
    color: 'bg-purple-50 text-purple-700',
    accent: 'text-purple-500',
  },
]
const recentHighlights = [
  {
    id: "h1",
    title: "Team 1 vs Team 2",
    timestamp: "• Live",
    summary: "4th Match, Group A — Challenge Cup 2025, Tampa, Florida",
    thumb: "/assets/hero-runner.jpg",
  },
  {
    id: "h2",
    title: "Team 3 vs Team 4",
    timestamp: "Today, 08:00 PM",
    summary: "Group A — Challenge Cup 2025, Tampa, Florida",
    thumb: "/assets/financial-football.jpg",
  },
  {
    id: "h3",
    title: "Team 5 vs Team 6",
    timestamp: "Yesterday",
    summary: "Group B — Challenge Cup 2025",
    thumb: "/assets/stay-updated.jpg",
  },
  {
    id: "h4",
    title: "Weekly Recap",
    timestamp: "2d ago",
    summary: "Top plays and key moments",
    thumb: "/assets/stay-updated.jpg",
  },
];


export default function LandingPage({
  teams,
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  authError,
  onClearAuthError,
}) {
  const standings = [...teams]
    .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore)
    .slice(0, 5)

  // const recentHighlights = history.slice(0, 2).map((entry) => formatHistoryEntry(entry, teams))

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('team');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 2) % recentHighlights.length);
    }, 3000); // change every 3 s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthOpen]);

  const visibleCards = recentHighlights.slice(currentIndex, currentIndex + 2);

  const openAuth = (mode = 'team') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
    onClearAuthError?.();
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
    onClearAuthError?.();
  };


  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
      {isAuthOpen ? (
        <AuthenticationGateway
          initialMode={authMode}
          onTeamLogin={onTeamLogin}
          onAdminLogin={onAdminLogin}
          onModeratorLogin={onModeratorLogin}
          error={authError}
          displayVariant="modal"
          showRegistrationTab
          onClose={closeAuth}
        />
      ) : null}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/hero-runner.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-4 py-6 text-sm font-semibold text-white">
            <div className="flex items-center gap-4">
              <a href="/"><img src="/assets/ff-logo-2.png" alt="Financial Football" className="h-25 w-25 bg-amber-50 rounded-full" /></a>
              <div>
                <p className="text-lg uppercase tracking-[0.2em] text-emerald-300">Financial Football</p>
                <p className="text-xs font-semibold">Powered by Suncoast Credit Union</p>
              </div>
            </div>
            <div className="hidden items-center gap-5 md:flex">
              {NAV_ITEMS.map((item) =>
                item.href.startsWith("#") ? (
                  <a
                    key={item.id}
                    href={item.href}
                    className="tracking-[0.05em] transition hover:text-emerald-300"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="tracking-[0.05em] transition hover:text-emerald-300"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* <button
                type="button"
                onClick={() => openAuth('register')}
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest text-white transition hover:border-emerald-300 hover:text-emerald-300 cursor-pointer"
              >
                Register Team
              </button>
              <button
                type="button"
                onClick={() => openAuth('moderator')}
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest transition hover:border-emerald-300 hover:text-emerald-300 cursor-pointer"
              >
                Moderator Login
              </button> */}
              <button
                type="button"
                onClick={() => openAuth('team')}
                className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-2 text-xs uppercase tracking-[0.3em] text-slate-900 transition hover:bg-emerald-300 cursor-pointer"
              >
                Enter Tournament
              </button>
              <Link
                to="/tournament"
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-emerald-300 hover:text-emerald-300"
              >
                View Bracket
              </Link>
            </div>
          </nav>

          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-30 pt-12 text-white lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-6">
              <p className="text-sm uppercase tracking-[0.5em] text-emerald-300">Join the Ultimate</p>
              <h1 className="text-5xl font-semibold leading-tight lg:text-6xl">Financial Football Quiz Showdown</h1>
              <p className="max-w-xl text-lg text-slate-200">
                Double elimination drama. Rapid-fire questions. Strategic coin tosses. Rally your roster and conquer the bracket.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => openAuth('team')}
                  className="cursor-pointer rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 transition hover:from-emerald-300 hover:to-sky-300"
                >
                  Enter Tournament
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="cursor-pointer rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-300"
                >
                  Register Team
                </button>
                <a
                  href="#how-to-play"
                  className="cursor-pointer rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-300"
                >
                  Learn how to play
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/10 p-6 backdrop-blur lg:ml-auto lg:w-[320px]">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Live Status</p>
              <h2 className="mt-2 text-2xl font-semibold">Top Teams</h2>
              <div className="mt-4 space-y-3 text-sm">
                {standings.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-900/40 px-4 py-3">
                    <div>
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-xs text-slate-300">W {team.wins} • L {team.losses}</p>
                    </div>
                    <div>
                      <span className="text-lg font-bold text-emerald-300">{team.totalScore}</span>
                      <span className="text-xs text-slate-400">#{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="about" className="mx-auto flex max-w-6xl flex-col gap-10 py-16 lg:flex-row justify-start items-start">
          <div className="lg:w-[60%]">
            <p className="text-sm uppercase tracking-[0.4em] text-emerald-500">What is</p>
            <h2 className="text-3xl font-semibold text-slate-900">Financial Football</h2>
            <p className="mt-6 text-base leading-7 text-slate-600">
              Financial Football is a high-energy quiz competition where strategy meets speed. Teams square off in double elimination brackets,
              answer timed financial literacy questions, and fight for control via coin tosses. Every round blends quick thinking with smart risk management.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Moderators orchestrate matches, flip animated coins, and capture live scoring so your audience can follow every swing. Build fan momentum by
              sharing highlights, tracking leaderboards, and letting players relive each instant classic.
            </p>
          </div>
          <div className="lg:w-[40%]">
            <div className="relative">
              <video
                className="w-full rounded-3xl object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/assets/football-poster.jpg"   // optional
                aria-label="Financial Football background video"
                onError={(e) => console.error('Video failed to load', e)}
              >
                <source src="/assets/football-bg-video.mp4" type="video/mp4" />
                {/* Fallback text */}
                Your browser does not support HTML5 video.
              </video>
            </div>
          </div>

        </section>

        <section className="bg-amber-20 py-12 relative">
          <div className="max-w-8xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

              {/* LEFT: Curved Image */}
              <div className="relative overflow-hidden h-[280px] md:h-[340px]">
                {/* The amber background behind the curve */}
                <div className="absolute inset-0 bg-amber-40 z-0" />

                {/* The clipped image */}
                <img
                  src="/assets/team-updates.jpg"
                  alt="Team Updates"
                  className="
      h-full w-full object-cover
      [mask-image:radial-gradient(circle_at_right,transparent_40%,black_40.5%)]
      [mask-repeat:no-repeat] [mask-size:130%_100%]
    "
                />

                {/* Optional overlay gradient for better contrast */}
                {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-20" /> */}

                {/* Text Overlay */}
                <div className="absolute bottom-6 left-6 text-white z-30">
                  <h2 className="text-3xl font-bold tracking-[0.3em] text-center flex items-center justify-center pl-1">TEAM</h2>
                  <h2 className="text-3xl font-bold tracking-[0.7em] text-center flex items-center justify-center pl-40">UPDATES</h2>
                </div>
              </div>

              {/* RIGHT: Table */}
              <div className="pb-12">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Teams</h3>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-amber-500 text-xs uppercase tracking-widest text-white">
                      <th className="px-4 py-3 text-left">Pos</th>
                      <th className="px-4 py-3 text-left">Team</th>
                      <th className="px-4 py-3 text-left">W</th>
                      <th className="px-4 py-3 text-left">L</th>
                      <th className="px-4 py-3 text-left">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, i) => (
                      <tr
                        key={team.id}
                        className={i % 2 ? "bg-white" : "bg-amber-50/60"}
                      >
                        <td className="px-4 py-3">{i + 1}</td>
                        <td className="px-4 py-3">{team.name}</td>
                        <td className="px-4 py-3">{team.wins}</td>
                        <td className="px-4 py-3">{team.losses}</td>
                        <td className="px-4 py-3 font-semibold text-amber-600">
                          {team.totalScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </section>




        <section className="relative overflow-hidden py-24">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "url(/assets/stay-updated.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
          />
          {/* <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" /> */}

          <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr,0.9fr] items-center">
            {/* Left: background / hero visual */}
            <div className="text-white">
              <h1 className="text-4xl font-extrabold tracking-[0.25em] drop-shadow-lg">Stay Updated</h1>
              <p className="mt-4 max-w-sm text-slate-200 text-sm leading-relaxed">
                Catch the latest highlights, match updates, and top plays in real time.
              </p>
            </div>

            {/* Right: rotating cards */}
            <div className="relative space-y-4">
              {visibleCards.map((item) => (
                <article key={item.id} className="animate-[popIn_0.6s_ease-out_both] rounded-2xl bg-white/15 p-5 backdrop-blur-md text-white shadow-xl ring-1 ring-white/10">
                  <div className="flex items-center gap-4">
                    <img src={item.thumb} alt="" className="h-14 w-20 rounded-lg object-cover ring-1 ring-black/10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs uppercase tracking-widest">
                        <span className="text-red-500 font-semibold">● Live</span>
                        <span className="text-slate-300">{item.timestamp}</span>
                      </div>
                      <h3 className="mt-1 truncate text-base font-semibold">{item.title}</h3>
                      <p className="line-clamp-1 text-sm text-slate-200">{item.summary}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>




        <section id="how-to-play" className="bg-white py-16 mb-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-emerald-500">How to Play</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">Game day logistics made simple</h2>
                <p className="mt-4 text-base text-slate-600 max-w-2xl">
                  Launch matches from the moderator console, animate coin tosses, and keep everyone aligned on the bracket format.
                  These pillars help new teams ramp quickly and keep veterans sharp.
                </p>
              </div>

              {/* ── Learn in Detail Button ─────────────────────────── */}
              <NavLink
                to="/howtoplay"
                className="cursor-pointer rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 hover:shadow-lg"
              >
                Read In Detail
              </NavLink>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PLAY_CARDS.map((card) => (
                <div key={card.id} className={`rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:translate-y-[-4px] hover:shadow-lg ${card.color}`}>
                  <span className={`text-xs font-semibold uppercase tracking-[0.4em] ${card.accent}`}>Step</span>
                  <h3 className="mt-3 text-lg font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="relative overflow-hidden bg-orange-50">
          <div className="relative bg-deep-purple-accent-400">

            {/* --- FOOTBALL FIELD IMAGE WITH CURVED BOTTOM --- */}
            <div className="absolute top-0 left-0 w-full overflow-hidden z-10">
              <div className="relative w-full h-64 sm:h-72 md:h-80">

                {/* FOOTBALL FIELD IMAGE (full visible) */}
                <img
                  src="/assets/american_football_background.jpeg"
                  alt="Football Field"
                  className="w-full h-full object-cover object-[50%_60%]"
                />

                {/* SCRATCH BANNER OVERLAY */}
                <img
                  src="/assets/banner-screch-top.png"
                  alt="Banner Overlay"
                  className="absolute top-0 left-0 w-full h-20 object-fill pointer-events-none"
                />

              </div>
            </div>

            {/* Shift footer content downward so it doesn't overlap the image */}
            <div className="relative px-4 pt-[22rem] sm:pt-[24rem] md:pt-[26rem] mx-auto sm:max-w-xl md:max-w-full lg:max-w-screen-xl md:px-24 lg:px-8 z-20">

              {/* ================= FOOTER CONTENT ================= */}
              <div className="grid gap-16 row-gap-10 mb-8 lg:grid-cols-6 pl-5">
                <div className="md:max-w-md lg:col-span-2">
                  <a href="/" aria-label="Go home" title="Company" className="inline-flex items-center">
                    <img src="/assets/ff-logo-2.png" alt="Logo" className="h-20 w-20" />
                    <span className="ml-2 text-xl font-bold tracking-wide text-orange-500 uppercase">
                      Suncoast Credit Union
                    </span>
                  </a>
                  <div className="mt-4 lg:max-w-sm">
                    <p className="text-sm text-deep-purple-50">
                      Financial Football is a fast-paced quiz tournament where teams compete in double-elimination brackets, answering timed financial questions to gain the advantage. Moderators drive the action with coin tosses, live scoring, and dynamic highlights that keep the audience engaged throughout every round.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 row-gap-8 lg:col-span-4 md:grid-cols-4 py-7 px-7">
                  <div>
                    <p className="font-semibold tracking-wide text-teal-accent-400">Category</p>
                    <ul className="mt-2 space-y-2">
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">News</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">World</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Games</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">References</a></li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold tracking-wide text-teal-accent-400">Cherry</p>
                    <ul className="mt-2 space-y-2">
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Web</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">eCommerce</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Business</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Entertainment</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Portfolio</a></li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold tracking-wide text-teal-accent-400">Apples</p>
                    <ul className="mt-2 space-y-2">
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Media</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Brochure</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Nonprofit</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Educational</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Projects</a></li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold tracking-wide text-teal-accent-400">Business</p>
                    <ul className="mt-2 space-y-2">
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Infopreneur</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Personal</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Wiki</a></li>
                      <li><a href="/" className="text-deep-purple-50 hover:text-orange-300">Forum</a></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between pt-5 pb-10 border-t border-deep-purple-accent-200 sm:flex-row">
                <p className="text-sm text-gray-100">© Copyright 2020 Lorem Inc. All rights reserved.</p>

                <div className="flex items-center mt-4 space-x-4 sm:mt-0">

                  <a href="/" className="text-deep-purple-100 hover:text-gray-50">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5">
                      <path d="M24,4.6c-0.9,0.4-1.8,0.7-2.8,0.8c..." />
                    </svg>
                  </a>

                  <a href="/" className="text-deep-purple-100 hover:text-gray-50">
                    <svg viewBox="0 0 30 30" fill="currentColor" className="h-6">
                      <circle cx="15" cy="15" r="4" />
                      <path d="M19.999,3h-10C6.14,3,3,6.141..." />
                    </svg>
                  </a>

                  <a href="/" className="text-deep-purple-100 hover:text-gray-50">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5">
                      <path d="M22,0H2C0.895,0,0,0.895,0,2v20..." />
                    </svg>
                  </a>

                </div>
              </div>

            </div>
          </div>
        </section>




      </main>
    </div>
  )
}
