import { useMemo } from 'react'

export default function RosterSelectionPanel({
  teams,
  selectedTeamIds,
  limit,
  tournamentSeeded,
  tournamentLaunched,
  canEdit = false,
  onToggleTeam,
  onSubmit,
  actionLabel,
  title,
  description,
  readOnlyDescription,
  footerNote,
  readOnlyFooterNote,
}) {
  const roster = useMemo(() => {
    const selection = new Set(selectedTeamIds)
    return [...teams]
      .map((team) => ({
        ...team,
        selected: selection.has(team.id),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [teams, selectedTeamIds])

  const requiredCount = Math.min(limit, teams.length)
  const selectedCount = roster.filter((team) => team.selected).length
  const remainingSlots = Math.max(0, requiredCount - selectedCount)
  const selectionLocked = tournamentLaunched || !canEdit

  const buttonDisabled =
    !canEdit || selectionLocked || selectedCount !== requiredCount || !teams.length

  const statusBadge = (() => {
    if (tournamentLaunched) {
      return {
        label: 'Tournament launched',
        classes: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
      }
    }

    if (tournamentSeeded) {
      return {
        label: 'Match making ready',
        classes: 'border-sky-500/60 bg-sky-500/10 text-sky-200',
      }
    }

    return {
      label: 'Awaiting match making',
      classes: 'border-slate-700 bg-slate-900 text-slate-300',
    }
  })()

  const headerTitle = title ?? 'Select opening round teams'
  const headerDescription = (() => {
    if (canEdit) {
      if (description) return description
      return `Choose ${requiredCount} teams for the first round, then lock in their pairings with the match making button.`
    }

    if (readOnlyDescription) return readOnlyDescription
    return `The admin will choose ${requiredCount} teams for the first round before the tournament begins.`
  })()

  const footerMessage = (() => {
    if (tournamentLaunched) {
      return 'Selections are locked while the tournament is live.'
    }

    if (canEdit) {
      if (footerNote) return footerNote
      return 'Press Match making to randomize the opening round with the chosen teams.'
    }

    if (readOnlyFooterNote) return readOnlyFooterNote
    return 'Waiting for the admin to complete match making.'
  })()

  const submitLabel =
    actionLabel ?? (tournamentSeeded && canEdit ? 'Re-run match making' : 'Match making')

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Tournament roster</p>
          <h2 className="text-2xl font-semibold text-white">{headerTitle}</h2>
          <p className="mt-2 text-sm text-slate-300">{headerDescription}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
            {selectedCount} selected • {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} remaining
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${statusBadge.classes}`}
        >
          {statusBadge.label}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roster.map((team) => {
          const isSelected = team.selected
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onToggleTeam?.(team.id)}
              disabled={selectionLocked}
              aria-pressed={isSelected}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? 'border-sky-500/60 bg-sky-500/10 text-sky-100 shadow-inner shadow-sky-500/20'
                  : 'border-slate-800 bg-slate-950/50 text-slate-200 hover:border-sky-500/60 hover:text-white'
              } ${selectionLocked ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <span className="font-semibold text-white">{team.name}</span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${
                  isSelected ? 'border-sky-500/60 text-sky-200' : 'border-slate-700 text-slate-400'
                }`}
              >
                {isSelected ? 'Selected' : 'Reserve'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400">{footerMessage}</div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => onSubmit?.()}
            disabled={buttonDisabled}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] transition ${
              !buttonDisabled
                ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
            }`}
          >
            {submitLabel}
          </button>
        ) : null}
      </div>
    </section>
  )
}
