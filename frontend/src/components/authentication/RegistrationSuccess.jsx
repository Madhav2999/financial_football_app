export default function RegistrationSuccess({ message, onReset }) {
  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-6 text-emerald-100 shadow shadow-emerald-900/40">
      <h3 className="text-xl font-semibold">Registration received</h3>
      <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
        {message ||
          'Thanks! Your registration has been received. An administrator will review your request and follow up with next steps.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-full border border-emerald-400/70 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
      >
        Submit another registration
      </button>
    </div>
  )
}
