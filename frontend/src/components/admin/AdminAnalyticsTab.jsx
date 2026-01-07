function resolveTeamName(match, teamId, teams, fallbackKey) {
  const stored =
    fallbackKey === 'home'
      ? match.homeTeamName
      : fallbackKey === 'away'
        ? match.awayTeamName
        : match.winnerTeamName
  const live = teams.find((team) => team.id === teamId)
  return stored || live?.name || teamId || 'Team'
}

import { useMemo } from 'react'

function MatchHistoryList({ history, teams }) {
  if (!history.length) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-lg shadow-slate-900/40">
        No matches have been completed yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((match) => {
        const [teamAId, teamBId] = match.teams
        const teamAName = resolveTeamName(match, teamAId, teams, 'home')
        const teamBName = resolveTeamName(match, teamBId, teams, 'away')
        const isTie = match.winnerId === null
        const winnerName = isTie ? null : resolveTeamName(match, match.winnerId, teams, 'winner')

        return (
          <div
            key={match.id}
            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">
                {teamAName} vs {teamBName}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${isTie ? 'bg-slate-700 text-slate-200' : 'bg-emerald-500/20 text-emerald-300'
                  }`}
              >
                {isTie ? 'Tie' : `${winnerName} won`}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Final Score</p>
            <p className="text-base font-semibold text-white">
              {teamAName} {match.scores[teamAId]} - {teamBName} {match.scores[teamBId]}
            </p>
            <p className="mt-3 text-xs text-slate-400">{new Date(match.completedAt).toLocaleString()}</p>
          </div>
        )
      })}
    </div>
  )
}

function TeamAnalyticsPanel({ teams }) {
  const activeTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    wins: team.wins,
    losses: team.losses,
    points: team.totalScore,
    eliminated: team.eliminated,
  }))

  return (
    <div className="space-y-4">
      {activeTeams.map((team) => (
        <div
          key={team.id}
          className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-white">{team.name}</p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${team.eliminated ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}
            >
              {team.eliminated ? 'Eliminated' : 'Active'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Wins</p>
              <p className="text-lg font-semibold text-white">{team.wins}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Losses</p>
              <p className="text-lg font-semibold text-white">{team.losses}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Points</p>
              <p className="text-lg font-semibold text-white">{team.points}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalyticsTab({ history, teams, summary, questions, analyticsQuestionHistory = [], tournament }) {
  const activeIds = tournament?.teams || []
  const activeTeams = useMemo(() => {
    const ids = tournament?.teams || []
    return ids.length ? teams.filter((t) => ids.includes(t.id)) : teams
  }, [teams, tournament?.teams])

  const answeredByYear = useMemo(() => {
    if (!Array.isArray(history) || !history.length) return []
    const counts = history.reduce((map, match) => {
      const year = match.completedAt ? new Date(match.completedAt).getFullYear() : 'Unknown'
      map.set(year, (map.get(year) ?? 0) + 1)
      return map
    }, new Map())
    return Array.from(counts.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => {
        const aNum = typeof a.year === 'number' ? a.year : null
        const bNum = typeof b.year === 'number' ? b.year : null
        if (aNum !== null && bNum !== null) return aNum - bNum
        if (aNum !== null) return -1
        if (bNum !== null) return 1
        return String(a.year ?? '').localeCompare(String(b.year ?? ''))
      })
  }, [history])

  const answeredMax = answeredByYear.reduce((max, entry) => Math.max(max, entry.count), 0) || 1

  const questionHistoryByPrompt = useMemo(() => {
    const map = new Map()
    analyticsQuestionHistory.forEach((entry) => {
      const key = entry.questionId || entry.prompt
      if (!key) return
      const current = map.get(key) || { prompt: entry.prompt, entries: [] }
      current.entries.push(entry)
      map.set(key, current)
    })
    return Array.from(map.values())
  }, [analyticsQuestionHistory])

  const averageResponseSeconds = useMemo(() => {
    // Placeholder until response time is captured; display static note.
    return null
  }, [])

  const downloadCsv = () => {
    const matchRows = [
      ['Year', 'Match ID', 'Tournament', 'Home Team', 'Away Team', 'Winner', 'Home Score', 'Away Score', 'Completed At'],
      ...history.map((match) => {
        const [home, away] = match.teams ?? []
        return [
          match.completedAt ? new Date(match.completedAt).getFullYear() : '',
          match.id,
          match.tournamentName ?? '',
          match.homeTeamName ?? home ?? '',
          match.awayTeamName ?? away ?? '',
          match.winnerTeamName ?? match.winnerId ?? '',
          match.scores?.[home] ?? 0,
          match.scores?.[away] ?? 0,
          match.completedAt ?? '',
        ]
      }),
    ]

    const questionRows = [
      ['Prompt', 'Category', 'Times Asked', 'Correct', 'Incorrect', 'Avg Accuracy'],
      ...(questions || []).map((q) => [
        q.prompt,
        q.category ?? '',
        q.totalAsked ?? 0,
        q.correctCount ?? 0,
        q.incorrectCount ?? 0,
        q.accuracy ?? '',
      ]),
    ]

    const historyRows = [
      ['Tournament', 'Question', 'Times Asked', 'Correct', 'Incorrect', 'Accuracy'],
      ...analyticsQuestionHistory.map((entry) => [
        entry.tournamentName ?? entry.tournamentId ?? '',
        entry.prompt ?? '',
        entry.totalAsked ?? 0,
        entry.correctCount ?? 0,
        entry.incorrectCount ?? 0,
        entry.accuracy ?? '',
      ]),
    ]

    const toCsv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

    const blob = new Blob(
      [
        `Matches (year-wise)\n`,
        toCsv(matchRows),
        `\n\nQuestion Analytics\n`,
        toCsv(questionRows),
        `\n\nQuestion Accuracy by Tournament\n`,
        toCsv(historyRows),
      ],
      { type: 'text/csv;charset=utf-8;' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'analytics-export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    {
      label: 'Total Questions',
      value: summary?.totalQuestions ?? 0,
    },
    {
      label: 'Total Matches',
      value: history?.length ?? 0,
    },
    {
      label: 'Avg Accuracy',
      value: summary?.averageAccuracy != null ? `${summary.averageAccuracy}%` : '—',
    },
  ]

  const topQuestions = (questions || [])
    .slice()
    .sort((a, b) => (b.totalAsked || 0) - (a.totalAsked || 0))
    .slice(0, 8)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
          >
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-emerald-400 hover:text-white"
        >
          Download CSV
        </button>
      </div>

      {answeredByYear.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Matches Completed Per Year</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">line chart</p>
          </div>
          <svg viewBox="0 0 400 180" role="img" className="w-full rounded-3xl border border-slate-800 bg-slate-950/60 p-4 shadow shadow-slate-900/30">
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              points={answeredByYear
                .map((entry, idx) => {
                  const x = (idx / Math.max(answeredByYear.length - 1, 1)) * 360 + 20
                  const y = 150 - (entry.count / answeredMax) * 120
                  return `${x},${y}`
                })
                .join(' ')}
            />
            {answeredByYear.map((entry, idx) => {
              const x = (idx / Math.max(answeredByYear.length - 1, 1)) * 360 + 20
              const y = 150 - (entry.count / answeredMax) * 120
              return (
                <g key={entry.year}>
                  <circle cx={x} cy={y} r="4" fill="#38bdf8" />
                  <text x={x} y={170} textAnchor="middle" fill="#cbd5e1" fontSize="10">
                    {entry.year}
                  </text>
                  <text x={x} y={y - 8} textAnchor="middle" fill="#cbd5e1" fontSize="10">
                    {entry.count}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      ) : null}

      {questionHistoryByPrompt.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Question Accuracy by Tournament</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">bar chart</p>
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow shadow-slate-900/30">
            {questionHistoryByPrompt.slice(0, 6).map((question) => (
              <div key={question.prompt} className="space-y-2">
                <p className="text-sm font-semibold text-white line-clamp-2">{question.prompt}</p>
                <div className="space-y-1">
                  {question.entries.slice(0, 4).map((entry, idx) => {
                    const pct = entry.accuracy != null ? Math.min(100, Math.max(0, entry.accuracy)) : 0
                    return (
                      <div key={`${entry.tournamentId}-${idx}`} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>{entry.tournamentName ?? entry.tournamentId}</span>
                          <span>{entry.accuracy != null ? `${entry.accuracy}%` : '—'}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800">
                          <div className="h-2 rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {questions?.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Top Questions (by times asked)</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">bar chart</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow shadow-slate-900/30">
            <div className="space-y-2">
              {questions
                .slice()
                .sort((a, b) => (b.totalAsked || 0) - (a.totalAsked || 0))
                .slice(0, 6)
                .map((question) => {
                  const pct = answeredMax ? Math.min(100, ((question.totalAsked || 0) / answeredMax) * 100) : 0
                  return (
                    <div key={question.id}>
                      <p className="text-sm font-semibold text-white line-clamp-2">{question.prompt}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 w-full rounded-full bg-slate-800">
                          <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-300">{question.totalAsked ?? 0}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      ) : null}

      {topQuestions.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Question Performance</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {topQuestions.map((question) => (
              <div
                key={question.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{question.category || 'Uncategorized'}</p>
                <p className="mt-2 font-semibold text-white">{question.prompt}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
                  <span className="rounded-full border border-slate-700 px-2 py-1">
                    Asked {question.totalAsked ?? 0}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2 py-1">
                    Accuracy {question.accuracy != null ? `${question.accuracy}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Team Analytics</h2>
        <TeamAnalyticsPanel teams={activeTeams} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Match History</h2>
        <MatchHistoryList history={history} teams={activeTeams} />
      </div>
    </div>
  )
}
