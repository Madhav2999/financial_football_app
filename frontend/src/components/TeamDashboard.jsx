import { useEffect, useMemo, useRef, useState } from 'react'
import { useMatchTimer, formatSeconds } from '../hooks/useMatchTimer'
import { InlineCoinFlipAnimation, LiveMatchPanel } from './MatchPanels'
import ScoreboardTable from './ScoreboardTable'

function CoinTossStatusCard({ match, teamId, teams, onSelectFirst }) {
  const [teamAId, teamBId] = match.teams
  const teamA = teams.find((team) => team.id === teamAId)
  const teamB = teams.find((team) => team.id === teamBId)
  const opponentId = match.teams.find((id) => id !== teamId)
  const opponent = teams.find((team) => team.id === opponentId)
  const status = match.coinToss.status
  const resultFace = match.coinToss.resultFace
  const resultFaceLabel = resultFace === 'heads' ? 'Heads' : resultFace === 'tails' ? 'Tails' : null
  const winnerId = match.coinToss.winnerId
  const winner = teams.find((team) => team.id === winnerId)
  const isWinner = winnerId === teamId
  const decision = match.coinToss.decision
  const selectedFirstTeam = decision ? teams.find((team) => team.id === decision.firstTeamId) : null

  let statusContent = null

  if (status === 'ready') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Coin toss incoming</p>
        <p className="text-slate-300">
          The moderator will flip the coin to determine who answers first. Stay sharp and be ready for the result.
        </p>
      </div>
    )
  } else if (status === 'flipping') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Coin is in the air...</p>
        <p className="text-slate-300">Hang tight while we reveal who gains control of the opening question.</p>
      </div>
    )
  } else if (status === 'flipped') {
    statusContent = (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">
          {winner ? `${winner.name} won the toss!` : 'Toss winner decided.'}
        </p>
        {isWinner ? (
          <>
            <p className="text-slate-300">You control the advantage. Decide who should answer the first question.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onSelectFirst?.(match.id, teamId)}
                className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow shadow-sky-500/40 transition hover:bg-sky-400"
              >
                We&apos;ll take the first question
              </button>
              <button
                type="button"
                onClick={() => onSelectFirst?.(match.id, opponentId)}
                className="rounded-2xl border border-slate-200/40 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Let {opponent?.name ?? 'opponent'} start
              </button>
            </div>
          </>
        ) : (
          <p className="text-slate-300">
            {winner ? `${winner.name}` : 'The toss winner'} will choose who answers first. Await their decision.
          </p>
        )}
      </div>
    )
  } else if (status === 'decided') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Coin toss locked in</p>
        <p className="text-slate-300">
          {winner ? `${winner.name}` : 'The toss winner'} chose {selectedFirstTeam?.name ?? 'a team'} to open the quiz.
          Prepare for your turn.
        </p>
      </div>
    )
  }

  if (!statusContent) {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Coin toss status pending</p>
        <p className="text-slate-300">Await further instructions from the moderator.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-200 shadow shadow-slate-900/40">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr),1.15fr]">
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

        <div className="space-y-3">{statusContent}</div>
      </div>
    </div>
  )
}

// add useRef in your imports
// import { useEffect, useState, useRef } from 'react';

function CurrentMatchCard({ match, teamId, teams, onAnswer }) {
  const opponentId = match.teams.find((id) => id !== teamId)
  const activeTeam = teams.find((team) => team.id === match.activeTeamId)
  const opponent = teams.find((team) => team.id === opponentId)
  const thisTeam = teams.find((team) => team.id === teamId)
  const question = match.questionQueue?.[match.questionIndex] ?? null
  const questionInstanceId = question?.instanceId ?? match.id
  const questionOptions = question?.options ?? []
  // if you expose either of these in your question object, both are supported:
  const correctIndex = typeof question?.correctIndex === 'number' ? question.correctIndex : null
  const correctAnswer = question?.answer ?? null

  const { remainingSeconds, timerType, timerStatus } = useMatchTimer(match.timer)
  const formattedRemaining = formatSeconds(remainingSeconds)
  const isTimerVisible = Boolean(match.timer)
  const timerBadgeClass =
    timerType === 'steal'
      ? 'border border-amber-400/70 text-amber-200'
      : 'border border-emerald-400/70 text-emerald-200'
  const timerLabel = timerType === 'steal' ? 'Steal window' : 'Answer window'

  const [selectedOption, setSelectedOption] = useState(null)
  const isPaused = match.status === 'paused'
  const isActive = match.status === 'in-progress' && match.activeTeamId === teamId
  const isSteal = match.awaitingSteal && isActive

  // ---- 1.8s visual feedback state ----
  const FEEDBACK_MS = 1800
  const [flashKey, setFlashKey] = useState(null)     // e.g. "q123-2"
  const [flashType, setFlashType] = useState(null)   // 'correct' | 'wrong' | null
  const flashTimerRef = useRef(null)
  const correctSfxRef = useRef(null)
  const wrongSfxRef = useRef(null)
  const correctVideoRef = useRef(null)
  const wrongVideoRef = useRef(null)
  const videoTimeoutRef = useRef(null)
  const [activeVideo, setActiveVideo] = useState(null)
  const VIDEO_FALLBACK_MS = 2000

  useEffect(() => {
    const ok = new Audio('/assets/correct.mp3')
    ok.preload = 'auto'
    ok.volume = 0.9        // tweak as you like
    ok.playbackRate = 1.0

    const bad = new Audio('/assets/wrong.mp3')  // <-- put your path
    bad.preload = 'auto'
    bad.volume = 0.9
    bad.playbackRate = 1.0

    correctSfxRef.current = ok
    wrongSfxRef.current = bad

    return () => {
      ok.pause()
      bad.pause()
    }
  }, [])

  useEffect(() => {
    const successVideo = correctVideoRef.current
    const failVideo = wrongVideoRef.current

    if (successVideo) {
      successVideo.muted = true
      successVideo.loop = false
      successVideo.preload = 'auto'
    }

    if (failVideo) {
      failVideo.muted = true
      failVideo.loop = false
      failVideo.preload = 'auto'
    }

    return () => {
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current)
        videoTimeoutRef.current = null
      }

      if (successVideo) {
        successVideo.pause()
        successVideo.onended = null
      }

      if (failVideo) {
        failVideo.pause()
        failVideo.onended = null
      }
    }
  }, [])

  useEffect(() => {
    setSelectedOption(null)
    setFlashKey(null)
    setFlashType(null)
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }, [match.questionIndex, match.awaitingSteal, match.activeTeamId])

  const playCelebrationVideo = (type) => {
    const videoEl = type === 'correct' ? correctVideoRef.current : wrongVideoRef.current
    if (!videoEl) return

    const audioSource = type === 'correct' ? correctSfxRef.current : wrongSfxRef.current
    const audioDuration = audioSource?.duration
    const playbackMs = Number.isFinite(audioDuration) && audioDuration > 0
      ? Math.max(VIDEO_FALLBACK_MS, audioDuration * 1000)
      : VIDEO_FALLBACK_MS

    try {
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current)
        videoTimeoutRef.current = null
      }

      videoEl.pause()
      videoEl.currentTime = 0
      videoEl.onended = () => {
        if (videoTimeoutRef.current) {
          clearTimeout(videoTimeoutRef.current)
          videoTimeoutRef.current = null
        }
        videoEl.pause()
        videoEl.currentTime = 0
        setActiveVideo((current) => (current === type ? null : current))
      }

      setActiveVideo(type)
      const playPromise = videoEl.play()
      if (playPromise?.catch) {
        playPromise.catch(() => {})
      }

      videoTimeoutRef.current = setTimeout(() => {
        videoEl.pause()
        videoEl.currentTime = 0
        setActiveVideo((current) => (current === type ? null : current))
        videoTimeoutRef.current = null
      }, playbackMs)
    } catch {
      setActiveVideo(null)
    }
  }

  const handleClick = (option, index, optionKey) => {
    if (!isActive || selectedOption !== null) return

    setSelectedOption(option)

    // decide correctness if available (supports either correctIndex OR answer)
    let isCorrect = null
    if (correctIndex !== null) isCorrect = index === correctIndex
    else if (correctAnswer != null) isCorrect = option === correctAnswer

    try {
      if (isCorrect === true && correctSfxRef.current) {
        correctSfxRef.current.currentTime = 0
        correctSfxRef.current.play()
        playCelebrationVideo('correct')
      } else if (isCorrect === false && wrongSfxRef.current) {
        wrongSfxRef.current.currentTime = 0
        wrongSfxRef.current.play()
        playCelebrationVideo('wrong')
      }
    } catch {
      // ignore autoplay errors silently
    }

    setFlashKey(optionKey)
    setFlashType(isCorrect === null ? null : isCorrect ? 'correct' : 'wrong')

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => {
      // after 1.8s, continue your normal flow:
      onAnswer(match.id, option)
      // clear flash if parent didn’t advance immediately
      setFlashKey(null)
      setFlashType(null)
      flashTimerRef.current = null
    }, FEEDBACK_MS)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 border border-slate-800 bg-slate-900/70 [--txtshadow:0_1px_2px_rgba(0,0,0,.85)] [--headshadow:0_2px_8px_rgba(0,0,0,.9)] [&_*:where(h2)]:[text-shadow:var(--headshadow)] [&_*:where(p,span,small,button)]:[text-shadow:var(--txtshadow)]">
      <div
        className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-300 ${
          activeVideo ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <video
          ref={correctVideoRef}
          src="/assets/success-4.mp4"
          playsInline
          muted
          preload="auto"
          aria-hidden="true"
          className={`absolute left-1/2 top-1/2 max-h-56 w-auto -translate-x-1/2 -translate-y-1/2 transform rounded-3xl shadow-2xl shadow-emerald-500/40 transition-all duration-300 ${
            activeVideo === 'correct' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        />
        <video
          ref={wrongVideoRef}
          src="/assets/fail.mp4"
          playsInline
          muted
          preload="auto"
          aria-hidden="true"
          className={`absolute left-1/2 top-1/2 max-h-56 w-auto -translate-x-1/2 -translate-y-1/2 transform rounded-3xl shadow-2xl shadow-rose-500/40 transition-all duration-300 ${
            activeVideo === 'wrong' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Live Match</p>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {thisTeam.name} vs {opponent?.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3 rounded-full border border-white/25 px-4 py-2 text-sm text-slate-100">
            <span className="font-semibold text-white">Question {match.questionIndex + 1}</span>
            <span className="text-slate-200">/ {match.questionQueue?.length ?? 0}</span>
          </div>
          {isTimerVisible ? (
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${timerBadgeClass}`}>
              <span>{timerLabel}</span>
              <span>{formattedRemaining}</span>
              {timerStatus === 'paused' ? (
                <span className="text-xs uppercase tracking-wider text-slate-100/90">Paused</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,0.8fr]">
        {/* LEFT */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-slate-100">Category</p>
          <p className="text-lg font-bold text-white">{question?.category ?? 'Awaiting question details'}</p>
          <p className="text-base leading-relaxed text-slate-100">
            {question?.prompt ?? 'The moderator will share the next prompt shortly.'}
          </p>

          <div className="mt-4 flex space-x-3">
            {questionOptions.map((option, index) => {
              const optionKey = `${questionInstanceId}-${index}`
              const isChoiceSelected = selectedOption === option
              const disabled = !isActive || (selectedOption !== null && !isChoiceSelected)
              const isFlashing = flashKey === optionKey

              const showCorrect = isFlashing && flashType === 'correct'
              const showWrong = isFlashing && flashType === 'wrong'

              return (
                <button
                  key={optionKey}
                  type="button"
                  onClick={() => handleClick(option, index, optionKey)}
                  disabled={disabled}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-base transition',
                    'border-white/35 text-white',
                    !disabled && 'hover:border-sky-400',
                    disabled && 'opacity-70 cursor-not-allowed',
                    // feedback styles (held for 1.8s)
                    showCorrect && 'ring-2 ring-emerald-400/70 bg-emerald-500/10',
                    showWrong && 'ring-2 ring-rose-400/70 bg-rose-500/10',
                    // keep some focus if user selected but we don't know correctness client-side
                    isChoiceSelected && flashType == null && 'ring-2 ring-sky-300/60'
                  ].filter(Boolean).join(' ')}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 text-xs font-bold uppercase">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 font-semibold tracking-tight">{option}</span>
                  {isChoiceSelected ? (
                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Submitted</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 rounded-2xl border border-white/20 bg-transparent p-5 text-sm text-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white tracking-tight">Your team</span>
            <span className="text-xl font-black text-sky-300">{match.scores[teamId]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white tracking-tight">{opponent?.name}</span>
            <span className="text-xl font-black text-amber-300">{match.scores[opponentId]}</span>
          </div>

          <div className="mt-4 rounded-xl ring-1 ring-white/25 px-4 py-3 text-slate-100">
            {isPaused ? (
              <p className="font-bold text-white">The match is currently paused. Await instructions from the moderator.</p>
            ) : match.awaitingSteal ? (
              isSteal ? (
                <p className="font-bold text-white">
                  Opportunity to steal! {remainingSeconds ? `You have ${remainingSeconds} seconds` : 'Act fast'} to snag a 1-point bonus.
                </p>
              ) : (
                <p>
                  Waiting for {opponent?.name ?? 'the opposing team'} to attempt the steal
                  {remainingSeconds ? ` (${remainingSeconds} seconds remaining).` : '.'}
                </p>
              )
            ) : activeTeam?.id === teamId ? (
              <p className="font-bold text-white">
                It&apos;s your turn to answer. {remainingSeconds ? `You have ${remainingSeconds} seconds` : 'Move quickly'} to secure 3 points.
              </p>
            ) : (
              <p>
                Hold tight while {opponent?.name ?? 'the opposing team'} answers
                {remainingSeconds ? ` (${remainingSeconds} seconds remaining).` : '.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



function RecentResults({ history, teamId, teams }) {
  const entries = history.filter((match) => match.teams.includes(teamId)).slice(0, 5)

  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-lg shadow-slate-900/40">
        Your match history will appear here once you complete your first showdown.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const opponentId = entry.teams.find((id) => id !== teamId)
        const opponent = teams.find((team) => team.id === opponentId)
        const didWin = entry.winnerId === teamId
        const isTie = entry.winnerId === null

        return (
          <div
            key={entry.id}
            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">
                vs {opponent?.name}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${isTie
                  ? 'bg-slate-700 text-slate-200'
                  : didWin
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                  }`}
              >
                {isTie ? 'Tie' : didWin ? 'Win' : 'Loss'}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Final Score</p>
            <p className="text-base font-semibold text-white">
              {teams.find((team) => team.id === teamId)?.name} {entry.scores[teamId]} - {opponent?.name}{' '}
              {entry.scores[opponentId]}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {new Date(entry.completedAt).toLocaleString()}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ModeratorPresenceCard({ match, moderators }) {
  const moderator = match ? moderators?.find((item) => item.id === match.moderatorId) ?? null : null
  const status = match?.status ?? 'pending'
  const isLive = ['coin-toss', 'in-progress', 'paused'].includes(status)
  const indicatorClass = isLive
    ? 'bg-emerald-400 text-emerald-950'
    : 'bg-amber-300/90 text-amber-900'
  const indicatorLabel = isLive ? 'Connected' : 'Standby'
  const moderatorName = moderator ? moderator.name : 'Awaiting assignment'

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-200 shadow shadow-slate-900/40">
      <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Control Room</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Moderator on deck</h3>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Assigned moderator</p>
          <p className="text-base font-semibold text-white">{moderatorName}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${indicatorClass}`}>
          {indicatorLabel}
        </span>
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">What they are monitoring</p>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-200">
        <li>Real-time question feed, timers, and answer submissions.</li>
        <li>Score updates, steal attempts, and pause/resume controls.</li>
        <li>Coin toss flow to keep both teams aligned before kickoff.</li>
      </ul>

      <p className="mt-4 text-xs text-slate-400">
        This matches the moderator&apos;s control view shown below so you always know what they see while supervising the game.
      </p>
    </div>
  )
}

function GameRoomPlaceholder({ tournamentLaunched, upcomingMatch, team, moderators, teams }) {
  const rotationSummary = moderators?.length
    ? `${moderators.length} moderator${moderators.length === 1 ? '' : 's'} on rotation`
    : 'Moderator roster will appear here'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(280px,0.85fr)]">
      <div className="rounded-3xl border border-dashed border-white/25 bg-slate-900/40 p-8 text-center text-slate-100">
        <p className="text-lg font-bold text-white">
          {tournamentLaunched
            ? 'You are queued for your next showdown.'
            : 'The game room opens once the tournament kicks off.'}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {tournamentLaunched
            ? upcomingMatch
              ? 'Your next bracket match is listed on the right. Keep an eye on notifications from the moderator.'
              : 'We will summon you here as soon as the bracket schedules your next opponent.'
            : 'Review your scouting reports and tournament analytics until the launch announcement.'}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-200 shadow shadow-slate-900/30">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Next assignment</p>
        {upcomingMatch ? (
          <div className="mt-3 space-y-2">
            <h3 className="text-lg font-semibold text-white">{upcomingMatch.label}</h3>
            <p className="text-sm text-slate-200">
              Opponent: <UpcomingOpponentLine match={upcomingMatch} teamId={team.id} teams={teams} />
            </p>
            <p className="text-sm text-slate-300">
              We&apos;ll ping your locker room the moment the moderator spins up this match.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <h3 className="text-lg font-semibold text-white">Awaiting bracket pairing</h3>
            <p className="text-sm text-slate-300">Your next opponent will drop here once the bracket advances.</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          {rotationSummary}
        </div>
      </div>
    </div>
  )
}

function UpcomingOpponentLine({ match, teamId, teams }) {
  if (!match) {
    return <span className="text-sm text-slate-300">TBD</span>
  }

  const roster = Array.isArray(teams) ? teams : []
  const opponentNames = match.teams
    .filter((id) => id && id !== teamId)
    .map((id) => roster.find((team) => team.id === id)?.name ?? 'TBD')

  return <span className="text-sm text-slate-200">{opponentNames.length ? opponentNames.join(' vs ') : 'TBD'}</span>
}

function OverviewPanel({ team, tournamentLaunched, upcomingMatch, teams, moderators }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(260px,0.8fr)]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200 shadow shadow-slate-900/30">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Team profile</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{team.name}</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wins</p>
              <p className="text-xl font-bold text-white">{team.wins}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Losses</p>
              <p className="text-xl font-bold text-white">{team.losses}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total points</p>
              <p className="text-xl font-bold text-white">{team.totalScore}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-300">
            Stay sharp—leaderboards refresh automatically as matches conclude, so your seeding may shift between rounds.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200 shadow shadow-slate-900/30">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Tournament status</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {tournamentLaunched ? 'Tournament in progress' : 'Tournament pending'}
          </h3>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next opponent</p>
            <UpcomingOpponentLine match={upcomingMatch} teamId={team.id} teams={teams} />
          </div>

          <p className="mt-4 text-sm text-slate-300">
            {tournamentLaunched
              ? 'Once the moderator activates your match, you can enter the Game Room to follow the toss and answer live.'
              : 'We will announce the official start shortly. Use this time to review practice questions and coordinate your lineup.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1">
              {moderators.length ? `${moderators.length} moderators on duty` : 'Moderator roster pending'}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1">
              Double elimination format
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200 shadow shadow-slate-900/30">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Locker room briefing</p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200">
          <li>Review the last five matches below to study opponent tendencies.</li>
          <li>Keep a captain assigned to coin-toss decisions—they arrive quickly once moderators connect.</li>
          <li>Use the Game Room when live prompts begin so your answers lock in immediately.</li>
        </ul>
      </div>
    </div>
  )
}

function AnalyticsSection({ team, teams, history }) {
  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr,1fr]">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Tournament Standings</h2>
        <ScoreboardTable teams={teams} highlightTeamId={team.id} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Recent Matches</h2>
        <RecentResults history={history} teamId={team.id} teams={teams} />
      </div>
    </section>
  )
}

export default function TeamDashboard({
  team,
  teams,
  match,
  history,
  tournament,
  tournamentLaunched,
  moderators = [],
  dataLoading,
  dataError,
  onRefreshData,
  onAnswer,
  onSelectFirst,
  onLogout,
}) {
  const [viewMode, setViewMode] = useState('overview')
  const safeModerators = useMemo(
    () => (Array.isArray(moderators) ? moderators : []),
    [moderators],
  )
  const tournamentActive = Boolean(tournamentLaunched && tournament)
  const isInLiveMatch = Boolean(match && match.teams.includes(team.id))

  useEffect(() => {
    if (!tournamentActive && viewMode !== 'overview') {
      setViewMode('overview')
    }
  }, [tournamentActive, viewMode])

  useEffect(() => {
    if (tournamentActive && isInLiveMatch) {
      setViewMode('game-room')
    }
  }, [tournamentActive, isInLiveMatch])

  const upcomingMatch = useMemo(() => {
    if (match?.tournamentMatchId && tournament?.matches?.[match.tournamentMatchId]) {
      return tournament.matches[match.tournamentMatchId]
    }

    if (!tournament?.matches) return null

    const candidateMatches = Object.values(tournament.matches).filter((item) => {
      if (!Array.isArray(item?.teams)) return false
      if (item.status === 'completed') return false
      return item.teams.includes(team.id)
    })

    if (!candidateMatches.length) return null

    const stageOrder = (item) => tournament.stages?.[item.stageId]?.order ?? Number.MAX_SAFE_INTEGER

    return candidateMatches.sort((left, right) => {
      const orderDiff = stageOrder(left) - stageOrder(right)
      if (orderDiff !== 0) return orderDiff
      return (left.label ?? left.id).localeCompare(right.label ?? right.id)
    })[0]
  }, [match?.tournamentMatchId, team.id, tournament])

  const assignedModerator = useMemo(() => {
    if (!match) return null
    return safeModerators.find((item) => item.id === match.moderatorId) ?? null
  }, [match, safeModerators])

  const showGameRoom = tournamentActive && viewMode === 'game-room'
  const tournamentStatusLabel = tournamentActive
    ? 'Tournament Live'
    : tournamentLaunched
    ? 'Tournament syncing'
    : 'Awaiting kickoff'

  const handleSelectFirstTeam = (matchId, firstTeamId) => {
    onSelectFirst?.(matchId, firstTeamId)
  }

  const handleAnswer = (matchId, option) => {
    onAnswer?.(matchId, option)
  }

  return (
    <div
      className="
        relative min-h-screen text-slate-100 antialiased
        [--txtshadow:0_1px_2px_rgba(0,0,0,.85)]
        [--headshadow:0_2px_8px_rgba(0,0,0,.9)]
        [&_*:where(h1,h2,h3)]:[text-shadow:var(--headshadow)]
        [&_*:where(h1,h2,h3)]:[-webkit-text-stroke:0.4px_rgba(0,0,0,.45)]
        [&_*:where(p,span,li,small,label,strong)]:[text-shadow:var(--txtshadow)]
        [&_button]:[text-shadow:0_1px_2px_rgba(0,0,0,.7)]
      "
    >
      <video
        className="fixed inset-0 -z-10 h-dvh w-screen md:h-screen object-cover object-center brightness-40 contrast-120"
        src="/assets/american-football.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <header className="border-b border-white/10 bg-transparent">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Team Arena</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome, {team.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/20 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
              {tournamentStatusLabel}
            </span>
            <button
              type="button"
              onClick={onRefreshData}
              disabled={dataLoading}
              className="rounded-xl border border-white/20 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              {dataLoading ? 'Syncing data…' : 'Refresh data'}
            </button>
            <div className="rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm">
              <div className="flex items-center gap-3 text-slate-100">
                <span className="font-semibold text-white">Wins:</span>
                <span>{team.wins}</span>
                <span className="font-semibold text-white">Losses:</span>
                <span>{team.losses}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-900/40 p-1 text-sm">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`rounded-xl px-4 py-2 font-semibold transition ${
                  viewMode === 'overview'
                    ? 'bg-sky-500 text-white shadow shadow-sky-500/40'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => tournamentActive && setViewMode('game-room')}
                disabled={!tournamentActive}
                className={`rounded-xl px-4 py-2 font-semibold transition ${
                  showGameRoom
                    ? 'bg-emerald-500 text-white shadow shadow-emerald-500/40'
                    : tournamentActive
                    ? 'text-slate-200 hover:text-white'
                    : 'cursor-not-allowed text-slate-500'
                }`}
              >
                Game Room
              </button>
            </div>
            <button
              onClick={onLogout}
              className="rounded-2xl border border-white/25 bg-transparent px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40"
              type="button"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {dataError ? (
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {dataError.message || 'We had trouble loading tournament updates. Try refreshing.'}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-6 py-8">
        {showGameRoom ? (
          <div className="space-y-8">
            {isInLiveMatch ? (
              <>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr),minmax(260px,0.85fr)]">
                  <div>
                    {match.status === 'coin-toss' ? (
                      <CoinTossStatusCard
                        match={match}
                        teamId={team.id}
                        teams={teams}
                        onSelectFirst={handleSelectFirstTeam}
                      />
                    ) : (
                      <CurrentMatchCard match={match} teamId={team.id} teams={teams} onAnswer={handleAnswer} />
                    )}
                  </div>

                  <div className="space-y-6">
                    <ModeratorPresenceCard match={match} moderators={safeModerators} />

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-200 shadow shadow-slate-900/40">
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Match briefing</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{match.label ?? 'Live match'}</h3>
                      <p className="mt-3 text-sm text-slate-300">
                        {assignedModerator
                          ? `${assignedModerator.name} is supervising from the control booth. Keep your communications clear and be ready for quick rulings.`
                          : 'A moderator will connect shortly to supervise this matchup. Stay prepared for the toss and opening prompt.'}
                      </p>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Format</p>
                          <p className="text-sm font-semibold text-white">Double elimination — second loss knocks you out.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your record</p>
                          <p className="text-sm font-semibold text-white">{team.wins}W / {team.losses}L</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {match.status === 'coin-toss' ? (
                  <div className="rounded-3xl border border-dashed border-white/20 bg-slate-900/40 p-6 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator feed</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Once the first question is live, you&apos;ll see the moderator&apos;s control-room view here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Moderator feed</p>
                      <h2 className="mt-2 text-xl font-bold text-white">What the moderator sees</h2>
                      <p className="mt-2 text-sm text-slate-300">
                        This mirrored panel shows the same scoreboard, timers, and prompts the moderator uses to officiate your match in real time.
                      </p>
                    </div>
                    <LiveMatchPanel
                      match={match}
                      teams={teams}
                      moderators={safeModerators}
                      actions={null}
                      description="Mirrored from the moderator console for transparency."
                    />
                  </div>
                )}
              </>
            ) : (
              <GameRoomPlaceholder
                tournamentLaunched={tournamentLaunched}
                upcomingMatch={upcomingMatch}
                team={team}
                moderators={safeModerators}
                teams={teams}
              />
            )}
          </div>
        ) : (
          <OverviewPanel
            team={team}
            teams={teams}
            tournamentLaunched={tournamentLaunched}
            upcomingMatch={upcomingMatch}
            moderators={safeModerators}
          />
        )}

        <AnalyticsSection team={team} teams={teams} history={history} />
      </main>
    </div>
  )
}



