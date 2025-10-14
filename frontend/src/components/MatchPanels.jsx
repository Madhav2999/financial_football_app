export function InlineCoinFlipAnimation({ status, teamAName, teamBName, resultFace }) {

  const classes = ['coin-flip__scene']
  const coinClasses = ['coin-flip']

  if (status === 'flipping') {
    coinClasses.push('coin-flip--spinning')
  } else if (resultFace) {
    coinClasses.push(`coin-flip--${resultFace}`)
  }

  return (
    <div className={classes.join(' ')}>
      <div className={coinClasses.join(' ')}>
        <div className="coin-flip__face coin-flip__face--heads">
          <span className="coin-flip__label">Heads</span>
          <span className="coin-flip__team">{teamAName}</span>
        </div>
        <div className="coin-flip__face coin-flip__face--tails">
          <span className="coin-flip__label">Tails</span>
          <span className="coin-flip__team">{teamBName}</span>
        </div>
      </div>
    </div>
  )
}

function resolveModeratorName(moderators, moderatorId) {
  if (!moderatorId) return 'Unassigned'
  const match = moderators?.find((item) => item.id === moderatorId)
  return match ? match.name : 'Unassigned'
}

export function MatchControlButtons({ match, onPause, onResume, onReset }) {
  const isInProgress = match.status === 'in-progress'
  const isPaused = match.status === 'paused'
  const buttons = []

  if (isInProgress) {
    buttons.push(
      <button
        key="pause"
        type="button"
        onClick={onPause}
        className="rounded-2xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-sky-500 hover:text-white"
      >
        Pause match
      </button>,
    )
  }

  if (isPaused) {
    buttons.push(
      <button
        key="resume"
        type="button"
        onClick={onResume}
        className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-400 hover:text-white"
      >
        Resume match
      </button>,
    )
  }

  if (match.status !== 'completed') {
    buttons.push(
      <button
        key="reset"
        type="button"
        onClick={onReset}
        className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-200 transition hover:border-rose-400 hover:text-white"
      >
        Reset match
      </button>,
    )
  }

  if (!buttons.length) {
    return null
  }

  return <div className="flex flex-wrap items-center justify-end gap-3">{buttons}</div>
}

export function CoinTossPanel({
  match,
  teams,
  moderators,
  onFlip,
  onSelectFirst,
  canControl = false,
  description,
}) {
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId)
  const teamB = teams.find((team) => team.id === teamBId)
  const status = match.coinToss.status
  const resultFace = match.coinToss.resultFace
  const winnerId = match.coinToss.winnerId
  const winner = teams.find((team) => team.id === winnerId) ?? null
  const opponentId = winnerId === teamAId ? teamBId : winnerId === teamBId ? teamAId : null
  const opponent = opponentId ? teams.find((team) => team.id === opponentId) : null
  const decision = match.coinToss.decision
  const firstTeam = decision ? teams.find((team) => team.id === decision.firstTeamId) : null
  const resultFaceLabel = resultFace === 'heads' ? 'Heads' : resultFace === 'tails' ? 'Tails' : null
  const moderatorName = resolveModeratorName(moderators, match.moderatorId)

  let statusContent = null

  if (status === 'ready') {
    statusContent = canControl ? (
      <p className="text-slate-300">Flip the coin to decide who takes the opening question.</p>
    ) : (
      <p className="text-slate-300">Awaiting {moderatorName} to conduct the coin toss.</p>
    )
  } else if (status === 'flipping') {
    statusContent = (
      <p className="text-slate-300">Coin in motion... we will reveal the toss winner momentarily.</p>
    )
  } else if (status === 'flipped') {
    statusContent = canControl ? (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">
          {resultFaceLabel ? `${resultFaceLabel} - ` : ''}
          {winner ? `${winner.name} won the toss.` : 'Toss winner decided.'}
        </p>
        <p className="text-slate-300">Choose which team starts the match.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSelectFirst?.(winnerId, winnerId)}
            disabled={!winnerId}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              winnerId
                ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-400'
            }`}
            type="button"
          >
            {winner ? `${winner.name} begins` : 'Winner begins'}
          </button>
          <button
            onClick={() => onSelectFirst?.(winnerId, opponentId)}
            disabled={!winnerId || !opponentId}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              winnerId && opponentId
                ? 'border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500'
            }`}
            type="button"
          >
            Defer to {opponent?.name ?? 'opponent'}
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">
          {resultFaceLabel ? `${resultFaceLabel} - ` : ''}
          {winner ? `${winner.name} won the toss.` : 'Toss winner decided.'}
        </p>
        <p className="text-slate-300">Waiting for {moderatorName} to confirm which team will begin.</p>
      </div>
    )
  } else if (status === 'decided') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">
          {winner ? `${winner.name}` : 'Toss winner'} selected {firstTeam?.name ?? 'a team'} to open the quiz.
        </p>
        <p className="text-slate-300">Monitor the live match below as the first question is underway.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Coin Toss</p>
          <h2 className="text-2xl font-semibold text-white">
            {teamA?.name ?? 'Team A'} vs {teamB?.name ?? 'Team B'}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">Moderator: {moderatorName}</p>
          {description ? <p className="mt-3 text-sm text-slate-300">{description}</p> : null}
        </div>
        <button
          onClick={() => canControl && onFlip?.(match.id)}
          disabled={!canControl || status !== 'ready'}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
            canControl && status === 'ready'
              ? 'bg-sky-500 text-white shadow shadow-sky-500/40 hover:bg-sky-400'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-400'
          }`}
          type="button"
        >
          {status === 'flipping' ? 'Flipping...' : 'Flip coin'}
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center">
          <InlineCoinFlipAnimation
            status={status}
            teamAName={teamA?.name ?? 'Team A'}
            teamBName={teamB?.name ?? 'Team B'}
            resultFace={resultFace}
          />
          <p className="mt-4 text-xs uppercase tracking-widest text-slate-400">
            Heads - {teamA?.name ?? 'Team A'} | Tails - {teamB?.name ?? 'Team B'}
          </p>
          {resultFaceLabel && status !== 'flipping' ? (
            <p className="mt-2 text-sm font-semibold text-white">Result: {resultFaceLabel}</p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
          {statusContent}
        </div>
      </div>
    </div>
  )
}

export function LiveMatchPanel({ match, teams, moderators, actions, description }) {
  const question = match.questionQueue[match.questionIndex]
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId) ?? null
  const teamB = teams.find((team) => team.id === teamBId) ?? null
  const activeTeam = teams.find((team) => team.id === match.activeTeamId)
  const opponentId = match.activeTeamId === teamAId ? teamBId : teamAId
  const opponent = teams.find((team) => team.id === opponentId)
  const awaitingSteal = match.awaitingSteal
  const moderatorName = resolveModeratorName(moderators, match.moderatorId)
  const isPaused = match.status === 'paused'

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Live Question</p>
          <h2 className="text-2xl font-semibold text-white">Question {match.questionIndex + 1}</h2>
          <p className="text-sm text-slate-300">
            {teamA?.name ?? 'Team A'} vs {teamB?.name ?? 'Team B'}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">Moderator: {moderatorName}</p>
          {description ? <p className="mt-3 text-sm text-slate-300">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {actions}
          <div className="flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-200">
            <span className="font-semibold text-white">{match.questionIndex + 1}</span>
            <span className="text-slate-400">/ {match.questionQueue.length}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Category</p>
          <p className="text-lg font-semibold text-sky-300">{question.category}</p>
          <p className="text-sm leading-relaxed text-slate-200">{question.prompt}</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{teamA?.name}</span>
            <span className="text-lg font-bold text-sky-400">{match.scores[teamAId]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{teamB?.name}</span>
            <span className="text-lg font-bold text-amber-400">{match.scores[teamBId]}</span>
          </div>
          <div className="mt-4 space-y-3">
            {isPaused ? (
              <p className="font-semibold text-white">Match paused by {moderatorName}. Waiting to resume.</p>
            ) : (
              <p className="font-semibold text-white">
                {awaitingSteal
                  ? `${opponent?.name ?? 'Opponent'} is attempting a steal.`
                  : `${activeTeam?.name ?? 'Team'} is responding.`}
              </p>
            )}
            <p className="text-xs text-slate-400">
              Teams submit answers directly from their dashboards. Monitor progress and adjust pacing as needed.
            </p>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">Multiple-choice options</p>
              <ol className="mt-3 space-y-2">
                {question.options.map((option, index) => (
                  <li key={option} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-[11px] uppercase text-slate-400">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default { CoinTossPanel, LiveMatchPanel }
