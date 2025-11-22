import { useMemo, useState } from 'react'

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <p className="text-slate-300">
      <span className="text-slate-400">{label}: </span>
      {value}
    </p>
  )
}

export default function AdminRosterPanel({
  title,
  description,
  entries = [],
  type,
  onDelete,
}) {
  const [deletingId, setDeletingId] = useState(null)
  const sortedEntries = useMemo(
    () => [...entries].sort((left, right) => (left.name || '').localeCompare(right.name || '')),
    [entries],
  )

  const handleDelete = async (id) => {
    if (!onDelete) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const emptyMessage =
    type === 'team'
      ? 'No teams are available to manage right now.'
      : 'No moderators are available to manage right now.'

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Roster management</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">{description}</p>
        </div>
        <div className="rounded-full border border-slate-700 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-300">
          {sortedEntries.length} account{sortedEntries.length === 1 ? '' : 's'}
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">{emptyMessage}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedEntries.map((entry) => {
            const isAdminAccount = entry.role === 'admin'
            const disableDelete = deletingId === entry.id || isAdminAccount
            return (
              <div
                key={entry.id}
                className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200 shadow-inner shadow-slate-900/30"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{type === 'team' ? 'Team' : 'Moderator'}</p>
                      <p className="text-lg font-semibold text-white">{entry.name || entry.loginId || 'Unnamed'}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                      Active
                    </span>
                  </div>
                  <DetailRow label="Login" value={entry.loginId} />
                  <DetailRow label="Email" value={entry.email || entry.contactEmail} />
                  <DetailRow label="Organization" value={entry.organization} />
                  {type === 'moderator' && entry.role ? <DetailRow label="Role" value={entry.role} /> : null}
                  {entry.county ? <DetailRow label="County" value={entry.county} /> : null}
                </div>
                <div className="flex items-center justify-between gap-3">
                  {isAdminAccount ? (
                    <span className="text-[11px] uppercase tracking-[0.25em] text-amber-300">Super admin protected</span>
                  ) : (
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Remove account</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={disableDelete}
                    className="rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow shadow-rose-500/30 transition hover:from-rose-500 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === entry.id ? 'Deleting...' : isAdminAccount ? 'Protected' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
