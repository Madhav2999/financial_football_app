import React from 'react'
import { useState } from 'react'
import AuthenticationGateway from './AuthenticationGateway'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'about', label: 'About us', href: 'about' },
  { id: 'play', label: 'How to Play', href: 'howtoplay' },
  { id: 'tournament', label: 'Tournament', href: 'tournament' },
]

// Data for each section (left card text + right pills)
const SECTIONS = [
  {
    id: 'r1w',
    title: 'Round 1 (Winners)',
    variant: 'win',
    bullets: [
      'A vs B',
      'C vs D',
      'E vs F',
      'G vs H',
      'I vs J',
      'K vs L',
    ],
    note: 'Winners move to Round 2 Winners Bracket. Losers move to Round 1 Losers Bracket.',
    pills: ['A vs B', 'C vs D', 'E vs F', 'G vs H', 'I vs J', 'K vs L'],
  },
  {
    id: 'r1l',
    title: 'Round 1 (Losers)',
    variant: 'lose',
    bullets: [
      'Loser (A/B) vs Loser (C/D)',
      'Loser (E/F) vs Loser (G/H)',
      'Loser (I/J) vs Loser (K/L)',
    ],
    note: 'Winners move to Round 2 Losers Bracket. Losers are eliminated.',
    pills: [
      'Loser (A/B) vs Loser (C/D)',
      'Loser (E/F) vs Loser (G/H)',
      'Loser (I/J) vs Loser (K/L)',
    ],
  },
  {
    id: 'r2w',
    title: 'Round 2 (Winners)',
    variant: 'win',
    bullets: [
      'Winner (A/B) vs Winner (C/D)',
      'Winner (E/F) vs Winner (G/H)',
      'Winner (I/J) vs Winner (K/L)',
    ],
    note: 'Winners move to Round 3 Winners Bracket. Losers move to Round 2 Losers Bracket.',
    pills: [
      'Winner (A/B) vs Winner (C/D)',
      'Winner (E/F) vs Winner (G/H)',
      'Winner (I/J) vs Winner (K/L)',
    ],
  },
  {
    id: 'r2l',
    title: 'Round 2 (Losers)',
    variant: 'lose',
    bullets: [
      'Winner L1 vs Loser (Winner A/B vs Winner C/D)',
      'Winner L2 vs Loser (Winner E/F vs Winner G/H)',
      'Winner L3 vs Loser (Winner I/J vs Winner K/L)',
    ],
    note: 'Winners move to Round 3 Losers Bracket. Losers eliminated.',
    pills: [
      'Winner L1 vs Loser (Winner A/B vs Winner C/D)',
      'Winner L2 vs Loser (Winner E/F vs Winner G/H)',
      'Winner L3 vs Loser (Winner I/J vs Winner K/L)',
    ],
  },
  {
    id: 'r3w',
    title: 'Round 3 (Winners)',
    variant: 'win',
    bullets: [
      'The 3 winners from Round 2 Winners Bracket play.',
    ],
    note: 'Winner moves to Finals. Losers move to Round 4 Losers Bracket.',
    pills: ['Winner 1 vs Winner 2 vs Winner 3'],
  },
  {
    id: 'r34l',
    title: 'Round 3 & 4 (Losers)',
    variant: 'lose',
    bullets: [
      'Round 3: Winner 1 vs Winner 2',
      'Round 4: Loser (Winners R3) vs Winner (Losers R3)',
    ],
    note: 'Winners move to Finals. Losers eliminated.',
    pills: ['Winner 1 vs Winner 2', 'Loser (Winners R3) vs Winner (Losers R3)'],
  },
  {
    id: 'finals',
    title: 'Finals',
    variant: 'win',
    bullets: [
      'Winner of Winners Bracket vs Winner of Losers Bracket.',
      'If Losers Bracket wins, a second match is played to decide the champion.',
    ],
    note: '',
    pills: ['Winner (Winners Bracket) vs Winner (Losers Bracket)'],
  },
]

// Small helpers for styles
const variantColors = (variant) =>
  variant === 'win'
    ? { accent: 'text-emerald-600', border: 'border-emerald-400', chip: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-500 hover:bg-emerald-600' }
    : { accent: 'text-amber-600', border: 'border-amber-400', chip: 'bg-amber-100 text-amber-700', pill: 'bg-amber-500 hover:bg-amber-600' }



export default function LearnToPlay({
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  authError,
  onClearAuthError,
  onTeamRegister,
  onModeratorRegister,
  onTeamForgotPassword,
  onModeratorForgotPassword,
}) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('team');
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
          onTeamRegister={onTeamRegister}
          onModeratorRegister={onModeratorRegister}
          onTeamForgotPassword={onTeamForgotPassword}
          onModeratorForgotPassword={onModeratorForgotPassword}
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
            backgroundImage: 'url(/assets/howplay-banner.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-6 text-sm font-semibold text-white">
            <div className="flex items-center gap-4">
              <NavLink to="/">
                <img src="/assets/ff-logo-2.png" alt="Financial Football" className="h-20 w-20 bg-amber-50 rounded-full" />
              </NavLink>
              <div>
                <p className="text-lg uppercase tracking-[0.4em] text-emerald-300">Financial Football</p>
                <p className="text-xs font-semibold">Powered by Suncoast Credit Union</p>
              </div>
            </div>
            <div className="hidden items-center gap-10">
              {NAV_ITEMS.map((item) => (
                <a key={item.id} href={item.href} className="tracking-[0.05em] transition hover:text-emerald-300">
                  {item.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="cursor-pointer rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest text-white transition hover:border-emerald-300 hover:text-emerald-300"
              >
                Register Team
              </button>
              <button
                type="button"
                onClick={() => openAuth('moderator')}
                className="cursor-pointer rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-widest transition hover:border-emerald-300 hover:text-emerald-300"
              >
                Moderator Login
              </button>
              <button
                type="button"
                onClick={() => openAuth('team')}
                className="cursor-pointer rounded-full bg-emerald-400 px-5 py-2 text-xs uppercase tracking-[0.3em] hover:bg-amber-300"
              >
                Enter Tournament
              </button>
            </div>
          </nav>
        </div>

        {/* Hero strip */}
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm uppercase tracking-[0.5em] text-emerald-300">Join the Ultimate</p>
            <h1 className="text-5xl font-semibold leading-tight text-amber-400 lg:text-6xl">
              How the game will be played
            </h1>
            <p className="max-w-xl text-lg text-slate-200">
              Instructions on how to play the financial football quiz game
            </p>
          </div>
        </div>
      </header>
      {/* ----- END HEADER ----- */}

      {/* ----- MAIN CONTENT (from here) ----- */}
      <main className="bg-slate-50">
        <section className="mx-auto max-w-6xl space-y-14 px-6 py-16">
          {SECTIONS.map((s) => {
            const colors = variantColors(s.variant)
            return (
              <div key={s.id} className="grid items-start gap-6 md:grid-cols-2">
                {/* Left info card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-emerald-700/90">
                  <h3 className={`mb-3 text-2xl font-semibold ${colors.accent}`}>{s.title}</h3>
                  <ul className="list-outside list-disc space-y-1 pl-5 text-slate-700">
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {s.note ? <p className="mt-4 text-sm text-slate-500">{s.note}</p> : null}
                </div>

                {/* Right column: match pills */}
                <div className="space-y-4">
                  {s.pills.map((p) => (
                    <div
                      key={p}
                      className={`w-full rounded-full px-6 py-3 text-center text-sm font-semibold text-white shadow ${colors.pill}`}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </main>
      {/* ----- NO FOOTER (you’ll add yours) ----- */}
      <div>
        <section id="contact" className="relative overflow-hidden py-16">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(180deg, rgba(15, 20, 40, 0.75), rgba(15, 20, 40, 0.65)), url(/assets/match-schedule.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative z-10 mx-auto max-w-4xl px-6 text-white">
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
                  className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 cursor-pointer px-6 py-3 text-sm font-semibold text-slate-900 shadow shadow-emerald-500/30 transition hover:bg-emerald-300"
                >
                  Send
                </button>
              </form>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 text-xs uppercase tracking-[0.3em] text-slate-300">
              <div className="flex items-center gap-2 text-slate-200">
                <img src="/assets/ff-logo-2.png" alt="FF" className="h-10 w-10 bg-amber-50 rounded-full cursor-pointer" />
                <span>Financial Football</span>
              </div>
              <div className="flex gap-6">
                <a href="#home" className="transition hover:text-emerald-300">Home</a>
                <a href="#about" className="transition hover:text-emerald-300">About us</a>
                <a href="#how-to-play" className="transition hover:text-emerald-300">How to Play</a>
                <a href="#contact" className="transition hover:text-emerald-300">Contact us</a>
              </div>
              <p className="px-10">� {new Date().getFullYear()} © Copyright 2025 – Arete Consultants Pvt. Ltd. All rights reserved.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
