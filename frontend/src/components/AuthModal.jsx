import { useEffect, useMemo, useState } from 'react'

const ROLES = [
  { id: 'team', label: 'Team' },
  { id: 'admin', label: 'Admin' },
  { id: 'moderator', label: 'Moderator' },
]

const VIEWS = [
  { id: 'login', label: 'Login' },
  { id: 'register', label: 'Register' },
]

export default function AuthModal({
  isOpen,
  initialRole = 'team',
  initialView = 'login',
  error,
  successMessage,
  onClose,
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  onTeamRegister,
  onAdminRegister,
  onModeratorRegister,
}) {
  const [activeRole, setActiveRole] = useState(initialRole)
  const [activeView, setActiveView] = useState(initialView)
  const [loginForm, setLoginForm] = useState({ loginId: '', password: '' })
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    loginId: '',
    password: '',
    confirmPassword: '',
  })
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setActiveRole(initialRole)
    setActiveView(initialView)
    setLoginForm({ loginId: '', password: '' })
    setRegistrationForm({ name: '', loginId: '', password: '', confirmPassword: '' })
    setLocalError(null)
  }, [initialRole, initialView, isOpen])

  useEffect(() => {
    if (!isOpen) return
    setLocalError(null)
  }, [activeRole, activeView, isOpen])

  const roleHeading = useMemo(() => {
    switch (activeRole) {
      case 'admin':
        return 'Admin'
      case 'moderator':
        return 'Moderator'
      default:
        return 'Team'
    }
  }, [activeRole])

  if (!isOpen) {
    return null
  }

  const handleClose = () => {
    setLocalError(null)
    onClose?.()
  }

  const handleLoginSubmit = (event) => {
    event.preventDefault()
    if (!loginForm.loginId.trim() || !loginForm.password.trim()) {
      setLocalError('Please enter both login ID and password.')
      return
    }

    const payload = {
      loginId: loginForm.loginId.trim(),
      password: loginForm.password.trim(),
    }

    let handler = onTeamLogin
    if (activeRole === 'admin') {
      handler = onAdminLogin
    } else if (activeRole === 'moderator') {
      handler = onModeratorLogin
    }

    if (!handler) {
      return
    }

    const result = handler(payload.loginId, payload.password)
    if (result !== false) {
      setLoginForm({ loginId: '', password: '' })
    }
  }

  const handleRegistrationSubmit = (event) => {
    event.preventDefault()

    const trimmed = {
      name: registrationForm.name.trim(),
      loginId: registrationForm.loginId.trim(),
      password: registrationForm.password.trim(),
      confirmPassword: registrationForm.confirmPassword.trim(),
    }

    if (!trimmed.name || !trimmed.loginId || !trimmed.password) {
      setLocalError('Please complete all registration fields.')
      return
    }

    if (trimmed.password !== trimmed.confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    let handler = onTeamRegister
    if (activeRole === 'admin') {
      handler = onAdminRegister
    } else if (activeRole === 'moderator') {
      handler = onModeratorRegister
    }

    if (!handler) {
      return
    }

    const result = handler({ name: trimmed.name, loginId: trimmed.loginId, password: trimmed.password })
    if (result !== false) {
      setRegistrationForm({ name: '', loginId: '', password: '', confirmPassword: '' })
    }
  }

  const feedbackError = localError || error

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-2xl shadow-sky-500/20"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-400">Financial Football</p>
            <h2 className="mt-1 text-2xl font-semibold">{roleHeading} Portal</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-slate-400 transition hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <div className="flex gap-2 rounded-full bg-slate-800/80 p-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={`flex-1 rounded-full px-4 py-2 transition ${
                    activeView === view.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40' : 'hover:bg-slate-800'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 rounded-full bg-slate-800/50 p-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setActiveRole(role.id)}
                  className={`flex-1 rounded-full px-3 py-2 transition ${
                    activeRole === role.id ? 'bg-slate-900 text-white shadow-inner shadow-sky-500/30' : 'hover:bg-slate-800'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            {feedbackError ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{feedbackError}</p> : null}
            {successMessage ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</p> : null}

            {activeView === 'login' ? (
              <form className="space-y-5" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {roleHeading} Login ID
                  </label>
                  <input
                    value={loginForm.loginId}
                    onChange={(event) =>
                      setLoginForm((previous) => ({ ...previous, loginId: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder={activeRole === 'team' ? 'e.g. alpha' : activeRole === 'admin' ? 'admin' : 'mod1'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((previous) => ({ ...previous, password: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="********"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-blue-400"
                >
                  {`Sign in as ${roleHeading}`}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleRegistrationSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {roleHeading} Name
                  </label>
                  <input
                    value={registrationForm.name}
                    onChange={(event) =>
                      setRegistrationForm((previous) => ({ ...previous, name: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder={activeRole === 'team' ? 'e.g. Alpha Analysts' : 'Full name'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Desired Login ID</label>
                  <input
                    value={registrationForm.loginId}
                    onChange={(event) =>
                      setRegistrationForm((previous) => ({ ...previous, loginId: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder={activeRole === 'team' ? 'alpha' : activeRole === 'admin' ? 'admin2' : 'mod7'}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Password</label>
                    <input
                      type="password"
                      value={registrationForm.password}
                      onChange={(event) =>
                        setRegistrationForm((previous) => ({ ...previous, password: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="********"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={registrationForm.confirmPassword}
                      onChange={(event) =>
                        setRegistrationForm((previous) => ({
                          ...previous,
                          confirmPassword: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="********"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-400"
                >
                  {`Register ${roleHeading}`}
                </button>
              </form>
            )}
          </div>

          <aside className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-sm uppercase tracking-[0.4em] text-sky-400">Why register?</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
                Save your credentials to return to the Financial Football arena instantly.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
                Track tournament progress, manage rosters, and control live matches with ease.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
                Switch between login and registration without losing your place.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Need help? Contact the Financial Football operations team at
              <br />
              <span className="font-semibold text-sky-300">support@financialfootball.com</span>
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
