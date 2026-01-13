import { useEffect, useMemo, useRef, useState } from 'react'

export default function AdminAllQuestionsTab({ getQuestions, onSearch, onUpdate, onDelete }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const requestIdRef = useRef(0)

  const load = async (opts = {}) => {
    if (!getQuestions && !onSearch) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    try {
      if (onSearch) {
        const result = await onSearch({
          text: opts.searchText ?? searchText,
          category: opts.category ?? category,
          difficulty: opts.difficulty ?? difficulty,
          tag: opts.tag ?? tag,
          page: opts.page ?? page,
          limit: 20,
        })
        if (requestId === requestIdRef.current) {
          setQuestions(result.questions || [])
          setPage(result.page || 1)
          setTotalPages(result.totalPages || 1)
        }
      } else {
        const result = await getQuestions({ page: opts.page ?? page, limit: 20 })
        if (requestId === requestIdRef.current) {
          setQuestions(result?.questions || [])
          setPage(result?.page || 1)
          setTotalPages(result?.totalPages || 1)
        }
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err?.message || 'Failed to load questions')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    load({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEdit = (question) => {
    setEditingId(question.id)
    setEditDraft({
      prompt: question.prompt || '',
      category: question.category || '',
      difficulty: question.difficulty || '',
      correctAnswerKey: question.correctAnswerKey || '',
      answers: (question.answers || []).map((a) => ({ key: a.key, text: a.text })) || [],
      tags: question.tags || [],
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(null)
  }

  const handleSave = async () => {
    if (!editingId || !editDraft) return
    setLoading(true)
    setError('')
    try {
      await onUpdate?.(editingId, editDraft)
      await load()
      cancelEdit()
    } catch (err) {
      setError(err?.message || 'Failed to update question')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this question?')
    if (!confirmed) return
    setLoading(true)
    setError('')
    try {
      await onDelete?.(id)
      await load()
    } catch (err) {
      setError(err?.message || 'Failed to delete question')
    } finally {
      setLoading(false)
    }
  }

  const paginatedInfo = useMemo(() => `${page} / ${totalPages}`, [page, totalPages])

  const renderAnswers = (answers) => (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-200">
      {(answers || []).map((ans) => (
        <div key={ans.key} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
          <span className="font-semibold text-sky-300 mr-2">{ans.key}.</span>
          <span>{ans.text}</span>
          {/* {editDraft?.correctAnswerKey === ans.key ? (
            <span className="ml-2 text-emerald-300 font-semibold">[Correct]</span>
          ) : null} */}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Questions</p>
          <h1 className="text-3xl font-semibold text-white">Browse & Edit Questions</h1>
        </div>
        {loading ? <span className="text-sm text-slate-400">Loading...</span> : null}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 shadow shadow-slate-900/30">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 md:col-span-2"
            placeholder="Search prompt or answers"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <input
            className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            placeholder="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          />
          <input
            className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            placeholder="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => load({ page: 1, searchText, category, difficulty, tag })}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-sky-500/30 hover:bg-sky-500"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchText('')
              setCategory('')
              setDifficulty('')
              setTag('')
              load({ page: 1, searchText: '', category: '', difficulty: '', tag: '' })
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
          >
            Clear
          </button>
          <span className="text-xs text-slate-400">Page {paginatedInfo}</span>
        </div>
      </div>

      {questions.length === 0 && !loading ? (
        <p className="text-sm text-slate-400">No questions found.</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const isEditing = editingId === q.id
            return (
              <div
                key={q.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30"
              >
                <div className="items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Prompt</p>
                    {isEditing ? (
                      <textarea
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
                        rows={3}
                        value={editDraft?.prompt ?? ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, prompt: e.target.value }))}
                      />
                    ) : (
                      <p className="text-base text-white">{q.prompt}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    {q.category ? <span className="rounded-full border border-slate-800 px-3 py-1">{q.category}</span> : null}
                    {q.difficulty ? <span className="rounded-full border border-slate-800 px-3 py-1">{q.difficulty}</span> : null}
                    {Array.isArray(q.tags) && q.tags.length
                      ? q.tags.map((t) => (
                          <span key={t} className="rounded-full border border-slate-800 px-3 py-1">
                            {t}
                          </span>
                        ))
                      : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                      placeholder="Category"
                      value={editDraft?.category ?? ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, category: e.target.value }))}
                    />
                    <input
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                      placeholder="Difficulty"
                      value={editDraft?.difficulty ?? ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, difficulty: e.target.value }))}
                    />
                    <input
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                      placeholder="Correct Answer Key"
                      value={editDraft?.correctAnswerKey ?? ''}
                      onChange={(e) =>
                        setEditDraft((prev) => ({ ...prev, correctAnswerKey: e.target.value.toUpperCase() }))
                      }
                    />
                    <input
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                      placeholder="Tags (comma separated)"
                      value={(editDraft?.tags || []).join(', ')}
                      onChange={(e) =>
                        setEditDraft((prev) => ({
                          ...prev,
                          tags: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                    <div className="md:col-span-2 grid grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((key) => {
                        const existing = (editDraft?.answers || []).find((a) => a.key === key) || { key, text: '' }
                        return (
                          <input
                            key={key}
                            className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                            placeholder={`Answer ${key}`}
                            value={existing.text}
                            onChange={(e) =>
                              setEditDraft((prev) => {
                                const others = (prev?.answers || []).filter((a) => a.key !== key)
                                return { ...prev, answers: [...others, { key, text: e.target.value }] }
                              })
                            }
                          />
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  renderAnswers(q.answers)
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-emerald-500/30 hover:bg-emerald-400"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(q)}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-sky-500/30 hover:bg-sky-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-rose-500/30 hover:bg-rose-500"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => {
              const nextPage = Math.max(1, page - 1)
              load({ page: nextPage })
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-slate-400">Page {paginatedInfo}</span>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => {
              const nextPage = Math.min(totalPages, page + 1)
              load({ page: nextPage })
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
