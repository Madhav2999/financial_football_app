import { useEffect, useMemo, useState } from 'react'
import AuthHeader from './authentication/AuthHeader'
import ForgotPasswordPanel from './authentication/ForgotPasswordPanel'
import LoginForm from './authentication/LoginForm'
import ModeTabs from './authentication/ModeTabs'
import RegistrationForm from './authentication/RegistrationForm'
import RegistrationSuccess from './authentication/RegistrationSuccess'
import {
  BASE_MODES,
  INITIAL_FORGOT_STATE,
  INITIAL_MODERATOR_REGISTER_FORM,
  INITIAL_REGISTER_FORM,
  REGISTRATION_MODE,
} from './authentication/state'

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
  const [forgotResetLink, setForgotResetLink] = useState('')
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
    setForgotResetLink('')
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
    setForgotResetLink('')
    setForgotForms(INITIAL_FORGOT_STATE)
  }

  const closeForgot = () => {
    setForgotMode(null)
    setForgotError(null)
    setForgotMessage('')
    setForgotResetLink('')
    setForgotForms(INITIAL_FORGOT_STATE)
  }

  const isRegistrationMode = mode === 'register'
  const visibleError = error || localError

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault()
    setRegisterError(null)
    setRegistrationSubmitted(false)
    setRegisterSuccessMessage('')

    const isTeamRegistration = registerVariant === 'team'

    if (isTeamRegistration) {
      const { teamName, organization, contactEmail, password, loginId, acknowledgements } = registerForm
      const hasAcknowledged =
        acknowledgements?.authorization && acknowledgements?.noGuarantee && acknowledgements?.travel
      if (!teamName.trim() || !organization.trim() || !contactEmail.trim() || !password.trim() || !loginId.trim()) {
        setRegisterError('Please complete all required team registration fields.')
        return
      }
      if (!hasAcknowledged) {
        setRegisterError('Please acknowledge all statements before submitting your registration.')
        return
      }
    } else {
      const { loginId, email, password } = moderatorRegisterForm
      if (!loginId.trim() || !email.trim() || !password.trim()) {
        setRegisterError('Please complete all required moderator registration fields.')
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
            county: registerForm.county.trim(),
            contactEmail: registerForm.contactEmail.trim(),
            contactName: registerForm.contactName.trim(),
            notes: registerForm.notes.trim(),
            password: registerForm.password.trim(),
            acknowledgements: registerForm.acknowledgements,
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
    setForgotResetLink('')

    const formState = forgotForms[forgotMode]
    const emailField = forgotMode === 'team' ? formState.contactEmail.trim() : formState.email.trim()

    if (!emailField) {
      setForgotError('Please enter your account email to receive a reset link.')
      return
    }

    const payload = forgotMode === 'team' ? { contactEmail: emailField } : { email: emailField }

    const forgotCallback = forgotMode === 'team' ? onTeamForgotPassword : onModeratorForgotPassword
    if (!forgotCallback) {
      setForgotError('Password reset is currently unavailable. Please contact support.')
      return
    }

    try {
      setForgotSubmitting(true)
      const result = await forgotCallback(payload)

      setForgotMessage(
        result?.message ||
          'If that email is on file, we have sent a password reset link. Please check your inbox.',
      )
      setForgotResetLink(result?.resetUrl || '')
      setForgotForms(INITIAL_FORGOT_STATE)
    } catch (submissionError) {
      setForgotError(submissionError?.message || 'Unable to reset password right now. Please try again later.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  const updateForgotForms = (targetMode, nextState) => {
    setForgotForms((previous) => ({
      ...previous,
      [targetMode]: nextState,
    }))
  }

  useEffect(() => {
    if (displayVariant !== 'modal') return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayVariant, onClose])

  const resetRegistrationFlow = () => {
    setRegistrationSubmitted(false)
    setRegisterSuccessMessage('')
    setRegisterError(null)
    setRegisterForm(INITIAL_REGISTER_FORM)
    setModeratorRegisterForm(INITIAL_MODERATOR_REGISTER_FORM)
  }

  const modalContent = (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
        role="dialog"
        aria-modal
      >
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur" />
        <div
          className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950/90 shadow-2xl shadow-orange-500/5 max-h-[90vh]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="absolute left-6 top-6 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Authentication</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-slate-600/80 bg-slate-800/80 text-lg font-semibold text-slate-200 transition hover:border-orange-400 hover:text-orange-100"
          >
            ×
          </button>
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="p-6 sm:p-8">
            <AuthHeader
              isRegistrationMode={isRegistrationMode}
              onSwitchToLogin={() => handleModeChange('team')}
              onSwitchToRegister={() => handleModeChange('register')}
            />

            {displayVariant === 'modal' && onClose ? (
              <div className="mb-3 flex justify-end lg:hidden">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-orange-400 hover:text-orange-100"
                >
                  Close
                </button>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
              <div className="max-h-[68vh] overflow-y-auto pr-1 sm:pr-2">
                <ModeTabs mode={mode} onChange={handleModeChange} hidden={isRegistrationMode} />
                {isRegistrationMode ? (
                  registrationSubmitted ? (
                    <RegistrationSuccess message={registerSuccessMessage} onReset={resetRegistrationFlow} />
                  ) : (
                    <RegistrationForm
                      registerVariant={registerVariant}
                      onVariantChange={handleRegisterVariantChange}
                      registerForm={registerForm}
                      moderatorRegisterForm={moderatorRegisterForm}
                      onRegisterFormChange={setRegisterForm}
                      onModeratorRegisterFormChange={setModeratorRegisterForm}
                      onSubmit={handleRegistrationSubmit}
                      submitting={registerSubmitting}
                      error={registerError}
                      scrollable={displayVariant === 'modal'}
                    />
                  )
                ) : (
                  <div className="space-y-4">
                    <LoginForm
                      mode={mode}
                      form={form}
                      onChange={setForm}
                      onSubmit={handleSubmit}
                      onOpenForgot={openForgot}
                      submitting={loginSubmitting}
                      error={visibleError}
                    />
                    <ForgotPasswordPanel
                      forgotMode={forgotMode}
                      forgotForms={forgotForms}
                      onChange={updateForgotForms}
                      onSubmit={handleForgotSubmit}
                      onClose={closeForgot}
                      submitting={forgotSubmitting}
                      error={forgotError}
                      message={forgotMessage}
                      resetLink={forgotResetLink}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="relative hidden min-h-[540px] overflow-hidden rounded-l-[40px] border-l border-slate-800 bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-950 lg:block">
            <img
              src="/assets/register-modal-img.jpg"
              alt="Football players"
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-transparent to-orange-500/20" />
          </div>
        </div>
      </div>
    </div>
  )

  const pageContent = (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Financial Football</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white">{isRegistrationMode ? 'Register your team' : 'Sign in'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {isRegistrationMode
                ? 'Create your account to join the Financial Football tournament experience.'
                : 'Use your login credentials to access your dashboard and manage your matches.'}
            </p>
          </div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="hidden rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-orange-400 hover:text-orange-200 sm:block"
            >
              Back
            </button>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 shadow-2xl shadow-orange-500/5 backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="p-6 sm:p-8 lg:p-10">
              <AuthHeader
                isRegistrationMode={isRegistrationMode}
                onSwitchToLogin={() => handleModeChange('team')}
                onSwitchToRegister={() => handleModeChange('register')}
              />
              <ModeTabs mode={mode} onChange={handleModeChange} hidden={isRegistrationMode} />
              {isRegistrationMode ? (
                registrationSubmitted ? (
                  <RegistrationSuccess message={registerSuccessMessage} onReset={resetRegistrationFlow} />
                ) : (
                  <RegistrationForm
                    registerVariant={registerVariant}
                    onVariantChange={handleRegisterVariantChange}
                    registerForm={registerForm}
                    moderatorRegisterForm={moderatorRegisterForm}
                    onRegisterFormChange={setRegisterForm}
                    onModeratorRegisterFormChange={setModeratorRegisterForm}
                    onSubmit={handleRegistrationSubmit}
                    submitting={registerSubmitting}
                    error={registerError}
                    scrollable={false}
                  />
                )
              ) : (
                <>
                  <LoginForm
                    mode={mode}
                    form={form}
                    onChange={setForm}
                    onSubmit={handleSubmit}
                    onOpenForgot={openForgot}
                    submitting={loginSubmitting}
                    error={visibleError}
                  />
                  <ForgotPasswordPanel
                    forgotMode={forgotMode}
                    forgotForms={forgotForms}
                    onChange={updateForgotForms}
                    onSubmit={handleForgotSubmit}
                    onClose={closeForgot}
                    submitting={forgotSubmitting}
                    error={forgotError}
                    message={forgotMessage}
                    resetLink={forgotResetLink}
                  />
                </>
              )}
            </section>

            <div className="relative hidden min-h-[560px] overflow-hidden rounded-l-[32px] border-l border-slate-800 bg-gradient-to-br from-orange-500/15 via-slate-900 to-slate-950 lg:block">
              <img
                src={heroImageUrl}
                alt="Players running on field"
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-transparent to-orange-500/20" />
            </div>
          </div>
        </div>
      </div>

      {displayVariant === 'page' && onClose ? <div className="fixed inset-0 bg-slate-900/40 backdrop-blur" /> : null}
    </div>
  )

  if (displayVariant === 'modal') {
    return modalContent
  }

  return pageContent
}
