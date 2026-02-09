import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { ChevronDown, ChevronUp, Copy, Heading2, List, Trash2 } from 'lucide-react'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { useEffect, useMemo, useRef, useState, type DragEvent, type RefObject } from 'react'

type EditorPaneProps = {
  value: string
  onChange: (value: string) => void
  onScroll: (scrollTop: number) => void
  editorRef: RefObject<HTMLDivElement | null>
  jumpRequest: { text: string; nonce: number } | null
  onJumpHandled: () => void
}

export const EditorPane = ({
  value,
  onChange,
  onScroll,
  editorRef,
  jumpRequest,
  onJumpHandled,
}: EditorPaneProps) => {
  const viewRef = useRef<EditorView | null>(null)
  const [draggingBlockIndex, setDraggingBlockIndex] = useState<number | null>(null)
  const [cursorPos, setCursorPos] = useState(0)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)

  const getBlocks = (content: string) => {
    const rawBlocks = content.split(/\n\n/)
    const blocks = rawBlocks.length === 1 && rawBlocks[0] === '' ? [] : rawBlocks
    const ranges = blocks.map((block, index) => {
      const from = blocks.slice(0, index).reduce((acc, current) => acc + current.length + 2, 0)
      const to = from + block.length
      return { from, to, block }
    })
    return { blocks, ranges }
  }

  const blockModel = useMemo(() => getBlocks(value), [value])
  const activeBlockIndex = useMemo(() => {
    if (blockModel.ranges.length === 0) {
      return -1
    }

    const found = blockModel.ranges.findIndex((range) => cursorPos >= range.from && cursorPos <= range.to)
    return found >= 0 ? found : 0
  }, [blockModel.ranges, cursorPos])

  const getCurrentBlockRange = () => {
    const view = viewRef.current
    if (!view) {
      return null
    }

    const content = view.state.doc.toString()
    const pos = view.state.selection.main.head
    const prevBreak = content.lastIndexOf('\n\n', Math.max(0, pos - 1))
    const nextBreak = content.indexOf('\n\n', pos)
    const from = prevBreak >= 0 ? prevBreak + 2 : 0
    const to = nextBreak >= 0 ? nextBreak : content.length
    return { from, to, content }
  }

  const selectBlockByIndex = (index: number) => {
    const view = viewRef.current
    const range = blockModel.ranges[index]
    if (!view || !range) {
      return
    }

    view.dispatch({
      selection: { anchor: range.from, head: range.to },
      scrollIntoView: true,
    })
    view.focus()
  }

  const moveBlockByIndex = (fromIndex: number, toIndex: number) => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const { blocks } = getBlocks(view.state.doc.toString())
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) {
      return
    }

    const nextBlocks = [...blocks]
    const [moved] = nextBlocks.splice(fromIndex, 1)
    nextBlocks.splice(toIndex, 0, moved)
    const nextContent = nextBlocks.join('\n\n')

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextContent },
      scrollIntoView: true,
    })
    view.focus()
  }

  const handleBlockDragStart = (index: number) => {
    setDraggingBlockIndex(index)
  }

  const handleBlockDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const handleBlockDrop = (toIndex: number) => {
    if (draggingBlockIndex === null || draggingBlockIndex === toIndex) {
      setDraggingBlockIndex(null)
      return
    }

    moveBlockByIndex(draggingBlockIndex, toIndex)
    setDraggingBlockIndex(null)
  }

  const dispatchBlockText = (nextBlock: string) => {
    const view = viewRef.current
    const range = getCurrentBlockRange()
    if (!view || !range) {
      return
    }

    view.dispatch({
      changes: { from: range.from, to: range.to, insert: nextBlock },
      selection: { anchor: range.from, head: range.from + nextBlock.length },
      scrollIntoView: true,
    })
    view.focus()
  }

  const moveBlock = (direction: 'up' | 'down') => {
    const view = viewRef.current
    const range = getCurrentBlockRange()
    if (!view || !range) {
      return
    }

    const blocks = range.content.split(/\n\n/)
    let running = 0
    let index = 0
    for (let i = 0; i < blocks.length; i += 1) {
      const end = running + blocks[i].length
      if (range.from >= running && range.from <= end + 1) {
        index = i
        break
      }
      running = end + 2
    }

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= blocks.length) {
      return
    }

    const nextBlocks = [...blocks]
    const current = nextBlocks[index]
    nextBlocks[index] = nextBlocks[swapIndex]
    nextBlocks[swapIndex] = current

    const nextContent = nextBlocks.join('\n\n')
    view.dispatch({
      changes: { from: 0, to: range.content.length, insert: nextContent },
      scrollIntoView: true,
    })
    view.focus()
  }

  const duplicateBlock = () => {
    const view = viewRef.current
    const range = getCurrentBlockRange()
    if (!view || !range) {
      return
    }

    const selectedBlock = range.content.slice(range.from, range.to)
    view.dispatch({
      changes: { from: range.to, to: range.to, insert: `\n\n${selectedBlock}` },
      selection: { anchor: range.to + 2, head: range.to + 2 + selectedBlock.length },
      scrollIntoView: true,
    })
    view.focus()
  }

  const deleteBlock = () => {
    const view = viewRef.current
    const range = getCurrentBlockRange()
    if (!view || !range) {
      return
    }

    const deleteFrom = Math.max(0, range.from - (range.from > 0 ? 2 : 0))
    view.dispatch({
      changes: { from: deleteFrom, to: range.to, insert: '' },
      selection: { anchor: deleteFrom },
      scrollIntoView: true,
    })
    view.focus()
  }

  const toggleHeading = () => {
    const range = getCurrentBlockRange()
    if (!range) {
      return
    }

    const current = range.content.slice(range.from, range.to)
    const next = current.startsWith('## ') ? current.replace(/^##\s+/, '') : `## ${current}`
    dispatchBlockText(next)
  }

  const toggleList = () => {
    const range = getCurrentBlockRange()
    if (!range) {
      return
    }

    const current = range.content.slice(range.from, range.to)
    const lines = current.split('\n')
    const allBulleted = lines.every((line) => line.trim().startsWith('- '))
    const next = allBulleted
      ? lines.map((line) => line.replace(/^\s*[-*+]\s+/, '')).join('\n')
      : lines.map((line) => (line.trim().length === 0 ? line : `- ${line}`)).join('\n')

    dispatchBlockText(next)
  }

  const convertToCodeBlock = () => {
    const range = getCurrentBlockRange()
    if (!range) {
      return
    }
    const current = range.content.slice(range.from, range.to)
    const cleaned = current.replace(/^```[\w-]*\n?|\n?```$/g, '')
    dispatchBlockText(`\`\`\`text\n${cleaned}\n\`\`\``)
  }

  const convertToQuote = () => {
    const range = getCurrentBlockRange()
    if (!range) {
      return
    }
    const current = range.content.slice(range.from, range.to)
    const next = current
      .split('\n')
      .map((line) => (line.trim().startsWith('>') ? line : `> ${line}`))
      .join('\n')
    dispatchBlockText(next)
  }

  const convertToChecklist = () => {
    const range = getCurrentBlockRange()
    if (!range) {
      return
    }
    const current = range.content.slice(range.from, range.to)
    const next = current
      .split('\n')
      .map((line) => {
        if (line.trim().length === 0) {
          return line
        }
        if (/^\s*[-*+]\s+\[[ xX]\]/.test(line)) {
          return line
        }
        return `- [ ] ${line.replace(/^\s*[-*+]\s+/, '')}`
      })
      .join('\n')
    dispatchBlockText(next)
  }

  const slashActions = [
    { label: 'Heading', run: toggleHeading },
    { label: 'Bullet List', run: toggleList },
    { label: 'Checklist', run: convertToChecklist },
    { label: 'Quote', run: convertToQuote },
    { label: 'Code Block', run: convertToCodeBlock },
  ]

  useEffect(() => {
    if (!jumpRequest || !viewRef.current) {
      return
    }

    const query = jumpRequest.text.trim()
    if (!query) {
      onJumpHandled()
      return
    }

    const content = viewRef.current.state.doc.toString()
    const from = content.toLowerCase().indexOf(query.toLowerCase())
    if (from >= 0) {
      const prevBreak = content.lastIndexOf('\n\n', Math.max(0, from - 1))
      const nextBreak = content.indexOf('\n\n', from)
      const blockStart = prevBreak >= 0 ? prevBreak + 2 : 0
      const blockEnd = nextBreak >= 0 ? nextBreak : content.length

      viewRef.current.dispatch({
        selection: { anchor: blockStart, head: blockEnd },
        scrollIntoView: true,
      })
      viewRef.current.focus()
    }

    onJumpHandled()
  }, [jumpRequest, onJumpHandled])

  return (
    <section className="h-full border-l border-canvas-200" style={{ background: 'var(--editor-bg)' }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-canvas-200 px-3 py-2 text-xs text-ink-600">
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={() => moveBlock('up')}>
            <ChevronUp size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={() => moveBlock('down')}>
            <ChevronDown size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={duplicateBlock}>
            <Copy size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={deleteBlock}>
            <Trash2 size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={toggleHeading}>
            <Heading2 size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={toggleList}>
            <List size={14} />
          </button>
          <span className="ml-2 text-ink-500">Bloque activo</span>
          <span className="ml-auto text-[10px] text-ink-400">⌥⇧↑/↓ mover · ⌘⇧D duplicar · ⌘⇧H heading · ⌘⇧L lista</span>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-canvas-200 px-3 py-2">
          {blockModel.blocks.map((block, index) => (
            <button
              key={`${index}-${block.slice(0, 18)}`}
              className={`max-w-[220px] shrink-0 rounded border px-2 py-1 text-left text-[11px] hover:bg-canvas-100 ${
                index === activeBlockIndex
                  ? 'border-canvas-200/60 bg-canvas-100/20 text-ink-700'
                  : 'border-canvas-200 bg-canvas-50 text-ink-700'
              }`}
              type="button"
              draggable
              onDragStart={() => handleBlockDragStart(index)}
              onDragOver={handleBlockDragOver}
              onDrop={() => handleBlockDrop(index)}
              onClick={() => selectBlockByIndex(index)}
              data-testid={`block-chip-${index}`}
            >
              {block.trim().slice(0, 80) || `Bloque ${index + 1}`}
            </button>
          ))}
        </div>
        <div ref={editorRef} className="relative h-full overflow-hidden" data-testid="markdown-editor">
          <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={[
            markdown(),
            EditorView.lineWrapping,
            EditorView.domEventHandlers({
              scroll: (_event, view) => {
                onScroll(view.scrollDOM.scrollTop)
                return false
              },
              blur: () => {
                setSlashOpen(false)
                return false
              },
              keydown: (event) => {
                if (slashOpen) {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setSlashIndex((current) => (current + 1) % slashActions.length)
                    return true
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setSlashIndex((current) => (current - 1 + slashActions.length) % slashActions.length)
                    return true
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    slashActions[slashIndex]?.run()
                    setSlashOpen(false)
                    return true
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setSlashOpen(false)
                    return true
                  }
                }

                if (event.altKey && event.shiftKey && event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveBlock('up')
                  return true
                }

                if (event.altKey && event.shiftKey && event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveBlock('down')
                  return true
                }

                if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
                  event.preventDefault()
                  duplicateBlock()
                  return true
                }

                if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
                  event.preventDefault()
                  toggleList()
                  return true
                }

                if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
                  event.preventDefault()
                  toggleHeading()
                  return true
                }

                if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === '/') {
                  const range = getCurrentBlockRange()
                  const current = range ? range.content.slice(range.from, range.to).trim() : ''
                  if (current.length === 0) {
                    event.preventDefault()
                    setSlashIndex(0)
                    setSlashOpen(true)
                    return true
                  }
                }

                return false
              },
            }),
            EditorView.updateListener.of((update: ViewUpdate) => {
              if (update.selectionSet) {
                setCursorPos(update.state.selection.main.head)
              }
            }),
          ]}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view
            setCursorPos(view.state.selection.main.head)
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          className="h-full"
        />
          {slashOpen ? (
            <div className="absolute left-6 top-20 z-30 w-56 rounded-xl border border-canvas-200 bg-white/95 p-1 shadow-soft">
              {slashActions.map((action, index) => (
                <button
                  key={action.label}
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                    index === slashIndex ? 'bg-canvas-100 text-ink-900' : 'text-ink-700 hover:bg-canvas-100'
                  }`}
                  onMouseEnter={() => setSlashIndex(index)}
                  onClick={() => {
                    action.run()
                    setSlashOpen(false)
                  }}
                >
                  / {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
