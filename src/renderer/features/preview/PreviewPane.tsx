import type { MouseEvent, RefObject } from 'react'
import { useEffect } from 'react'
import mermaid from 'mermaid'

type PreviewPaneProps = {
  html: string
  onScroll: (scrollTop: number) => void
  previewRef: RefObject<HTMLDivElement | null>
  onRequestEdit: (text: string) => void
}

export const PreviewPane = ({ html, onScroll, previewRef, onRequestEdit }: PreviewPaneProps) => {
  useEffect(() => {
    const container = previewRef.current
    if (!container) {
      return
    }

    const nodes = container.querySelectorAll<HTMLElement>('.mermaid')
    if (nodes.length === 0) {
      return
    }

    const theme =
      document.documentElement.dataset.mermaidTheme === 'dark' ? 'dark' : 'neutral'
    mermaid.initialize({ startOnLoad: false, theme })
    mermaid.run({ nodes: Array.from(nodes) })
  }, [html, previewRef])

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }

    const block = target.closest('h1,h2,h3,h4,h5,h6,p,li,pre,code,blockquote,td,th') as HTMLElement | null
    const text = (block?.textContent ?? target.textContent ?? '').trim()
    if (!text) {
      return
    }

    onRequestEdit(text.slice(0, 180))
  }

  return (
    <section
      className="h-full border-l border-canvas-200 p-6"
      style={{ background: 'var(--preview-bg)' }}
    >
      <div
        className="markdown-body h-full overflow-y-auto space-y-3 text-sm leading-6 text-ink-800"
        data-testid="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
        ref={previewRef}
      />
    </section>
  )
}
