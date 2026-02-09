import { useEffect, type KeyboardEvent, type RefObject } from 'react'
import mermaid from 'mermaid'

type PreviewBlock = {
  index: number
  html: string
  raw: string
  isEditing: boolean
}

type PreviewPaneProps = {
  blocks: PreviewBlock[]
  breadcrumbs: string
  onScroll: (scrollTop: number) => void
  previewRef: RefObject<HTMLDivElement | null>
  onSelectBlock: (index: number) => void
  onChangeBlock: (index: number, nextValue: string) => void
  onBlurBlock: () => void
  onInsertBlockBelow: (index: number) => void
  onMergeBlockWithPrevious: (index: number) => void
  onNavigateBlock: (index: number, direction: 'up' | 'down') => void
  editCaretPlacement: 'start' | 'end'
  editCaretNonce: number
}

export const PreviewPane = ({
  blocks,
  breadcrumbs,
  onScroll,
  previewRef,
  onSelectBlock,
  onChangeBlock,
  onBlurBlock,
  onInsertBlockBelow,
  onMergeBlockWithPrevious,
  onNavigateBlock,
  editCaretPlacement,
  editCaretNonce,
}: PreviewPaneProps) => {
  const fitTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

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
  }, [blocks, previewRef])

  useEffect(() => {
    const active = blocks.find((block) => block.isEditing)
    if (!active) {
      return
    }

    const textarea = document.querySelector(
      `[data-testid="preview-editor-${active.index}"]`
    ) as HTMLTextAreaElement | null

    if (!textarea) {
      return
    }

    const position = editCaretPlacement === 'start' ? 0 : textarea.value.length
    fitTextareaHeight(textarea)
    textarea.setSelectionRange(position, position)
    textarea.focus()
  }, [blocks, editCaretNonce, editCaretPlacement])

  const handleBlockKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }

    if (
      event.key === 'Backspace'
      && event.currentTarget.selectionStart === 0
      && event.currentTarget.selectionEnd === 0
      && index > 0
    ) {
      event.preventDefault()
      onMergeBlockWithPrevious(index)
      return
    }

    if (
      event.key === 'ArrowDown'
      && event.currentTarget.selectionStart === event.currentTarget.value.length
      && event.currentTarget.selectionEnd === event.currentTarget.value.length
      && index < blocks.length - 1
    ) {
      event.preventDefault()
      onNavigateBlock(index, 'down')
      return
    }

    if (
      event.key === 'ArrowUp'
      && event.currentTarget.selectionStart === 0
      && event.currentTarget.selectionEnd === 0
      && index > 0
    ) {
      event.preventDefault()
      onNavigateBlock(index, 'up')
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onInsertBlockBelow(index)
    }
  }

  return (
    <section
      className="h-full border-l border-canvas-200 p-6"
      style={{ background: 'var(--preview-bg)' }}
    >
      <div className="mb-4 truncate text-[11px] tracking-wide text-ink-500" title={breadcrumbs} data-testid="preview-breadcrumbs">
        {breadcrumbs}
      </div>
      <div
        className="markdown-body mx-auto h-full max-w-4xl overflow-y-auto space-y-2 text-sm leading-7 text-ink-800"
        data-testid="markdown-preview"
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
        ref={previewRef}
      >
        {blocks.map((block) => (
          <article
            key={block.index}
            className={`rounded-xl transition-colors ${
              block.isEditing
                ? 'bg-canvas-100/10 px-2 py-1'
                : 'border border-transparent px-3 py-2 hover:bg-canvas-100/20'
            }`}
            data-testid={`preview-block-${block.index}`}
            onClick={() => onSelectBlock(block.index)}
          >
            {block.isEditing ? (
              <textarea
                value={block.raw}
                onChange={(event) => {
                  fitTextareaHeight(event.currentTarget)
                  onChangeBlock(block.index, event.target.value)
                }}
                onBlur={onBlurBlock}
                onKeyDown={(event) => handleBlockKeyDown(event, block.index)}
                autoFocus
                className="mx-auto block w-full resize-none overflow-hidden border-none bg-transparent p-0 text-sm leading-7 text-ink-900 outline-none"
                rows={1}
                data-testid={`preview-editor-${block.index}`}
                spellCheck
              />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: block.html }} />
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
