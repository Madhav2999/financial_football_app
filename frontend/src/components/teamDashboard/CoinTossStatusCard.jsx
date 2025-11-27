import { useEffect, useRef, useState } from 'react'
import { InlineCoinFlipAnimation } from '../MatchPanels'

export default function CoinTossStatusCard({ match, teamId, teams, onSelectFirst }) {
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
  const prevStatusRef = useRef(status)
  const [displayStatus, setDisplayStatus] = useState(status)
  const flipTimerRef = useRef(null)

  useEffect(() => {
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current)
      flipTimerRef.current = null
    }

    // If we joined late and immediately got a "flipped", briefly show a spin then reveal
    if (status === 'flipped' && prevStatusRef.current !== 'flipping' && prevStatusRef.current !== 'flipped') {
      setDisplayStatus('flipping')
      flipTimerRef.current = setTimeout(() => {
        setDisplayStatus('flipped')
        flipTimerRef.current = null
      }, 1800)
    } else {
      setDisplayStatus(status)
    }

    prevStatusRef.current = status

    return () => {
      if (flipTimerRef.current) {
        clearTimeout(flipTimerRef.current)
        flipTimerRef.current = null
      }
    }
  }, [status])

  const effectiveStatus = displayStatus

  let statusContent = null

  if (effectiveStatus === 'ready') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Coin toss incoming</p>
        <p className="text-slate-300">
          The moderator will flip the coin to determine who answers first. Stay sharp and be ready for the result.
        </p>
      </div>
    )
  } else if (effectiveStatus === 'flipping') {
    statusContent = (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Coin is in the air...</p>
        <p className="text-slate-300">Hang tight while we reveal who gains control of the opening question.</p>
      </div>
    )
  } else if (effectiveStatus === 'flipped') {
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
            status={effectiveStatus}
            teamAName={teamA?.name ?? 'Team A'}
            teamBName={teamB?.name ?? 'Team B'}
            resultFace={resultFace}
          />
          <p className="mt-4 text-xs uppercase tracking-widest text-slate-400">
            Heads - {teamA?.name ?? 'Team A'} | Tails - {teamB?.name ?? 'Team B'}
          </p>
          {resultFaceLabel && effectiveStatus !== 'flipping' ? (
            <p className="mt-2 text-sm font-semibold text-white">Result: {resultFaceLabel}</p>
          ) : null}
        </div>

        <div className="space-y-3">{statusContent}</div>
      </div>
    </div>
  )
}
