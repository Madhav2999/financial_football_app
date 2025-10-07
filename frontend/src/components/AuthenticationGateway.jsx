import { useEffect, useState } from 'react'

const MODES = [
  { id: 'team', label: 'Team Login', cta: 'Enter Team Lobby' },
  { id: 'admin', label: 'Moderator Login', cta: 'Sign in as Moderator' },
]

export default function AuthenticationGateway({ onTeamLogin, onAdminLogin, error, onBack, initialMode = 'team' }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ loginId: '', password: '' })

  const activeMode = MODES.find((item) => item.id === mode)

  useEffect(() => {
    setMode(initialMode)
    setForm({ loginId: '', password: '' })
  }, [initialMode])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.loginId || !form.password) {
      return
    }

    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (mode === 'team') {
      onTeamLogin(loginId, password)
    } else {
      onAdminLogin(loginId, password)
    }
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-slate-950 text-slate-50"
      style={{
        backgroundImage: 'linear-gradient(180deg, rgba(2, 6, 23, 0.8), rgba(2, 6, 23, 0.95)), url(/assets/login-background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-emerald-900/30" aria-hidden />
      <div className="relative z-10 mx-4 grid w-full max-w-5xl gap-6 rounded-[32px] border border-white/10 bg-slate-900/60 p-8 shadow-[0_40px_120px_rgba(8,47,73,0.45)] backdrop-blur-lg lg:grid-cols-[1.3fr,1fr] lg:p-12">
        <div className="flex flex-col justify-between gap-10">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em]">
            <div className="flex items-center gap-3">
              <img src="/assets/ff-logo.svg" alt="Financial Football" className="h-14 w-14" />
              <div className="text-left">
                <p className="text-emerald-300">Financial Football</p>
                <p className="text-white/70">Powered by Suncoast Credit Union</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/20 px-4 py-2 text-[11px] tracking-[0.4em] uppercase text-white/70 transition hover:border-emerald-300 hover:text-emerald-300"
            >
              Back home
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-white">Log in to your arena</h1>
              <p className="mt-3 text-sm text-slate-300">
                Manage matches, brief your team, and continue the tournament right where you left off.
              </p>
            </div>

            <div className="flex w-full rounded-full bg-slate-900/80 p-1 text-sm font-medium text-slate-200 shadow-inner shadow-black/40">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeChange(item.id)}
                  className={`flex-1 rounded-full px-3 py-2 transition ${mode === item.id
                    ? 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 shadow-lg shadow-emerald-500/40'
                    : 'hover:bg-slate-800/70'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">Login ID</label>
                  <input
                    required
                    value={form.loginId}
                    onChange={(event) => setForm((prev) => ({ ...prev, loginId: event.target.value }))}
                    placeholder={mode === 'team' ? 'Team login (e.g. alpha)' : 'admin'}
                    className="w-full rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                  />
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">Password</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Enter password"
                    className="w-full rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                  />
                </div>
                <div className='space-y-2'>
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 shadow-inner shadow-black/40">
                    <img src="/assets/login-art.jpg" alt="Football illustration" className="h-full w-full object-cover" />
                  </div>
                </div>
              </div>

              {error ? <p className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</p> : null}

              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 transition hover:from-emerald-300 hover:to-sky-300"
              >
                {activeMode?.cta ?? 'Continue'}
              </button>
            </form>
          </div>
        </div>

        {/* <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 shadow-inner shadow-black/40">
          <img src="/assets/login-art.jpg" alt="Football illustration" className="h-full w-full object-cover" />
        </div> */}
      </div>
    </div>
  )
}
