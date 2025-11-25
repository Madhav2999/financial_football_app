export default function ForgotPasswordPanel({
  forgotMode,
  forgotForms,
  onChange,
  onSubmit,
  onClose,
  submitting,
  error,
  message,
  resetLink,
}) {
  if (!forgotMode) return null

  const modeState = forgotForms[forgotMode]

  return (
    <form className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-100">
            Reset {forgotMode === 'team' ? 'Team' : 'Moderator'} Password
          </p>
          <p className="text-xs text-slate-300">
            Enter your account email to receive a reset link.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
        >
          Close
        </button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">
          {forgotMode === 'team' ? 'Team contact email' : 'Moderator email'}
        </label>
        <input
          type="email"
          required
          value={forgotMode === 'team' ? forgotForms.team.contactEmail : forgotForms.moderator.email}
          onChange={(e) =>
            onChange(
              forgotMode,
              forgotMode === 'team'
                ? { ...modeState, contactEmail: e.target.value }
                : { ...modeState, email: e.target.value },
            )
          }
          placeholder="you@example.com"
          className="w-full rounded-full border border-zinc-600 bg-zinc-700/60 px-5 py-3.5 text-white shadow-inner placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        />
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? 'Sending reset link...' : 'Send reset link'}
      </button>
    </form>
  )
}
