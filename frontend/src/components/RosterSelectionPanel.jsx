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
  onLaunch,
  launchReadyCount = 0,
  actionLabel,
  launchActionLabel,
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

  const maxSelectable = Math.min(limit, teams.length)
  const minRequired = Math.min(teams.length, 2)
  const enoughTeams = teams.length >= 2
  const selectedCount = roster.filter((team) => team.selected).length
  const remainingSlots = Math.max(0, maxSelectable - selectedCount)
  const selectionLocked = tournamentLaunched || !canEdit

  const matchMakingDisabled =
    !canEdit ||
    selectionLocked ||
    !enoughTeams ||
    selectedCount < minRequired ||
    selectedCount > maxSelectable

  const launchButtonLabel = tournamentLaunched
    ? 'Tournament live'
    : launchActionLabel || 'Launch tournament'

  const launchButtonDisabled =
    !onLaunch || tournamentLaunched || !tournamentSeeded || launchReadyCount === 0 || !enoughTeams

  const launchStatusMessage = (() => {
    if (!onLaunch) {
      return null
    }

    if (tournamentLaunched) {
      return 'Opening round matches are live and moderators now control the action.'
    }

    if (!tournamentSeeded) {
      return 'Run match making to enable the tournament launch button.'
    }

    if (!enoughTeams) {
      return 'At least two teams are required to open the bracket.'
    }

    if (launchReadyCount === 0) {
      return 'Awaiting fully-seeded matches before launching the tournament.'
    }

    return `Ready to launch ${launchReadyCount} match${launchReadyCount === 1 ? '' : 'es'} for the opening round.`
  })()

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
      if (!enoughTeams) {
        return 'Register at least two teams to kick off the tournament.'
      }
      return `Choose at least ${minRequired} team${minRequired === 1 ? '' : 's'} (up to ${maxSelectable}) for the first round, then lock in their pairings with the match making button.`
    }

    if (readOnlyDescription) return readOnlyDescription
    if (!enoughTeams) {
      return 'Waiting for enough teams to register before the admin can seed the bracket.'
    }
    return `The admin will choose at least ${minRequired} team${minRequired === 1 ? '' : 's'} (up to ${maxSelectable}) for the first round before the tournament begins.`
  })()

  const footerMessage = (() => {
    if (tournamentLaunched) {
      return 'Selections are locked while the tournament is live.'
    }

    if (canEdit) {
      if (!enoughTeams) {
        return 'Match making will unlock once two or more teams are selected.'
      }
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
            {selectedCount} selected • {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} available
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

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 text-xs text-slate-400">
          <div>{footerMessage}</div>
          {launchStatusMessage ? <div>{launchStatusMessage}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <button
              type="button"
              onClick={() => onSubmit?.()}
              disabled={matchMakingDisabled}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] transition ${
                !matchMakingDisabled
                  ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
                  : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
              }`}
            >
              {submitLabel}
            </button>
          ) : null}
          {onLaunch ? (
            <button
              type="button"
              onClick={() => onLaunch?.()}
              disabled={launchButtonDisabled}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] transition ${
                !launchButtonDisabled
                  ? 'bg-emerald-500 text-white shadow shadow-emerald-500/40 hover:bg-emerald-400'
                  : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
              }`}
            >
              {launchButtonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
