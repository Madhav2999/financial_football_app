import { useMemo, useState } from 'react'

function Avatar({ url, name }) {
  if (url) {
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20" />
  }
  const initial = name?.charAt(0)?.toUpperCase() || '?'
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white ring-1 ring-white/20">
      {initial}
    </div>
  )
}

export default function AdminProfilesTab({
  teams = [],
  moderators = [],
  onSetPassword,
  onDeleteTeam,
  onDeleteModerator,
}) {
  const [selected, setSelected] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [expanded, setExpanded] = useState(new Set())

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [teams])
  const sortedMods = useMemo(
    () => [...moderators].sort((a, b) => (a.displayName || a.loginId || '').localeCompare(b.displayName || b.loginId || '')),
    [moderators],
  )

  const handleSubmit = async () => {
    if (!selected || !newPassword) return
    await onSetPassword?.(selected.type, selected.id, newPassword)
    setNewPassword('')
    setSelected(null)
  }

  const toggleExpand = (id, type) => {
    const key = `${type}-${id}`
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const renderCard = (entry, type) => {
    const title = type === 'team' ? entry.name : entry.displayName || entry.loginId
    const key = `${type}-${entry.id}`
    const isExpanded = expanded.has(key)
    const isPasswordOpen = selected?.type === type && selected?.id === entry.id
    const onDelete = type === 'team' ? onDeleteTeam : onDeleteModerator

    return (
      <div
        key={key}
        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow shadow-slate-900/30"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar url={entry.avatarUrl} name={title} />
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-slate-400">{entry.loginId}</p>
              {entry.email ? <p className="text-xs text-slate-400">{entry.email}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelected({ type, id: entry.id })
                setExpanded((prev) => {
                  const next = new Set(prev)
                  next.add(key)
                  return next
                })
              }}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-sky-400 hover:text-white"
            >
              Set password
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this profile?')) {
                    onDelete(entry.id)
                  }
                }}
                className="rounded-full border border-rose-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100 hover:border-rose-500"
              >
                Delete
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => toggleExpand(entry.id, type)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
            >
              {isExpanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>
        {isExpanded ? (
            <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
                {type === 'team' ? (
                  <>
                    <span>Region: {entry.region || '-'}</span>
                    <span>Seed: {entry.seed ?? '-'}</span>
                    <span>Coach contact: {entry.coachContact || '-'}</span>
                    <span>Organization: {entry.organization || '-'}</span>
                    <span>Contact name: {entry.contactName || '-'}</span>
                    <span>Contact email: {entry.contactEmail || '-'}</span>
                    <span>County: {entry.county || '-'}</span>
                  </>
                ) : (
                  <>
                    <span>Email: {entry.email || '-'}</span>
                    <span>Role: {entry.role || 'moderator'}</span>
                  </>
                )}
                <span>Created: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</span>
                <span>ID: {entry.id}</span>
              </div>
            {isPasswordOpen ? (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Set new password</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="New password"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow shadow-emerald-500/30 hover:bg-emerald-400"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null)
                      setNewPassword('')
                    }}
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 hover:border-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Teams</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{sortedTeams.map((t) => renderCard(t, 'team'))}</div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Moderators</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{sortedMods.map((m) => renderCard(m, 'moderator'))}</div>
      </div>
    </div>
  )
}
