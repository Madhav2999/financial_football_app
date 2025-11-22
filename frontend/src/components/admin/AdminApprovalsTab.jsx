import { useMemo, useState } from 'react'
import AdminRosterPanel from './AdminRosterPanel'

function StatusBadge({ status }) {
  const styles = {
    pending: 'border-amber-400/60 bg-amber-500/10 text-amber-100',
    approved: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100',
    rejected: 'border-rose-500/60 bg-rose-500/10 text-rose-100',
  }

  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${styles[status] || styles.pending}`}>
      {label}
    </span>
  )
}

function RegistrationRoster({
  title,
  description,
  registrations = [],
  type,
  onApprove,
}) {
  const [approvingId, setApprovingId] = useState(null)
  const sorted = useMemo(
    () =>
      [...registrations].sort((left, right) =>
        new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
      ),
    [registrations],
  )

  const handleApprove = async (id) => {
    if (!onApprove) return
    setApprovingId(id)
    try {
      await onApprove(id)
    } finally {
      setApprovingId(null)
    }
  }

  const emptyMessage =
    type === 'team'
      ? 'No team registrations are waiting for approval.'
      : 'No moderator registrations are waiting for approval.'

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Approval queue</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">{description}</p>
        </div>
        <div className="rounded-full border border-slate-700 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-300">
          {registrations.length} request{registrations.length === 1 ? '' : 's'}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">{emptyMessage}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((registration) => {
            const isPending = registration.status === 'pending'
            const label =
              type === 'team'
                ? registration.teamName || registration.organization || registration.loginId
                : registration.displayName || registration.loginId

            return (
              <div
                key={registration.id}
                className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200 shadow-inner shadow-slate-900/30"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{type === 'team' ? 'Team' : 'Moderator'}</p>
                      <p className="text-lg font-semibold text-white">{label || 'Unnamed'}</p>
                    </div>
                    <StatusBadge status={registration.status} />
                  </div>
                  <p className="text-slate-300">Login: {registration.loginId}</p>
                  {registration.contactEmail || registration.email ? (
                    <p className="text-slate-300">Email: {registration.contactEmail || registration.email}</p>
                  ) : null}
                  {registration.organization ? (
                    <p className="text-slate-400">Organization: {registration.organization}</p>
                  ) : null}
                  {registration.contactName ? (
                    <p className="text-slate-400">Contact: {registration.contactName}</p>
                  ) : null}
                  {registration.county ? (
                    <p className="text-slate-400">County: {registration.county}</p>
                  ) : null}
                  {registration.displayName && type === 'moderator' ? (
                    <p className="text-slate-400">Display name: {registration.displayName}</p>
                  ) : null}
                  {registration.createdAt ? (
                    <p className="text-xs text-slate-500">
                      Submitted {new Date(registration.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {isPending ? 'Awaiting approval' : 'Decision recorded'}
                  </span>
                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => handleApprove(registration.id)}
                      disabled={approvingId === registration.id}
                      className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {approvingId === registration.id ? 'Approving...' : 'Approve'}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default function AdminApprovalsTab({
  teamRegistrations = [],
  moderatorRegistrations = [],
  teams = [],
  moderators = [],
  onApproveTeam,
  onApproveModerator,
  onReload,
  onDeleteTeam,
  onDeleteModerator,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Access management</p>
          <h1 className="text-3xl font-semibold text-white">Registration approvals</h1>
          <p className="mt-2 text-sm text-slate-300">
            Review pending requests, approve eligible accounts, and keep the tournament roster up to date.
          </p>
        </div>
        {onReload ? (
          <button
            type="button"
            onClick={onReload}
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Refresh lists
          </button>
        ) : null}
      </div>

      <RegistrationRoster
        title="Team approvals"
        description="Validate team submissions and promote approved teams to the active roster."
        registrations={teamRegistrations}
        type="team"
        onApprove={onApproveTeam}
      />

      <RegistrationRoster
        title="Moderator approvals"
        description="Approve moderator candidates so they can manage live matches and coin tosses."
        registrations={moderatorRegistrations}
        type="moderator"
        onApprove={onApproveModerator}
      />

      <AdminRosterPanel
        title="Active teams"
        description="Manage approved teams that currently have access to the tournament."
        entries={teams}
        type="team"
        onDelete={onDeleteTeam}
      />

      <AdminRosterPanel
        title="Active moderators"
        description="Manage approved moderators. Admin accounts are protected from removal."
        entries={moderators}
        type="moderator"
        onDelete={onDeleteModerator}
      />
    </div>
  )
}
