import { BASE_MODES, INITIAL_MODERATOR_REGISTER_FORM, INITIAL_REGISTER_FORM } from './state'

export default function RegistrationForm({
  registerVariant,
  onVariantChange,
  registerForm,
  moderatorRegisterForm,
  onRegisterFormChange,
  onModeratorRegisterFormChange,
  onSubmit,
  submitting,
  error,
}) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-3">
        {[
          { id: 'team', label: 'Team Registration' },
          { id: 'moderator', label: 'Moderator Registration' },
        ].map((variant) => {
          const active = registerVariant === variant.id
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onVariantChange(variant.id)}
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                'border',
                active
                  ? 'bg-orange-500/20 text-orange-100 border-orange-400'
                  : 'border-slate-600 text-slate-200 hover:bg-white/5',
              ].join(' ')}
            >
              {variant.label}
            </button>
          )
        })}
      </div>

      {registerVariant === 'team' ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Login ID</label>
              <input
                required
                value={registerForm.loginId}
                onChange={(e) => onRegisterFormChange({ ...registerForm, loginId: e.target.value })}
                placeholder="Unique login ID"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Team Name</label>
              <input
                required
                value={registerForm.teamName}
                onChange={(e) => onRegisterFormChange({ ...registerForm, teamName: e.target.value })}
                placeholder="Team name"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Organization</label>
              <input
                required
                value={registerForm.organization}
                onChange={(e) => onRegisterFormChange({ ...registerForm, organization: e.target.value })}
                placeholder="School / Organization"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Contact Name</label>
              <input
                value={registerForm.contactName}
                onChange={(e) => onRegisterFormChange({ ...registerForm, contactName: e.target.value })}
                placeholder="Coach / Coordinator"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Contact Email</label>
              <input
                required
                type="email"
                value={registerForm.contactEmail}
                onChange={(e) => onRegisterFormChange({ ...registerForm, contactEmail: e.target.value })}
                placeholder="Contact email"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
              <input
                required
                type="password"
                value={registerForm.password}
                onChange={(e) => onRegisterFormChange({ ...registerForm, password: e.target.value })}
                placeholder="Create a password"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">Notes</label>
            <textarea
              value={registerForm.notes}
              onChange={(e) => onRegisterFormChange({ ...registerForm, notes: e.target.value })}
              placeholder="Any additional context for admins"
              rows={3}
              className="w-full rounded-2xl bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
            />
          </div>

          <p className="text-xs text-slate-300">
            Once approved by an administrator, you will receive confirmation and can sign in with your login ID.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Login ID</label>
              <input
                required
                value={moderatorRegisterForm.loginId}
                onChange={(e) => onModeratorRegisterFormChange({ ...moderatorRegisterForm, loginId: e.target.value })}
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
                onChange={(e) => onModeratorRegisterFormChange({ ...moderatorRegisterForm, email: e.target.value })}
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
                onChange={(e) => onModeratorRegisterFormChange({ ...moderatorRegisterForm, displayName: e.target.value })}
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
                onChange={(e) => onModeratorRegisterFormChange({ ...moderatorRegisterForm, password: e.target.value })}
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

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500
                 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/30
                 hover:from-orange-400 hover:to-amber-400 transition disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}

export const REGISTRATION_VARIANTS = [
  { id: 'team', label: 'Team Registration', reset: INITIAL_REGISTER_FORM },
  { id: 'moderator', label: 'Moderator Registration', reset: INITIAL_MODERATOR_REGISTER_FORM },
]
