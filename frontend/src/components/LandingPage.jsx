import { useState, useEffect } from "react";
const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '#top' },
  { id: 'about', label: 'About us', href: '#about' },
  { id: 'play', label: 'How to Play', href: '#how-to-play' },
  { id: 'contact', label: 'Contact us', href: '#contact' },
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


export default function LandingPage({ teams, onTeamLogin, onModeratorLogin, onAdminLogin, onRegisterTeam }) {
  const standings = [...teams]
    .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore)
    .slice(0, 5)

  // const recentHighlights = history.slice(0, 2).map((entry) => formatHistoryEntry(entry, teams))

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleTeamLogin = onTeamLogin ?? (() => {});
  const handleModeratorLogin = onModeratorLogin ?? (() => {});
  const handleAdminLogin = onAdminLogin ?? (() => {});
  const handleRegisterTeam = onRegisterTeam ?? (() => {});

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 2) % recentHighlights.length);
    }, 3000); // change every 3 s
    return () => clearInterval(interval);
  }, []);

  const visibleCards = recentHighlights.slice(currentIndex, currentIndex + 2);


  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
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
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-6 text-sm font-semibold text-white">
            <div className="flex items-center gap-4">
              <img src="/assets/ff-logo.svg" alt="Financial Football" className="h-12 w-12" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Financial Football</p>
                <p className="text-lg font-semibold">Powered by Suncoast Credit Union</p>
              </div>
            </div>
            <div className="hidden items-center gap-9 md:flex">
              {NAV_ITEMS.map((item) => (
                <a key={item.id} href={item.href} className="transition hover:text-emerald-300 tracking-[0.05em]">
                  {item.label}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button
                type="button"
                onClick={handleTeamLogin}
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest transition hover:border-emerald-300 hover:text-emerald-300 cursor-pointer"
              >
                Team Login
              </button>
              <button
                type="button"
                onClick={handleRegisterTeam}
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest text-emerald-100 transition hover:border-emerald-300 hover:text-emerald-300 cursor-pointer"
              >
                Register Team
              </button>
              <button
                type="button"
                onClick={handleTeamLogin}
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest transition hover:border-emerald-300 hover:text-emerald-300 cursor-pointer"
              >
                Team Login
              </button>
              <button
                type="button"
                onClick={handleModeratorLogin}
                className="rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest transition hover:border-emerald-300 hover:text-emerald-300 cursor-pointer"
              >
                Moderator Login
              </button>
              <button
                type="button"
                onClick={handleAdminLogin}
                className="rounded-full bg-emerald-400 px-5 py-2 text-xs uppercase tracking-[0.3em] text-slate-900 transition hover:bg-emerald-300 cursor-pointer"
              >
                Admin Login
              </button>
            </div>
          </nav>

          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-24 pt-12 text-white lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-6">
              <p className="text-sm uppercase tracking-[0.5em] text-emerald-300">Join the Ultimate</p>
              <h1 className="text-5xl font-semibold leading-tight lg:text-6xl">Financial Football Quiz Showdown</h1>
              <p className="max-w-xl text-lg text-slate-200">
                Double elimination drama. Rapid-fire questions. Strategic coin tosses. Rally your roster and conquer the bracket.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleTeamLogin}
                  className="cursor-pointer rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 transition hover:from-emerald-300 hover:to-sky-300"
                >
                  Enter Tournament
                </button>
                <a
                  href="#how-to-play"
                  className="cursor-pointer rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-300"
                >
                  Learn how to play
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur lg:ml-auto lg:w-[320px]">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Live Standings</p>
              <h2 className="mt-2 text-2xl font-semibold">Top Teams</h2>
              <div className="mt-4 space-y-3 text-sm">
                {standings.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-900/40 px-4 py-3">
                    <div>
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-xs text-slate-300">W {team.wins} � L {team.losses}</p>
                    </div>
                    <span className="text-lg font-bold text-emerald-300">{team.totalScore}</span>
                    <span className="text-xs text-slate-400">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="about" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row">
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
            <div className="relative inset-0">
              <img src="/assets/financial-football.jpg" alt="Financial Football crest" className="mx-auto rounded-3xl" />
            </div>
          </div>
        </section>

        <section className="bg-amber-50 py-12 relative">
          <div className="max-w-8xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

              {/* LEFT: Curved Image */}
              <div className="relative overflow-hidden h-[280px] md:h-[340px]">
                {/* The amber background behind the curve */}
                <div className="absolute inset-0 bg-amber-50 z-0" />

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
                  <p className="text-xs uppercase tracking-[0.3em]">Team</p>
                  <h2 className="text-3xl font-bold tracking-[0.2em]">Updates</h2>
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




        <section id="how-to-play" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-sm uppercase tracking-[0.4em] text-emerald-500">How to Play</p>
            <h2 className="mt-2 text-center text-3xl font-semibold text-slate-900">Game day logistics made simple</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              Launch matches from the moderator console, animate coin tosses, and keep everyone aligned on the bracket format.
              These pillars help new teams ramp quickly and keep veterans sharp.
            </p>
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

        <section id="contact" className="relative overflow-hidden py-16">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(180deg, rgba(15, 20, 40, 0.75), rgba(15, 20, 40, 0.65)), url(/assets/match-schedule.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative z-10 mx-auto max-w-6xl px-6 text-white">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-10 backdrop-blur">
              <h2 className="text-2xl font-semibold">What can we help you with?</h2>
              <p className="mt-3 text-sm text-slate-200">
                Join the mailing list, request sponsorship kits, or ask about custom question packs tailored to your community.
              </p>
              <form className="mt-8 grid gap-4 md:grid-cols-[1fr,1fr,auto]">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="rounded-full border border-white/40 bg-slate-900/40 px-5 py-3 text-sm text-white placeholder:text-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                />
                <input
                  type="text"
                  placeholder="Type message"
                  className="rounded-full border border-white/40 bg-slate-900/40 px-5 py-3 text-sm text-white placeholder:text-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                />
                <button
                  type="button"
                  className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow shadow-emerald-500/30 transition hover:bg-emerald-300"
                >
                  Send
                </button>
              </form>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-300">
              <div className="flex items-center gap-2 text-slate-200">
                <img src="/assets/ff-logo.svg" alt="FF" className="h-10 w-10" />
                <span>Financial Football</span>
              </div>
              <div className="flex gap-6">
                <a href="#home" className="transition hover:text-emerald-300">Home</a>
                <a href="#about" className="transition hover:text-emerald-300">About us</a>
                <a href="#how-to-play" className="transition hover:text-emerald-300">How to Play</a>
                <a href="#contact" className="transition hover:text-emerald-300">Contact us</a>
              </div>
              <p>� {new Date().getFullYear()} Financial Football League � Design inspired by provided mockups</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
