export default function LoginForm({
  mode,
  form,
  onChange,
  onSubmit,
  onOpenForgot,
  submitting,
  error,
}) {
  const loginPlaceholder = mode === 'team' ? 'Enter user Id' : mode === 'admin' ? 'admin' : 'mod1'
  const loginLabel = mode === 'team' ? 'User Id' : mode === 'admin' ? 'Admin Login ID' : 'Moderator Login ID'
  const submitLabel = mode === 'team' ? 'Login' : mode === 'admin' ? 'Sign in as Admin' : 'Sign in as Moderator'

  return (
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">{loginLabel}</label>
          <input
            required
            value={form.loginId}
            onChange={(e) => onChange({ ...form, loginId: e.target.value })}
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
            onChange={(e) => onChange({ ...form, password: e.target.value })}
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
              onClick={() => onOpenForgot?.(mode)}
              className="text-sm font-semibold text-sky-300 underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500
                     px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/30
                     hover:from-orange-400 hover:to-amber-400 transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Signing in...' : submitLabel}
        </button>
      </form>
    </div>
  )
}
