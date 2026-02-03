import { useEffect } from 'react'
import mermaid from 'mermaid'

type PreviewPaneProps = {
  html: string
  onScroll: (scrollTop: number) => void
  previewRef: React.RefObject<HTMLDivElement>
}

export const PreviewPane = ({ html, onScroll, previewRef }: PreviewPaneProps) => {
  useEffect(() => {
    const container = previewRef.current
    if (!container) {
      return
    }

    const nodes = container.querySelectorAll('.mermaid')
    if (nodes.length === 0) {
      return
    }

    const theme =
      document.documentElement.dataset.mermaidTheme === 'dark' ? 'dark' : 'neutral'
    mermaid.initialize({ startOnLoad: false, theme })
    mermaid.run({ nodes: Array.from(nodes) })
  }, [html, previewRef])

  return (
    <section
      className="h-full border-l border-canvas-200 p-6"
      style={{ background: 'var(--preview-bg)' }}
    >
      <div
        className="markdown-body h-full overflow-y-auto space-y-3 text-sm leading-6 text-ink-800"
        data-testid="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
        ref={previewRef}
      />
    </section>
  )
}
