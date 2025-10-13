import { useEffect, useState } from 'react'
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

function CurrentMatchCard({ match, teamId, teams, onAnswer }) {
  const opponentId = match.teams.find((id) => id !== teamId)
  const activeTeam = teams.find((team) => team.id === match.activeTeamId)
  const opponent = teams.find((team) => team.id === opponentId)
  const thisTeam = teams.find((team) => team.id === teamId)
  const question = match.questionQueue[match.questionIndex]

  const [selectedOption, setSelectedOption] = useState(null)
  const isPaused = match.status === 'paused'
  const isActive = match.status === 'in-progress' && match.activeTeamId === teamId
  const isSteal = match.awaitingSteal && isActive

  useEffect(() => {
    setSelectedOption(null)
  }, [match.questionIndex, match.awaitingSteal, match.activeTeamId])

  const handleClick = (option) => {
    if (!isActive || selectedOption !== null) {
      return
    }

    setSelectedOption(option)
    onAnswer(match.id, option)
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Live Match</p>
          <h2 className="text-2xl font-semibold text-white">{thisTeam.name} vs {opponent?.name}</h2>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-200">
          <span className="font-semibold text-white">Question {match.questionIndex + 1}</span>
          <span className="text-slate-400">/ {match.questionQueue.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,0.8fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Category</p>
          <p className="text-lg font-semibold text-sky-300">{question.category}</p>
          <p className="text-sm leading-relaxed text-slate-200">{question.prompt}</p>
          <div className="mt-4 space-y-3">
            {question.options.map((option, index) => {
              const optionKey = `${question.instanceId}-${index}`
              const isChoiceSelected = selectedOption === option
              const disabled = !isActive || (selectedOption !== null && !isChoiceSelected)

              return (
                <button
                  key={optionKey}
                  type="button"
                  onClick={() => handleClick(option)}
                  disabled={disabled}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    isChoiceSelected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                      : disabled
                      ? 'border-slate-800 bg-slate-900/40 text-slate-400'
                      : 'border-slate-700 bg-slate-900/70 text-slate-100 hover:border-sky-500 hover:text-white'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-xs font-semibold uppercase">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isChoiceSelected ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Submitted</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Your team</span>
            <span className="text-lg font-bold text-sky-400">{match.scores[teamId]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{opponent?.name}</span>
            <span className="text-lg font-bold text-amber-400">{match.scores[opponentId]}</span>
          </div>
          <div className="mt-4 rounded-xl bg-slate-800/70 px-4 py-3 text-slate-200">
            {isPaused ? (
              <p className="font-semibold text-white">The match is currently paused. Await instructions from the moderator.</p>
            ) : match.awaitingSteal ? (
              isSteal ? (
                <p className="font-semibold text-white">
                  Opportunity to steal! Prepare your best answer.
                </p>
              ) : (
                <p>Waiting for the opposing team to attempt the steal.</p>
              )
            ) : activeTeam?.id === teamId ? (
              <p className="font-semibold text-white">It&apos;s your turn to answer first.</p>
            ) : (
              <p>Hold tight while the opposing team answers.</p>
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
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  isTie
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Team Arena</p>
            <h1 className="text-3xl font-semibold text-white">Welcome, {team.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
              <div className="flex items-center gap-3 text-slate-300">
                <span className="font-semibold text-white">Wins:</span>
                <span>{team.wins}</span>
                <span className="font-semibold text-white">Losses:</span>
                <span>{team.losses}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        {match && match.teams.includes(team.id) ? (
          match.status === 'coin-toss' ? (
            <CoinTossStatusCard match={match} teamId={team.id} teams={teams} onSelectFirst={onSelectFirst} />
          ) : (
            <CurrentMatchCard match={match} teamId={team.id} teams={teams} onAnswer={onAnswer} />
          )
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300 shadow-inner shadow-slate-900/30">
            <p className="text-lg font-semibold text-slate-200">No live match right now.</p>
            <p className="mt-2 text-sm text-slate-400">
              Your next opponent and schedule will appear here once the moderator pairs your team.
            </p>
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Tournament Standings</h2>
            <ScoreboardTable teams={teams} highlightTeamId={team.id} />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Recent Matches</h2>
            <RecentResults history={history} teamId={team.id} teams={teams} />
          </div>
        </section>
      </main>
    </div>
  )
}
