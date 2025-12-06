import { useEffect, useState } from 'react'

export default function AdminArchiveTab({ onFetchArchives, onDownload, onDelete }) {
  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await onFetchArchives?.()
        if (mounted && Array.isArray(result)) {
          setArchives(result)
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load archives')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [onFetchArchives])

  const handleDelete = async (id) => {
    if (!onDelete) return
    const confirmed = window.confirm('Delete this tournament and related live matches?')
    if (!confirmed) return
    try {
      await onDelete(id)
      setArchives((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err?.message || 'Failed to delete tournament')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Archive</p>
          <h1 className="text-3xl font-semibold text-white">Completed Tournaments</h1>
          <p className="mt-2 text-sm text-slate-300">Download or remove completed tournaments. Match history stays intact.</p>
        </div>
        {loading ? <span className="text-sm text-slate-400">Loading...</span> : null}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {archives.length === 0 ? (
        <p className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">No archived tournaments yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {archives.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.status}</p>
                  <p className="text-lg font-semibold text-white">{item.name || 'Tournament'}</p>
                  <p className="text-xs text-slate-400">Completed: {item.state?.completedAt ? new Date(item.state.completedAt).toLocaleString() : 'n/a'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onDownload ? (
                    <button
                      type="button"
                      onClick={() => onDownload(item.id)}
                      className="rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-200 transition hover:border-sky-400 hover:text-white"
                    >
                      Download CSV
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-200 transition hover:border-rose-400 hover:text-white"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
