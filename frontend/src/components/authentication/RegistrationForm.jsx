import {
  BASE_MODES,
  INITIAL_MODERATOR_REGISTER_FORM,
  INITIAL_REGISTER_FORM,
  REGISTRATION_VARIANTS,
} from './state'

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
  scrollable = false,
}) {
  return (
    <form
      className={[scrollable ? 'max-h-[65vh] overflow-y-auto pr-1' : '', 'space-y-6'].join(' ')}
      onSubmit={onSubmit}
    >
      <div className="flex flex-wrap gap-3">
        {REGISTRATION_VARIANTS.map((variant) => {
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
              <label className="mb-2 block text-sm font-semibold text-slate-200">School Name</label>
              <input
                required
                value={registerForm.teamName}
                onChange={(e) => onRegisterFormChange({ ...registerForm, teamName: e.target.value })}
                placeholder="Team name"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Address</label>
              <input
                required
                value={registerForm.organization}
                onChange={(e) => onRegisterFormChange({ ...registerForm, organization: e.target.value })}
                placeholder="School / Organization"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">County</label>
              <input
                value={registerForm.county}
                onChange={(e) => onRegisterFormChange({ ...registerForm, county: e.target.value })}
                placeholder="County"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zi
nc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
            <div />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Coach Name</label>
              <input
                value={registerForm.contactName}
                onChange={(e) => onRegisterFormChange({ ...registerForm, contactName: e.target.value })}
                placeholder="Coach / Coordinator"
                className="w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner"
              />
            </div>
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
              <label className='mb-2 block text-sm font-semibold text-slate-200'>Coach Contact Number</label>
              <input required type="text" value={registerForm.coachContact} onChange={(e)=> onRegisterFormChange({...registerForm,coachContact: e.target.value})}
               className='w-full rounded-full bg-zinc-700/60 text-white placeholder:text-slate-400 px-5 py-3.5 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 shadow-inner'
              placeholder="Coach Contact No"/>
            </div>
          </div>

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

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
            <p className="mb-3 text-[13px] font-semibold text-orange-200">
              Please acknowledge the following statements by checking the boxes below:
            </p>
            <div className="space-y-3">
              {[
                {
                  key: 'authorization',
                  label: 'I have the authorization to register the team above to participate in the Financial Football Competition.',
                },
                {
                  key: 'noGuarantee',
                  label:
                    'I understand that registration does NOT guarantee automatic entry into the Financial Football Competition.',
                },
                {
                  key: 'travel',
                  label:
                    'I understand that the school will provide its own transportation and/or hotel accommodations to participate in the Financial Football Competition.',
                },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-3 text-left">
                  <input
                    type="checkbox"
                    required
                    checked={registerForm.acknowledgements?.[item.key] ?? false}
                    onChange={(e) =>
                      onRegisterFormChange({
                        ...registerForm,
                        acknowledgements: {
                          ...registerForm.acknowledgements,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-zinc-800 text-orange-400 focus:ring-orange-400"
                  />
                  <span className="text-[13px] leading-relaxed text-slate-100">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
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
