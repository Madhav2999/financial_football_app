import { BASE_MODES } from './state'

export default function ModeTabs({ mode, onChange, hidden }) {
  if (hidden) return null

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {BASE_MODES.map((item) => {
        const active = mode === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition-all',
              'border',
              active
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/40'
                : 'border-white/30 text-slate-200 hover:bg-white/10',
            ].join(' ')}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
