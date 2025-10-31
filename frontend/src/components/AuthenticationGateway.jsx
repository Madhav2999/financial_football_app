import { useEffect, useMemo, useState } from 'react'

const BASE_MODES = [
  { id: 'team', label: 'User Login' }, // label to match screenshot
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
  // right-side artwork
  heroImageUrl = '/assets/register-modal-img.jpg',
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
    if (!form.loginId || !form.password) return

    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (mode === 'team') onTeamLogin(loginId, password)
    else if (mode === 'admin') onAdminLogin(loginId, password)
    else if (mode === 'moderator') onModeratorLogin?.(loginId, password)
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
    setRegisterForm(INITIAL_REGISTER_FORM)
    setRegistrationSubmitted(false)
  }

  const loginPlaceholder = mode === 'team' ? 'Enter user Id' : mode === 'admin' ? 'admin' : 'mod1'
  const loginLabel =
    mode === 'team' ? 'User Id' : mode === 'admin' ? 'Admin Login ID' : 'Moderator Login ID'
  const submitLabel =
    mode === 'team' ? 'Login' : mode === 'admin' ? 'Sign in as Admin' : 'Sign in as Moderator'
  const isRegistrationMode = mode === 'register'

  const handleRegistrationSubmit = (event) => {
    event.preventDefault()
    setRegistrationSubmitted(true)
  }

  useEffect(() => {
    if (displayVariant !== 'modal') return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayVariant, onClose])

  // ---------- UI parts ----------

  const TopHeader = (
    <div className="mb-6">
      <h2 className="text-3xl sm:text-4xl font-semibold text-white">
        {isRegistrationMode ? 'Create Your Account' : 'Welcome Back'}
      </h2>

      <div className="mt-2 text-slate-300">
        {isRegistrationMode ? (
          <span className="text-sm">
            Already a member?{' '}
            <button
              type="button"
              onClick={() => handleModeChange('team')}
              className="font-semibold text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline"
            >
              Log in
            </button>
          </span>
        ) : (
          <span className="text-sm">
            New to site?{' '}
            <button
              type="button"
              onClick={() => handleModeChange('register')}
              className="font-semibold text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline"
            >
              Create Account
            </button>
          </span>
        )}
      </div>
    </div>
  )

  const TabTriggers = !isRegistrationMode ? (
    <div className="mb-6 flex flex-wrap gap-3">
      {BASE_MODES.map((item) => {
        const active = mode === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleModeChange(item.id)}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition-all',
              'border',
              active
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/40'
                : 'border-white/30 text-slate-200 hover:bg-white/10',
            ].join(' ')}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  ) : null

  const LoginForm = (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">{loginLabel}</label>
        <input
          required
          value={form.loginId}
          onChange={(e) => setForm((p) => ({ ...p, loginId: e.target.value }))}
          placeholder={loginPlaceholder}
          className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                     px-5 py-3.5 border border-zinc-600 focus:outline-none
                     focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
        <input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="Password"
          className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                     px-5 py-3.5 border border-zinc-600 focus:outline-none
                     focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
        />
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <button
        type="submit"
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500
                   px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/30
                   hover:from-orange-400 hover:to-amber-400 transition"
      >
        {submitLabel}
      </button>
    </form>
  )

  const RegistrationSuccess = (
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

  const RegistrationForm = (
    <form className="space-y-2" onSubmit={handleRegistrationSubmit}>
      {/* ── Eligibility / Info (top of form) ───────────────────────── */}
      <div className="rounded-2xl border border-zinc-600 bg-zinc-800/50 p-4">
        <p className="text-sm text-slate-200">
          High school/organization is located in one of the 21 counties* in Suncoast Credit Union's geographic footprint
        </p>
        <p className="mt-2 text-sm text-slate-200">
          Team of four high school students and one school/organization representative (limit 1 team per school organization)
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">School/ORG Name</label>
        <input
          required
          value={registerForm.teamName}
          onChange={(e) => setRegisterForm((p) => ({ ...p, teamName: e.target.value }))}
          placeholder="School/ORG Name"
          className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                   px-5 py-3.5 border border-zinc-600 focus:outline-none
                   focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">School/ORG Name/Title</label>
          <input
            required
            value={registerForm.organization}
            onChange={(e) => setRegisterForm((p) => ({ ...p, organization: e.target.value }))}
            placeholder="Enter Title"
            className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                     px-5 py-3.5 border border-zinc-600 focus:outline-none
                     focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">County</label>
          <input
            value={registerForm.notes}
            onChange={(e) => setRegisterForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="County"
            className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                     px-5 py-3.5 border border-zinc-600 focus:outline-none
                     focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Email Id</label>
          <input
            required
            type="email"
            value={registerForm.contactEmail}
            onChange={(e) => setRegisterForm((p) => ({ ...p, contactEmail: e.target.value }))}
            placeholder="Enter Email Id"
            className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                     px-5 py-3.5 border border-zinc-600 focus:outline-none
                     focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Phone Number</label>
          <input
            value={registerForm.contactName}
            onChange={(e) => setRegisterForm((p) => ({ ...p, contactName: e.target.value }))}
            placeholder="Enter Phone Number"
            className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                     px-5 py-3.5 border border-zinc-600 focus:outline-none
                     focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">Address</label>
        <input
          value={registerForm.organization}
          onChange={(e) => setRegisterForm((p) => ({ ...p, organization: e.target.value }))}
          placeholder="Address"
          className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400
                   px-5 py-3.5 border border-zinc-600 focus:outline-none
                   focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
        />
      </div>

      {/* ── Checkboxes (above submit) ─────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-600 bg-zinc-800/50 p-4 space-y-3">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 rounded-md border-zinc-600 bg-zinc-700/60 accent-orange-500" />
          <span className="text-sm text-slate-200">I confirm our team meets the eligibility criteria.</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 rounded-md border-zinc-600 bg-zinc-700/60 accent-orange-500" />
          <span className="text-sm text-slate-200">I agree to follow the event rules and code of conduct.</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 rounded-md border-zinc-600 bg-zinc-700/60 accent-orange-500" />
          <span className="text-sm text-slate-200">I consent to receive event updates and notifications.</span>
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500
                 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/30
                 hover:from-orange-400 hover:to-amber-400 transition"
      >
        Submit
      </button>
    </form>
  )


  const RightArtPanel = (
    <aside className="hidden lg:block">
      <div className="relative h-full min-h-[520px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl shadow-orange-500/10">
        <img
          src={heroImageUrl}
          alt="Football artwork"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/60 via-slate-950/20 to-transparent" />
      </div>
    </aside>
  )

  const FormCard = (
    <section className="rounded-3xl p-6 sm:p-8">
      {displayVariant === 'modal' ? (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
            {isRegistrationMode ? 'Team Registration' : 'Secure Sign In'}
          </span>
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
          className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
        >
          Back to landing
        </button>
      ) : null}

      {TopHeader}
      {TabTriggers}
      {isRegistrationMode ? (registrationSubmitted ? RegistrationSuccess : RegistrationForm) : LoginForm}
    </section>
  )

  const innerContent = (
    <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-2">
      {FormCard}
      {RightArtPanel}
    </div>
  )

  if (displayVariant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-slate-500/30 backdrop-blur"
          onClick={onClose}
          role="button"
          aria-label="Close authentication"
          tabIndex={-1}
        />
        <div className="relative w-full max-w-6xl">
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
