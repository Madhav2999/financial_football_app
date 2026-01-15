import { useEffect, useRef, useState } from 'react'
import { useMatchTimer, formatSeconds } from '../../hooks/useMatchTimer'

export default function CurrentMatchCard({ match, teamId, teams, onAnswer, socketConnected }) {
  if (match.status === 'completed') {
    return null
  }
  const opponentId = match.teams.find((id) => id !== teamId)
  const activeTeam = teams.find((team) => team.id === match.activeTeamId)
  const opponent = teams.find((team) => team.id === opponentId)
  const thisTeam = teams.find((team) => team.id === teamId)
  const totalQuestions = match.questionQueue?.length ?? 0
  const safeIndex = Math.min(match.questionIndex, Math.max(totalQuestions - 1, 0))
  const displayQuestionNumber = Math.min(safeIndex + 1, Math.max(totalQuestions, 1))
  const question = match.questionQueue?.[safeIndex] ?? null
  const questionInstanceId = question?.instanceId ?? match.id
  const questionOptions = question?.options ?? question?.answers?.map((opt) => opt.text) ?? []
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
    const immediateSubmit = remainingSeconds <= 2
    if (immediateSubmit) {
      onAnswer(match.id, option, questionInstanceId)
      setFlashKey(null)
      setFlashType(null)
      flashTimerRef.current = null
      return
    }
    flashTimerRef.current = setTimeout(() => {
      // after 1.8s, continue your normal flow:
      onAnswer(match.id, option, questionInstanceId)
      // clear flash if parent didn't advance immediately
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
          className={`absolute left-1/2 top-1/2 max-h-72 w-auto -translate-x-1/2 -translate-y-1/2 transform rounded-3xl shadow-2xl shadow-emerald-500/40 transition-all duration-300 ${
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
          className={`absolute left-1/2 top-1/2 max-h-72 w-auto -translate-x-1/2 -translate-y-1/2 transform rounded-3xl shadow-2xl shadow-rose-500/40 transition-all duration-300 ${
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
        {/* {!socketConnected ? (
          <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
            Connection lost. Refresh to continue.
          </span>
        ) : null} */}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3 rounded-full border border-white/25 px-4 py-2 text-sm text-slate-100">
            <span className="font-semibold text-white">Question {displayQuestionNumber}</span>
            <span className="text-slate-200">/ {totalQuestions}</span>
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
          <p className="text-base leading-relaxed text-slate-100 select-none">
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
