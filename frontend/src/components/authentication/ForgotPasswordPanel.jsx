export default function ForgotPasswordPanel({
  forgotMode,
  forgotForms,
  onChange,
  onSubmit,
  onClose,
  submitting,
  error,
  message,
}) {
  if (!forgotMode) return null

  const modeState = forgotForms[forgotMode]
  const emailField = forgotMode === 'team' ? 'contactEmail' : 'email'

  return (
    <form className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            Reset {forgotMode === 'team' ? 'Team' : 'Moderator'} Password
          </p>
          <p className="text-xs text-slate-300">Enter your account details to set a new password.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
        >
          Close
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Login ID</label>
          <input
            value={modeState.loginId}
            onChange={(e) => onChange(forgotMode, { ...modeState, loginId: e.target.value })}
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
              onChange={(e) => onChange('team', { ...forgotForms.team, contactEmail: e.target.value })}
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
              onChange={(e) => onChange('moderator', { ...forgotForms.moderator, email: e.target.value })}
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
          value={modeState.newPassword}
          onChange={(e) => onChange(forgotMode, { ...modeState, newPassword: e.target.value })}
          placeholder="Enter a new password"
          className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
        />
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:from-sky-400 hover:to-cyan-400 transition disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? 'Updating password...' : 'Reset Password'}
      </button>
    </form>
  )
}
