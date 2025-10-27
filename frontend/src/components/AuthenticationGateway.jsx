import { useEffect, useState } from 'react'

const MODES = [
  { id: 'team', label: 'Team' },
  { id: 'admin', label: 'Admin' },
  { id: 'moderator', label: 'Moderator' },
  { id: 'super', label: 'Super Admin' },
]

const TABS = [
  { id: 'login', label: 'Log in' },
  { id: 'register', label: 'Register team' },
]

export default function AuthenticationGateway({
  initialMode = 'team',
  initialTab = 'login',
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  onSuperAdminLogin,
  error,
  onBack,
}) {
  const [mode, setMode] = useState(initialMode)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [form, setForm] = useState({ loginId: '', password: '' })
  const [registrationForm, setRegistrationForm] = useState({
    teamName: '',
    contactName: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [registrationNotice, setRegistrationNotice] = useState('')

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    setForm({ loginId: '', password: '' })
  }, [mode, activeTab])

  useEffect(() => {
    setRegistrationNotice('')
  }, [activeTab])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (activeTab !== 'login') {
      return
    }

    if (!form.loginId || !form.password) {
      return
    }

    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (mode === 'team') {
      onTeamLogin(loginId, password)
    } else if (mode === 'admin') {
      onAdminLogin(loginId, password)
    } else if (mode === 'moderator') {
      onModeratorLogin?.(loginId, password)
    } else if (mode === 'super') {
      onSuperAdminLogin?.(loginId, password)
    }
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
  }

  const loginPlaceholder = (() => {
    if (mode === 'team') return 'e.g. alpha'
    if (mode === 'admin') return 'admin'
    if (mode === 'moderator') return 'mod1'
    return 'super'
  })()

  const loginLabel = (() => {
    if (mode === 'team') return 'Team Login ID'
    if (mode === 'admin') return 'Admin Login ID'
    if (mode === 'moderator') return 'Moderator Login ID'
    return 'Super Admin Login ID'
  })()

  const submitLabel = (() => {
    if (mode === 'team') return 'Enter Team Lobby'
    if (mode === 'admin') return 'Sign in as Admin'
    if (mode === 'moderator') return 'Sign in as Moderator'
    return 'Enter Super Admin Console'
  })()

  const handleRegistrationSubmit = (event) => {
    event.preventDefault()
    setRegistrationNotice('Registration is currently a placeholder. Your details have not been submitted.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 text-slate-100 backdrop-blur">
      <div className="absolute inset-0" onClick={onBack} role="presentation" />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-sky-500/20">
        <div className="absolute right-6 top-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:text-white hover:bg-slate-700"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1.1fr,1fr]">
          <section className="hidden bg-gradient-to-br from-sky-600/40 via-slate-900/20 to-slate-950/80 p-10 text-slate-100 backdrop-blur lg:block">
            <p className="text-sm uppercase tracking-[0.5em] text-sky-300">Financial Football</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Rally your roster and compete in the double-elimination arena.
            </h1>
            <ul className="mt-10 space-y-6 text-sm leading-relaxed text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" aria-hidden />
                Timed rounds keep the pressure on—20 seconds for primary answers, 10 seconds to steal.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" aria-hidden />
                Moderators handle the coin toss, match flow, and scoring so teams can focus on strategy.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" aria-hidden />
                Admins oversee brackets, launch tournaments, and can step in with pause or reset controls.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" aria-hidden />
                Register interested teams early to lock in one of the twelve tournament slots.
              </li>
            </ul>
          </section>
          <section className="relative flex flex-col gap-8 bg-slate-900/70 p-8">
            <div className="flex flex-col gap-6">
              <div className="flex rounded-full border border-slate-700 bg-slate-900/80 p-1 text-xs font-semibold uppercase tracking-[0.3em]">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-full px-4 py-2 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'login' ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2 text-sm font-medium text-slate-300">
                    {MODES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleModeChange(item.id)}
                        className={`rounded-full border px-4 py-2 transition ${
                          mode === item.id
                            ? 'border-sky-400 bg-sky-500/20 text-white'
                            : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        {loginLabel}
                      </label>
                      <input
                        required
                        value={form.loginId}
                        onChange={(event) => setForm((prev) => ({ ...prev, loginId: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        placeholder={loginPlaceholder}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Password
                      </label>
                      <input
                        required
                        type="password"
                        value={form.password}
                        onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        placeholder="********"
                      />
                    </div>

                    {error ? <p className="text-sm text-rose-400">{error}</p> : null}

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/40 transition hover:from-sky-400 hover:to-blue-400"
                    >
                      {submitLabel}
                    </button>
                  </form>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleRegistrationSubmit}>
                  <p className="text-sm text-slate-300">
                    Submit your roster details and our team will reach out to confirm availability. This is a placeholder form—no
                    information is saved yet.
                  </p>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Team name
                    </label>
                    <input
                      value={registrationForm.teamName}
                      onChange={(event) =>
                        setRegistrationForm((prev) => ({ ...prev, teamName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      placeholder="e.g. Tampa Trailblazers"
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Contact name
                      </label>
                      <input
                        value={registrationForm.contactName}
                        onChange={(event) =>
                          setRegistrationForm((prev) => ({ ...prev, contactName: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Coach or captain"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Email
                      </label>
                      <input
                        type="email"
                        value={registrationForm.email}
                        onChange={(event) =>
                          setRegistrationForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Phone
                      </label>
                      <input
                        value={registrationForm.phone}
                        onChange={(event) =>
                          setRegistrationForm((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Players count
                      </label>
                      <input
                        value={registrationForm.notes}
                        onChange={(event) =>
                          setRegistrationForm((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Number of participants"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-sky-400"
                  >
                    Submit registration (placeholder)
                  </button>
                  {registrationNotice ? (
                    <p className="text-sm text-amber-300">{registrationNotice}</p>
                  ) : null}
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
