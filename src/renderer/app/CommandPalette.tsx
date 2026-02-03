import { useEffect, useMemo, useState } from 'react'

type Action = {
  id: string
  label: string
  category?: string
  aliases?: string[]
  shortcut?: string
  onRun: () => void
}

type CommandPaletteProps = {
  open: boolean
  actions: Action[]
  onClose: () => void
}

export const CommandPalette = ({ open, actions, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState('Todas')

  useEffect(() => {
    if (!open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeCategory])

  const categories = useMemo(() => {
    const unique = new Set(actions.map((action) => action.category).filter(Boolean))
    return ['Todas', ...Array.from(unique) as string[]]
  }, [actions])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return actions.filter((action) => {
      const inCategory =
        activeCategory === 'Todas' || action.category === activeCategory
      const haystack = [action.label, ...(action.aliases ?? [])]
        .join(' ')
        .toLowerCase()
      const matchesQuery = normalized ? haystack.includes(normalized) : true
      return inCategory && matchesQuery
    })
  }, [actions, activeCategory, query])

  useEffect(() => {
    if (!open) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((current) => Math.min(current + 1, filtered.length - 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((current) => Math.max(current - 1, 0))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const action = filtered[selectedIndex]
        if (action) {
          action.onRun()
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, onClose, open, selectedIndex])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50" data-testid="command-palette">
      <button
        className="absolute inset-0 bg-ink-900/20"
        onClick={onClose}
        type="button"
        aria-label="Cerrar comandos"
      />
      <div className="absolute left-1/2 top-24 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-canvas-200 bg-white shadow-soft">
        <div className="border-b border-canvas-200 px-4 py-3">
          <input
            className="w-full border-0 bg-transparent text-sm text-ink-800 focus:outline-none"
            placeholder="Buscar comando..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-full border px-3 py-1 text-xs ${
                  activeCategory === category
                    ? 'border-ink-400 text-ink-800'
                    : 'border-canvas-200 text-ink-500'
                }`}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.map((action, index) => (
            <button
              key={action.id}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink-700 hover:bg-canvas-100 ${
                index === selectedIndex ? 'bg-canvas-100' : ''
              }`}
              onClick={() => {
                action.onRun()
                onClose()
                setQuery('')
              }}
              type="button"
              data-testid={`command-${action.id}`}
            >
              <span>{action.label}</span>
              {action.shortcut ? (
                <span className="text-xs text-ink-400">{action.shortcut}</span>
              ) : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-ink-400">
              Sin resultados
            </div>
          ) : null}
        </div>
        <div className="border-t border-canvas-200 px-4 py-3 text-xs text-ink-400">
          Sugerencias: "export pdf", "abrir carpeta", "preview", "sync git"
        </div>
      </div>
    </div>
  )
}
