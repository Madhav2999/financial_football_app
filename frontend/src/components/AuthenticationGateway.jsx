import { useEffect, useMemo, useState } from 'react'

const BASE_MODES = [
  { id: 'team', label: 'Team Login' },
  { id: 'admin', label: 'Admin Login' },
  { id: 'moderator', label: 'Moderator Login' },
]

const REGISTRATION_MODE = { id: 'register', label: 'Register Team' }

const INITIAL_REGISTER_FORM = {
  teamName: '',
  organization: '',
  contactName: '',
  contactEmail: '',
  notes: '',
}

export default function AuthenticationGateway({
  initialMode = 'team',
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  error,
  onBack,
  displayVariant = 'page',
  showRegistrationTab = false,
  onClose,
}) {
  const modes = useMemo(
    () => (showRegistrationTab ? [...BASE_MODES, REGISTRATION_MODE] : BASE_MODES),
    [showRegistrationTab],
  )

  const allowedModes = useMemo(() => modes.map((item) => item.id), [modes])
  const initialResolvedMode = allowedModes.includes(initialMode) ? initialMode : allowedModes[0]

  const [mode, setMode] = useState(initialResolvedMode)
  const [form, setForm] = useState({ loginId: '', password: '' })
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM)
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)

  useEffect(() => {
    const nextMode = allowedModes.includes(initialMode) ? initialMode : allowedModes[0]
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
    setRegisterForm(INITIAL_REGISTER_FORM)
    setRegistrationSubmitted(false)
  }, [initialMode, allowedModes])

  const handleSubmit = (event) => {
    event.preventDefault()
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
    }
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
    setRegisterForm(INITIAL_REGISTER_FORM)
    setRegistrationSubmitted(false)
  }

  const loginPlaceholder = (() => {
    if (mode === 'team') return 'e.g. alpha'
    if (mode === 'admin') return 'admin'
    return 'mod1'
  })()

  const loginLabel = (() => {
    if (mode === 'team') return 'Team Login ID'
    if (mode === 'admin') return 'Admin Login ID'
    return 'Moderator Login ID'
  })()

  const submitLabel = (() => {
    if (mode === 'team') return 'Enter Team Lobby'
    if (mode === 'admin') return 'Sign in as Admin'
    return 'Sign in as Moderator'
  })()

  const isRegistrationMode = mode === 'register'

  const handleRegistrationSubmit = (event) => {
    event.preventDefault()
    setRegistrationSubmitted(true)
  }

  useEffect(() => {
    if (displayVariant !== 'modal') {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayVariant, onClose])

  const registrationSuccessMessage = (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-sm text-emerald-200">
      <h3 className="text-lg font-semibold text-emerald-300">Registration request captured</h3>
      <p className="mt-2 text-slate-200">
        Thank you for your interest! A tournament coordinator will reach out with next steps.
      </p>
      <button
        type="button"
        onClick={() => {
          setRegisterForm(INITIAL_REGISTER_FORM)
          setRegistrationSubmitted(false)
        }}
        className="mt-4 rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
      >
        Submit another
      </button>
    </div>
  )

  const registrationForm = (
    <form className="space-y-5" onSubmit={handleRegistrationSubmit}>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Team Name</label>
        <input
          required
          value={registerForm.teamName}
          onChange={(event) =>
            setRegisterForm((prev) => ({ ...prev, teamName: event.target.value }))
          }
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          placeholder="e.g. Tampa Titans"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          School or Organization
        </label>
        <input
          required
          value={registerForm.organization}
          onChange={(event) =>
            setRegisterForm((prev) => ({ ...prev, organization: event.target.value }))
          }
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          placeholder="e.g. Suncoast High"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Contact Name
          </label>
          <input
            required
            value={registerForm.contactName}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, contactName: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="e.g. Jordan Rivers"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Contact Email
          </label>
          <input
            required
            type="email"
            value={registerForm.contactEmail}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, contactEmail: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Notes for the coordinators
        </label>
        <textarea
          value={registerForm.notes}
          onChange={(event) =>
            setRegisterForm((prev) => ({ ...prev, notes: event.target.value }))
          }
          rows={3}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          placeholder="Share roster size, experience level, or special requests"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-sky-400"
      >
        Submit Registration Request
      </button>
    </form>
  )

  const tabTriggers = (
    <div className="flex rounded-full bg-slate-800/70 p-1 text-sm font-medium text-slate-300 mb-8 flex-wrap gap-2">
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleModeChange(item.id)}
          className={`flex-1 rounded-full px-3 py-2 transition-all duration-200 min-w-[140px] ${
            mode === item.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40' : 'hover:bg-slate-800'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  const formContent = isRegistrationMode ? (
    registrationSubmitted ? registrationSuccessMessage : registrationForm
  ) : (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
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
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Password</label>
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
  )

  const promoPanel = (
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
  )

  const formPanel = (
    <section className="rounded-3xl bg-slate-900/40 border border-slate-800 p-8 shadow-xl shadow-sky-500/5">
      {displayVariant === 'modal' ? (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {isRegistrationMode ? 'Team Registration' : 'Secure Sign In'}
          </p>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-sky-500 hover:text-sky-300"
            >
              Close
            </button>
          ) : null}
        </div>
      ) : onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
        >
          Back to landing
        </button>
      ) : null}

      {tabTriggers}

      {formContent}
    </section>
  )

  const innerContent = (
    <div className="w-full max-w-4xl grid gap-10 lg:grid-cols-[1.2fr,1fr]">
      {promoPanel}
      {formPanel}
    </div>
  )

  if (displayVariant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur"
          onClick={onClose}
          role="button"
          aria-label="Close authentication"
          tabIndex={-1}
        />
        <div className="relative w-full max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-slate-100 shadow-2xl shadow-sky-500/20">
            {innerContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      {innerContent}
    </div>
  )
}
