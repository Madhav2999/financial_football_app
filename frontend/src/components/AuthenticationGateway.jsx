import { useEffect, useState } from 'react'

const MODES = [
  { id: 'team', label: 'Team Login' },
  { id: 'admin', label: 'Admin Login' },
]

export default function AuthenticationGateway({ initialMode = 'team', onTeamLogin, onAdminLogin, error, onBack }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ loginId: '', password: '' })

  useEffect(() => {
    setMode(initialMode)
    setForm({ loginId: '', password: '' })
  }, [initialMode])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.loginId || !form.password) {
      return
    }

    if (mode === 'team') {
      onTeamLogin(form.loginId.trim(), form.password.trim())
    } else {
      onAdminLogin(form.loginId.trim(), form.password.trim())
    }
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid gap-10 lg:grid-cols-[1.2fr,1fr]">
        <section className="rounded-3xl bg-slate-900/60 border border-slate-800 p-10 shadow-2xl shadow-sky-500/10">
          <p className="text-sm uppercase tracking-widest text-sky-400 mb-4">Financial Football Quiz Arena</p>
          <h1 className="text-4xl font-semibold text-white mb-6">
            Prepare your team for a fast-paced head-to-head trivia showdown.
          </h1>
          <ul className="space-y-4 text-slate-300 leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
              Twelve teams battle through double elimination until a champion remains.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
              Coin tosses determine control, question steals keep both teams alert, and every point counts.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
              Admin moderators can create matches, flip coins, track scoring, and eliminate teams after two losses.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl bg-slate-900/40 border border-slate-800 p-8 shadow-xl shadow-sky-500/5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
            >
              Back to landing
            </button>
          ) : null}
          <div className="flex rounded-full bg-slate-800/70 p-1 text-sm font-medium text-slate-300 mb-8">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModeChange(item.id)}
                className={`flex-1 rounded-full px-3 py-2 transition-all duration-200 ${
                  mode === item.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40' : 'hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                {mode === 'team' ? 'Team Login ID' : 'Admin Login ID'}
              </label>
              <input
                required
                value={form.loginId}
                onChange={(event) => setForm((prev) => ({ ...prev, loginId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder={mode === 'team' ? 'e.g. alpha' : 'admin'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="••••••••"
              />
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/40 transition hover:from-sky-400 hover:to-blue-400"
            >
              {mode === 'team' ? 'Enter Team Lobby' : 'Sign in as Moderator'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}