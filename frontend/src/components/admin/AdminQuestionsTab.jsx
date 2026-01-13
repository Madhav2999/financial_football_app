import { useRef, useState } from 'react'

const SAMPLE_CSV = `prompt,category,difficulty,correctAnswerKey,answerA,answerB,answerC,answerD,tags
Which budget item is the hardest to cut?,budget,moderate,A,Car payment,Eating out,Entertainment,No-contract cell phone plan,"budgeting,saving"`

export default function AdminQuestionsTab({ onImport }) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)
  const [formQuestion, setFormQuestion] = useState({
    prompt: '',
    category: '',
    difficulty: '',
    correctAnswerKey: '',
    answerA: '',
    answerB: '',
    answerC: '',
    answerD: '',
  })

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setText(reader.result || '')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!text.trim()) {
      setStatus('Please paste CSV or select a file.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await onImport?.(text)
      setStatus('Imported successfully.')
    } catch (error) {
      setStatus(error?.message || 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleFormChange = (field, value) => {
    setFormQuestion((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddSingle = async () => {
    if (!formQuestion.prompt || !formQuestion.correctAnswerKey) {
      setStatus('Prompt and correct answer key are required.')
      return
    }
    const answers = ['A', 'B', 'C', 'D']
      .map((key) => ({ key, text: formQuestion[`answer${key}`] }))
      .filter((ans) => ans.text && ans.text.trim())

    if (!answers.length) {
      setStatus('Please provide at least one answer option.')
      return
    }

    setBusy(true)
    setStatus(null)
    try {
      await onImport?.([
        {
          prompt: formQuestion.prompt,
          category: formQuestion.category,
          difficulty: formQuestion.difficulty,
          correctAnswerKey: formQuestion.correctAnswerKey,
          answers,
          tags: [],
        },
      ])
      setStatus('Question added.')
      setFormQuestion({
        prompt: '',
        category: '',
        difficulty: '',
        correctAnswerKey: '',
        answerA: '',
        answerB: '',
        answerC: '',
        answerD: '',
      })
    } catch (error) {
      setStatus(error?.message || 'Add failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30">
        <h2 className="text-xl font-semibold text-white">Bulk Import Questions</h2>
        <p className="mt-2 text-slate-300">
          Upload a CSV with headers: <code>prompt, category, difficulty, correctAnswerKey, answerA, answerB, answerC, answerD, tags</code>.
          Tags can be comma-separated and may be omitted; category is optional. Prompts must be unique; existing prompts are skipped.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="text-sm text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-white file:cursor-pointer"
            />
            {fileName ? <span className="text-xs text-slate-400">Loaded: {fileName}</span> : null}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste CSV here..."
            rows={10}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setText(SAMPLE_CSV)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
            >
              Insert sample
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={busy}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Importing...' : 'Import CSV'}
            </button>
          </div>

          {status ? <p className="text-xs text-slate-300">{status}</p> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow shadow-slate-900/30">
        <h2 className="text-xl font-semibold text-white">Add Single Question</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Prompt</label>
            <textarea
              value={formQuestion.prompt}
              onChange={(e) => handleFormChange('prompt', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
              placeholder="Enter the question prompt"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Category (optional)</label>
            <input
              value={formQuestion.category}
              onChange={(e) => handleFormChange('category', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
              placeholder="e.g. budgeting"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Difficulty (optional)</label>
            <input
              value={formQuestion.difficulty}
              onChange={(e) => handleFormChange('difficulty', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
              placeholder="easy | moderate | hard"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Correct Answer Key</label>
            <input
              value={formQuestion.correctAnswerKey}
              onChange={(e) => handleFormChange('correctAnswerKey', e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
              placeholder="A, B, C, or D"
            />
          </div>
          <div />
          {['A', 'B', 'C', 'D'].map((key) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">{`Answer ${key}`}</label>
              <input
                value={formQuestion[`answer${key}`]}
                onChange={(e) => handleFormChange(`answer${key}`, e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100"
                placeholder={`Option ${key}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleAddSingle}
            disabled={busy}
            className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-sky-500/30 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving...' : 'Add Question'}
          </button>
          <button
            type="button"
            onClick={() =>
              setFormQuestion({
                prompt: '',
                category: '',
                difficulty: '',
                correctAnswerKey: '',
                answerA: '',
                answerB: '',
                answerC: '',
                answerD: '',
              })
            }
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
