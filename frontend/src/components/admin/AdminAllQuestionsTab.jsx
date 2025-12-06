import React, { useEffect, useState } from 'react'

export default function AdminQuestionsTab({ getQuestions, onUpdate, onDelete }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getQuestions()

        if (mounted && Array.isArray(result)) {
          setQuestions(result)   // FIXED — was setQuestions(questions)
        }

      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load questions')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [getQuestions])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Manage Questions</h1>
          <p className="mt-2 text-sm text-slate-300">
            View, edit, or delete quiz questions from the system.
          </p>
        </div>

        {loading && <span className="text-sm text-slate-400">Loading...</span>}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-rose-300">{error}</p>}

      {/* Empty state */}
      {questions.length === 0 && !loading ? (
        <p className="text-sm text-slate-400">No questions found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {questions.map((q) => (
            <div
              key={q._id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow shadow-slate-800/40"
            >
              {/* Question Prompt */}
              <h3 className="text-white text-lg font-semibold">{q.prompt}</h3>

              {/* Category / Difficulty */}
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                {q.category && <span className="px-2 py-0.5 rounded bg-slate-800">{q.category}</span>}
                {q.difficulty && <span className="px-2 py-0.5 rounded bg-slate-800">{q.difficulty}</span>}
              </div>

              {/* Buttons */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => onUpdate(q)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm"
                >
                  Edit
                </button>

                <button
                  onClick={() => onDelete(q._id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
