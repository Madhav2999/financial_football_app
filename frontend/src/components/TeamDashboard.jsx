import { useEffect, useState, useRef } from 'react'
import { useMatchTimer, formatSeconds } from '../hooks/useMatchTimer'
import { InlineCoinFlipAnimation } from './MatchPanels'
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
  const correctSfxRef = useRef(null);
  const wrongSfxRef = useRef(null);

  useEffect(() => {
    const ok = new Audio('/assets/correct.mp3'); // <-- put your path
    ok.preload = 'auto';
    ok.volume = 0.9;         // tweak as you like
    ok.playbackRate = 1.0;

    const bad = new Audio('/assets/wrong.mp3');  // <-- put your path
    bad.preload = 'auto';
    bad.volume = 0.9;
    bad.playbackRate = 1.0;

    correctSfxRef.current = ok;
    wrongSfxRef.current = bad;

    return () => {          // cleanup
      ok.pause(); bad.pause();
    };
  }, []);


  useEffect(() => {
    setSelectedOption(null)
    setFlashKey(null)
    setFlashType(null)
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }, [match.questionIndex, match.awaitingSteal, match.activeTeamId])

  const handleClick = (option, index, optionKey) => {
    if (!isActive || selectedOption !== null) return

    setSelectedOption(option)

    // decide correctness if available (supports either correctIndex OR answer)
    let isCorrect = null
    if (correctIndex !== null) isCorrect = index === correctIndex
    else if (correctAnswer != null) isCorrect = option === correctAnswer

    try {
      if (isCorrect === true && correctSfxRef.current) {
        correctSfxRef.current.currentTime = 0;
        correctSfxRef.current.play();
      } else if (isCorrect === false && wrongSfxRef.current) {
        wrongSfxRef.current.currentTime = 0;
        wrongSfxRef.current.play();
      }
    } catch (_) {
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
    <div className="rounded-3xl p-6 border border-slate-800 bg-slate-900/70 [--txtshadow:0_1px_2px_rgba(0,0,0,.85)] [--headshadow:0_2px_8px_rgba(0,0,0,.9)] [&_*:where(h2)]:[text-shadow:var(--headshadow)] [&_*:where(p,span,small,button)]:[text-shadow:var(--txtshadow)]">
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

export default function TeamDashboard({ team, teams, match, history, onAnswer, onSelectFirst, onLogout }) {
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
      {/* FULLSCREEN BACKGROUND VIDEO (no overlay, no blur) */}
      <video
        className="fixed inset-0 -z-10 h-dvh w-screen md:h-screen object-cover object-center
             brightness-60 contrast-120"
        src="/assets/american-football.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />


      {/* header: no backdrop-blur, only text emphasis */}
      <header className="border-b border-white/10 bg-transparent">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Team Arena</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome, {team.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm">
              <div className="flex items-center gap-3 text-slate-100">
                <span className="font-semibold text-white">Wins:</span>
                <span>{team.wins}</span>
                <span className="font-semibold text-white">Losses:</span>
                <span>{team.losses}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="rounded-2xl border border-white/25 bg-transparent px-4 py-2 text-sm font-semibold text-slate-100 hover:border-white/40"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {match && match.teams.includes(team.id) ? (
          match.status === 'coin-toss' ? (
            <CoinTossStatusCard match={match} teamId={team.id} teams={teams} onSelectFirst={onSelectFirst} />
          ) : (
            <CurrentMatchCard match={match} teamId={team.id} teams={teams} onAnswer={onAnswer} />
          )
        ) : (
          <div className="rounded-3xl border border-dashed border-white/25 bg-transparent p-8 text-center text-slate-100">
            <p className="text-lg font-bold text-white">No live match right now.</p>
            <p className="mt-2 text-sm">Your next opponent and schedule will appear here once the moderator pairs your team.</p>
          </div>
        )}

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
      </main>
    </div>
  )
}



