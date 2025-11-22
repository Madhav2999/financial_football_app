import { useEffect, useMemo, useState } from 'react'

const MIN_PASSWORD_LENGTH = 6
const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value?.trim() ?? '')

const BASE_MODES = [
  { id: 'team', label: 'User Login' }, // label to match screenshot
  { id: 'admin', label: 'Admin Login' },
  { id: 'moderator', label: 'Moderator Login' },
]

const REGISTRATION_MODE = { id: 'register', label: 'Register Team' }

const INITIAL_REGISTER_FORM = {
  loginId: '',
  teamName: '',
  organization: '',
  contactName: '',
  contactEmail: '',
  notes: '',
  password: '',
}

const INITIAL_MODERATOR_REGISTER_FORM = {
  loginId: '',
  email: '',
  password: '',
  displayName: '',
}

const INITIAL_FORGOT_STATE = {
  team: { loginId: '', contactEmail: '', newPassword: '' },
  moderator: { loginId: '', email: '', newPassword: '' },
}

export default function AuthenticationGateway({
  initialMode = 'team',
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  onTeamRegister,
  onModeratorRegister,
  onTeamForgotPassword,
  onModeratorForgotPassword,
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
  const [moderatorRegisterForm, setModeratorRegisterForm] = useState(INITIAL_MODERATOR_REGISTER_FORM)
  const [registerVariant, setRegisterVariant] = useState('team')
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState('')
  const [registerError, setRegisterError] = useState(null)
  const [registerSubmitting, setRegisterSubmitting] = useState(false)
  const [forgotForms, setForgotForms] = useState(INITIAL_FORGOT_STATE)
  const [forgotMode, setForgotMode] = useState(null)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState(null)
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [loginSubmitting, setLoginSubmitting] = useState(false)

  useEffect(() => {
    const nextMode = allowedModes.includes(initialMode) ? initialMode : allowedModes[0]
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
    setRegisterForm(INITIAL_REGISTER_FORM)
    setModeratorRegisterForm(INITIAL_MODERATOR_REGISTER_FORM)
    setRegisterVariant('team')
    setRegistrationSubmitted(false)
    setRegisterSuccessMessage('')
    setRegisterError(null)
    setForgotForms(INITIAL_FORGOT_STATE)
    setForgotMode(null)
    setForgotMessage('')
    setForgotError(null)
    setLocalError(null)
  }, [initialMode, allowedModes])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError(null)
    const loginId = form.loginId.trim()
    const password = form.password.trim()

    if (!loginId || !password) {
      setLocalError('Please enter both Login ID and Password.')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    try {
      setLoginSubmitting(true)
      if (mode === 'team') await onTeamLogin(loginId, password)
      else if (mode === 'admin') await onAdminLogin(loginId, password)
      else if (mode === 'moderator') await onModeratorLogin?.(loginId, password)
      setForm({ loginId: '', password: '' })
    } catch (submissionError) {
      setLocalError(submissionError?.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoginSubmitting(false)
    }
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setForm({ loginId: '', password: '' })
    setRegisterForm(INITIAL_REGISTER_FORM)
    setModeratorRegisterForm(INITIAL_MODERATOR_REGISTER_FORM)
    setRegisterVariant('team')
    setRegistrationSubmitted(false)
    setRegisterSuccessMessage('')
    setRegisterError(null)
    setForgotForms(INITIAL_FORGOT_STATE)
    setForgotMode(null)
    setForgotMessage('')
    setForgotError(null)
    setLocalError(null)
  }

  const handleRegisterVariantChange = (variant) => {
    setRegisterVariant(variant)
    setRegistrationSubmitted(false)
    setRegisterSuccessMessage('')
    setRegisterError(null)
  }

  const openForgot = (targetMode) => {
    setForgotMode(targetMode)
    setForgotError(null)
    setForgotMessage('')
    setForgotForms(INITIAL_FORGOT_STATE)
  }

  const closeForgot = () => {
    setForgotMode(null)
    setForgotError(null)
    setForgotMessage('')
    setForgotForms(INITIAL_FORGOT_STATE)
  }

  const loginPlaceholder = mode === 'team' ? 'Enter user Id' : mode === 'admin' ? 'admin' : 'mod1'
  const loginLabel =
    mode === 'team' ? 'User Id' : mode === 'admin' ? 'Admin Login ID' : 'Moderator Login ID'
  const submitLabel =
    mode === 'team' ? 'Login' : mode === 'admin' ? 'Sign in as Admin' : 'Sign in as Moderator'
  const isRegistrationMode = mode === 'register'
  const visibleError = error || localError

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault()
    setRegisterError(null)
    setRegistrationSubmitted(false)
    setRegisterSuccessMessage('')

    const isTeamRegistration = registerVariant === 'team'

    if (isTeamRegistration) {
      const { teamName, organization, contactEmail, password, loginId } = registerForm
      if (!teamName.trim() || !organization.trim() || !contactEmail.trim() || !password.trim() || !loginId.trim()) {
        setRegisterError('Please complete all required team registration fields.')
        return
      }

      if (!isValidEmail(contactEmail)) {
        setRegisterError('Please provide a valid contact email address.')
        return
      }

      if (password.trim().length < MIN_PASSWORD_LENGTH) {
        setRegisterError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }
    } else {
      const { loginId, email, password } = moderatorRegisterForm
      if (!loginId.trim() || !email.trim() || !password.trim()) {
        setRegisterError('Please complete all required moderator registration fields.')
        return
      }

      if (!isValidEmail(email)) {
        setRegisterError('Please provide a valid moderator email address.')
        return
      }

      if (password.trim().length < MIN_PASSWORD_LENGTH) {
        setRegisterError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }
    }

    const registrationCallback = isTeamRegistration ? onTeamRegister : onModeratorRegister
    if (!registrationCallback) {
      setRegisterError('Registration is currently unavailable. Please try again later.')
      return
    }

    try {
      setRegisterSubmitting(true)
      const result = isTeamRegistration
        ? await registrationCallback({
            ...registerForm,
            loginId: registerForm.loginId.trim(),
            teamName: registerForm.teamName.trim(),
            organization: registerForm.organization.trim(),
            contactEmail: registerForm.contactEmail.trim(),
            contactName: registerForm.contactName.trim(),
            notes: registerForm.notes.trim(),
            password: registerForm.password.trim(),
          })
        : await registrationCallback({
            ...moderatorRegisterForm,
            loginId: moderatorRegisterForm.loginId.trim(),
            email: moderatorRegisterForm.email.trim(),
            password: moderatorRegisterForm.password.trim(),
            displayName: moderatorRegisterForm.displayName.trim(),
          })

      setRegistrationSubmitted(true)
      setRegisterSuccessMessage(result?.message || 'Thanks! Your registration has been received.')
      setRegisterForm(INITIAL_REGISTER_FORM)
      setModeratorRegisterForm(INITIAL_MODERATOR_REGISTER_FORM)
    } catch (submissionError) {
      setRegisterError(submissionError?.message || 'Unable to submit registration. Please try again.')
    } finally {
      setRegisterSubmitting(false)
    }
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    if (!forgotMode) return
    setForgotError(null)
    setForgotMessage('')

    const formState = forgotForms[forgotMode]
    const loginId = formState.loginId.trim()
    const newPassword = formState.newPassword.trim()
    const emailField = forgotMode === 'team' ? formState.contactEmail.trim() : formState.email.trim()

    if (!loginId || !newPassword || (forgotMode === 'moderator' && !emailField)) {
      setForgotError('Please provide the required details to reset your password.')
      return
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setForgotError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (emailField && !isValidEmail(emailField)) {
      setForgotError('Please enter a valid email address for verification.')
      return
    }

    const payload =
      forgotMode === 'team'
        ? { loginId, contactEmail: emailField, newPassword }
        : { loginId, email: emailField, newPassword }

    const forgotCallback = forgotMode === 'team' ? onTeamForgotPassword : onModeratorForgotPassword
    if (!forgotCallback) {
      setForgotError('Password reset is currently unavailable. Please contact support.')
      return
    }

    try {
      setForgotSubmitting(true)
      const result = await forgotCallback(payload)

      setForgotMessage(result?.message || 'Password updated. You can sign in with the new password now.')
      setForgotForms(INITIAL_FORGOT_STATE)
    } catch (submissionError) {
      setForgotError(submissionError?.message || 'Unable to reset password right now. Please try again later.')
    } finally {
      setForgotSubmitting(false)
    }
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
    <div className="space-y-5">
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

        {mode === 'team' || mode === 'moderator' ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => openForgot(mode)}
              className="text-sm font-semibold text-sky-300 underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        {visibleError ? <p className="text-sm text-rose-400">{visibleError}</p> : null}

        <button
          type="submit"
          disabled={loginSubmitting}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500
                     px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/30
                     hover:from-orange-400 hover:to-amber-400 transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loginSubmitting ? 'Signing in...' : submitLabel}
        </button>
      </form>

      {forgotMode ? (
        <form
          className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4"
          onSubmit={handleForgotSubmit}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Reset {forgotMode === 'team' ? 'Team' : 'Moderator'} Password
              </p>
              <p className="text-xs text-slate-300">Enter your account details to set a new password.</p>
            </div>
            <button
              type="button"
              onClick={closeForgot}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Login ID</label>
              <input
                value={forgotForms[forgotMode].loginId}
                onChange={(e) =>
                  setForgotForms((previous) => ({
                    ...previous,
                    [forgotMode]: { ...previous[forgotMode], loginId: e.target.value },
                  }))
                }
                placeholder="Enter your Login ID"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>

            {forgotMode === 'team' ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Contact Email (optional)</label>
                <input
                  type="email"
                  value={forgotForms.team.contactEmail}
                  onChange={(e) =>
                    setForgotForms((previous) => ({
                      ...previous,
                      team: { ...previous.team, contactEmail: e.target.value },
                    }))
                  }
                  placeholder="Email for verification"
                  className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Email</label>
                <input
                  type="email"
                  value={forgotForms.moderator.email}
                  onChange={(e) =>
                    setForgotForms((previous) => ({
                      ...previous,
                      moderator: { ...previous.moderator, email: e.target.value },
                    }))
                  }
                  placeholder="Moderator email"
                  className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">New Password</label>
            <input
              type="password"
              value={forgotForms[forgotMode].newPassword}
              onChange={(e) =>
                setForgotForms((previous) => ({
                  ...previous,
                  [forgotMode]: { ...previous[forgotMode], newPassword: e.target.value },
                }))
              }
              placeholder="Enter a new password"
              className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
            />
          </div>

          {forgotError ? <p className="text-sm text-rose-400">{forgotError}</p> : null}
          {forgotMessage ? <p className="text-sm text-emerald-300">{forgotMessage}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeForgot}
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotSubmitting}
              className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {forgotSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )

  const RegistrationSuccess = (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-sm text-emerald-200">
      <h3 className="text-lg font-semibold text-emerald-300">
        {registerVariant === 'team' ? 'Registration request captured' : 'Moderator request captured'}
      </h3>
      <p className="mt-2 text-slate-200">{registerSuccessMessage || 'Thank you for your interest!'}</p>
      <button
        type="button"
        onClick={() => {
          setRegisterForm(INITIAL_REGISTER_FORM)
          setModeratorRegisterForm(INITIAL_MODERATOR_REGISTER_FORM)
          setRegistrationSubmitted(false)
          setRegisterSuccessMessage('')
        }}
        className="mt-4 rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
      >
        Submit another
      </button>
    </div>
  )

  const RegistrationForm = (
    <form className="space-y-5 pb-8" onSubmit={handleRegistrationSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-slate-800/60 p-1 text-xs font-semibold text-white">
          {[
            { id: 'team', label: 'Team Registration' },
            { id: 'moderator', label: 'Moderator Registration' },
          ].map((item) => {
            const active = registerVariant === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRegisterVariantChange(item.id)}
                className={`rounded-full px-4 py-2 transition ${
                  active ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-200 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-300">Choose the registration type to continue.</p>
      </div>

      {registerVariant === 'team' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-600 bg-zinc-800/50 p-4">
            <p className="text-sm text-slate-200">One request per school/organization representative.</p>
            <p className="mt-1 text-sm text-slate-200">A coordinator will reach out with next steps after review.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Login ID</label>
              <input
                required
                value={registerForm.loginId}
                onChange={(e) => setRegisterForm((p) => ({ ...p, loginId: e.target.value }))}
                placeholder="Create a login ID"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Contact Email</label>
              <input
                required
                type="email"
                value={registerForm.contactEmail}
                onChange={(e) => setRegisterForm((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="Enter Email"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">School/ORG Name</label>
              <input
                required
                value={registerForm.teamName}
                onChange={(e) => setRegisterForm((p) => ({ ...p, teamName: e.target.value }))}
                placeholder="School/ORG Name"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">County</label>
              <input
                value={registerForm.notes}
                onChange={(e) => setRegisterForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="County"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Representative Name/Title</label>
              <input
                required
                value={registerForm.organization}
                onChange={(e) => setRegisterForm((p) => ({ ...p, organization: e.target.value }))}
                placeholder="Organization Title"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Contact Phone</label>
              <input
                value={registerForm.contactName}
                onChange={(e) => setRegisterForm((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="Enter Phone Number"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
            <input
              required
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Create a password"
              className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-600 bg-zinc-800/50 p-4">
            <p className="text-sm text-slate-200">Provide your moderator credentials to request access.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Login ID</label>
              <input
                required
                value={moderatorRegisterForm.loginId}
                onChange={(e) => setModeratorRegisterForm((p) => ({ ...p, loginId: e.target.value }))}
                placeholder="Moderator login ID"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Email</label>
              <input
                required
                type="email"
                value={moderatorRegisterForm.email}
                onChange={(e) => setModeratorRegisterForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email address"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Display Name</label>
              <input
                value={moderatorRegisterForm.displayName}
                onChange={(e) => setModeratorRegisterForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="Optional display name"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
              <input
                required
                type="password"
                value={moderatorRegisterForm.password}
                onChange={(e) => setModeratorRegisterForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Create a password"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Your request will be reviewed by an administrator. Approved moderators will receive next steps via email.
          </p>
        </div>
      )}

      {registerError ? <p className="text-sm text-rose-400">{registerError}</p> : null}

      <button
        type="submit"
        disabled={registerSubmitting}
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500
                 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/30
                 hover:from-orange-400 hover:to-amber-400 transition disabled:cursor-not-allowed disabled:opacity-70"
      >
        {registerSubmitting ? 'Submitting...' : 'Submit'}
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
              className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-sky-500 hover:text-sky-300 cursor-pointer"
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
        <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-slate-100 shadow-2xl shadow-sky-500/20">
          {innerContent}
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