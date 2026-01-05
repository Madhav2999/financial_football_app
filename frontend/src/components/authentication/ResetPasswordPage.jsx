import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function ResetPasswordPage({ onResetPassword }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const role = searchParams.get('role') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Reset token missing. Please use the link from your email.')
    }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    if (!password || password !== confirmPassword) {
      setError('Passwords must match.')
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await onResetPassword(token, password, role)
      setMessage('Password updated. You can now sign in with your new password.')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      const rawMessage = err?.message || ''
      if (rawMessage.toLowerCase().includes('expired')) {
        setError('Link expired, request a new one.')
      } else {
        setError(rawMessage || 'Unable to reset password. Please request a new link.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-12">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-sky-400">Reset Password</p>
          <h1 className="text-3xl font-semibold text-white">Set a new password</h1>
          <p className="mt-2 text-sm text-slate-300">Enter and confirm a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow shadow-sky-500/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
