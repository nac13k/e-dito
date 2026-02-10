import CodeMirror from '@uiw/react-codemirror'
import {
  autocompletion,
  completeFromList,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete'
import { redo, undo } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  Copy,
  Heading1,
  Heading2,
  Heading3,
  Link,
  List,
  ListChecks,
  MessageSquareQuote,
  SmilePlus,
  SquareCode,
  Trash2,
} from 'lucide-react'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

const EMOJI_RECENTS_STORAGE_KEY = 'editor:emoji-recents'
const MAX_RECENT_EMOJIS = 10

type EditorPaneProps = {
  value: string
  breadcrumbFile: string | null
  onChange: (value: string) => void
  onScroll: (scrollTop: number) => void
  editorRef: RefObject<HTMLDivElement | null>
  jumpRequest: { text: string; nonce: number } | null
  onJumpHandled: () => void
}

export const EditorPane = ({
  value,
  breadcrumbFile,
  onChange,
  onScroll,
  editorRef,
  jumpRequest,
  onJumpHandled,
}: EditorPaneProps) => {
  const [cursorPos, setCursorPos] = useState(0)

  const markdownCompletions: Completion[] = useMemo(
    () => [
      { label: '# ', detail: 'Heading 1', type: 'keyword' },
      { label: '## ', detail: 'Heading 2', type: 'keyword' },
      { label: '### ', detail: 'Heading 3', type: 'keyword' },
      { label: '- ', detail: 'Bullet list', type: 'keyword' },
      { label: '1. ', detail: 'Numbered list', type: 'keyword' },
      { label: '- [ ] ', detail: 'Checklist item', type: 'keyword' },
      { label: '> ', detail: 'Blockquote', type: 'keyword' },
      { label: '**texto**', detail: 'Bold', type: 'keyword' },
      { label: '*texto*', detail: 'Italic', type: 'keyword' },
      { label: '`codigo`', detail: 'Inline code', type: 'keyword' },
      {
        label: '```ts\n\n```',
        detail: 'TS code block',
        type: 'keyword',
        apply: '```ts\n\n```',
      },
      {
        label: '```mermaid\n\n```',
        detail: 'Mermaid block',
        type: 'keyword',
        apply: '```mermaid\n\n```',
      },
      { label: '![alt](ruta)', detail: 'Image', type: 'keyword' },
      { label: '[texto](url)', detail: 'Link', type: 'keyword' },
    ],
    []
  )

  const readingScrollExtension = useMemo(
    () => EditorView.theme({
      '.cm-content': {
        paddingBottom: '40vh',
      },
    }),
    []
  )

  const viewRef = useRef<EditorView | null>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false)
  const [emojiQuery, setEmojiQuery] = useState('')
  const [recentEmojiShortcodes, setRecentEmojiShortcodes] = useState<string[]>([])
  const emojiMenuRef = useRef<HTMLDivElement | null>(null)

  const githubEmojiOptions = useMemo(
    () => [
      { shortcode: 'grinning', glyph: '\u{1F600}' },
      { shortcode: 'smile', glyph: '\u{1F604}' },
      { shortcode: 'joy', glyph: '\u{1F602}' },
      { shortcode: 'rofl', glyph: '\u{1F923}' },
      { shortcode: 'wink', glyph: '\u{1F609}' },
      { shortcode: 'heart_eyes', glyph: '\u{1F60D}' },
      { shortcode: 'thinking', glyph: '\u{1F914}' },
      { shortcode: 'sunglasses', glyph: '\u{1F60E}' },
      { shortcode: 'sob', glyph: '\u{1F62D}' },
      { shortcode: 'scream', glyph: '\u{1F631}' },
      { shortcode: 'fire', glyph: '\u{1F525}' },
      { shortcode: 'rocket', glyph: '\u{1F680}' },
      { shortcode: 'sparkles', glyph: '\u{2728}' },
      { shortcode: 'tada', glyph: '\u{1F389}' },
      { shortcode: 'white_check_mark', glyph: '\u{2705}' },
      { shortcode: 'x', glyph: '\u{274C}' },
      { shortcode: 'warning', glyph: '\u{26A0}\u{FE0F}' },
      { shortcode: 'bug', glyph: '\u{1F41B}' },
      { shortcode: 'memo', glyph: '\u{1F4DD}' },
      { shortcode: 'eyes', glyph: '\u{1F440}' },
      { shortcode: 'thumbsup', glyph: '\u{1F44D}' },
      { shortcode: 'thumbsdown', glyph: '\u{1F44E}' },
      { shortcode: 'clap', glyph: '\u{1F44F}' },
      { shortcode: 'wave', glyph: '\u{1F44B}' },
      { shortcode: 'pray', glyph: '\u{1F64F}' },
    ],
    []
  )

  const filteredEmojiOptions = useMemo(() => {
    const query = emojiQuery.trim().toLowerCase()
    if (!query) {
      return githubEmojiOptions
    }

    return githubEmojiOptions.filter((emoji) => emoji.shortcode.includes(query))
  }, [emojiQuery, githubEmojiOptions])

  const recentEmojiOptions = useMemo(() => {
    const byShortcode = new Map(githubEmojiOptions.map((emoji) => [emoji.shortcode, emoji]))
    return recentEmojiShortcodes
      .map((shortcode) => byShortcode.get(shortcode))
      .filter((emoji): emoji is { shortcode: string; glyph: string } => Boolean(emoji))
  }, [githubEmojiOptions, recentEmojiShortcodes])

  const filteredRecentEmojiOptions = useMemo(() => {
    const query = emojiQuery.trim().toLowerCase()
    if (!query) {
      return recentEmojiOptions
    }

    return recentEmojiOptions.filter((emoji) => emoji.shortcode.includes(query))
  }, [emojiQuery, recentEmojiOptions])

  const filteredRecentSet = useMemo(
    () => new Set(filteredRecentEmojiOptions.map((emoji) => emoji.shortcode)),
    [filteredRecentEmojiOptions]
  )

  const filteredOtherEmojiOptions = useMemo(
    () => filteredEmojiOptions.filter((emoji) => !filteredRecentSet.has(emoji.shortcode)),
    [filteredEmojiOptions, filteredRecentSet]
  )

  const headingAnchors = useMemo(() => {
    const lines = value.split('\n')
    let offset = 0
    const anchors: Array<{ id: string; text: string; level: number; from: number; to: number }> = []

    lines.forEach((line, index) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
      if (match) {
        const level = match[1]?.length ?? 1
        const text = match[2]?.trim() ?? `Heading ${index + 1}`
        anchors.push({
          id: `${offset}-${text}`,
          text,
          level,
          from: offset,
          to: offset + line.length,
        })
      }
      offset += line.length + 1
    })

    return anchors
  }, [value])

  const activeHeadingIndex = useMemo(() => {
    if (headingAnchors.length === 0) {
      return -1
    }

    for (let index = headingAnchors.length - 1; index >= 0; index -= 1) {
      if (cursorPos >= headingAnchors[index].from) {
        return index
      }
    }

    return 0
  }, [cursorPos, headingAnchors])

  const activeHeadingTrail = useMemo(() => {
    if (activeHeadingIndex < 0) {
      return ''
    }

    const trail: Array<{ level: number; text: string }> = []
    for (let index = 0; index <= activeHeadingIndex; index += 1) {
      const heading = headingAnchors[index]
      while (trail.length > 0 && trail[trail.length - 1].level >= heading.level) {
        trail.pop()
      }
      trail.push({ level: heading.level, text: heading.text })
    }

    return trail.map((entry) => entry.text).join(' / ')
  }, [activeHeadingIndex, headingAnchors])

  const editorBreadcrumbs = activeHeadingTrail
    ? `${breadcrumbFile ?? 'Sin archivo seleccionado'} / ${activeHeadingTrail}`
    : (breadcrumbFile ?? 'Sin archivo seleccionado')

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

  const setHeadingLevel = (level: 1 | 2 | 3) => {
    const range = getCurrentBlockRange()
    if (!range) {
      return
    }

    const current = range.content.slice(range.from, range.to)
    const clean = current.replace(/^#{1,6}\s+/, '')
    dispatchBlockText(`${'#'.repeat(level)} ${clean}`)
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

  const insertLinkTemplate = () => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const selection = view.state.selection.main
    const selectedText = view.state.doc.sliceString(selection.from, selection.to) || 'texto'
    const insert = `[${selectedText}](https://)`
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert },
      selection: { anchor: selection.from + insert.length },
      scrollIntoView: true,
    })
    view.focus()
  }

  const insertEmoji = (shortcode: string) => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const position = view.state.selection.main.head
    const previousChar = position > 0 ? view.state.doc.sliceString(position - 1, position) : ''
    const spacer = previousChar && /\s/.test(previousChar) ? '' : ' '
    const insertion = `${spacer}:${shortcode}:`
    view.dispatch({
      changes: { from: position, to: position, insert: insertion },
      selection: { anchor: position + insertion.length },
      scrollIntoView: true,
    })

    setRecentEmojiShortcodes((current) => {
      const next = [shortcode, ...current.filter((item) => item !== shortcode)].slice(0, MAX_RECENT_EMOJIS)
      try {
        window.localStorage.setItem(EMOJI_RECENTS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // no-op
      }
      return next
    })

    view.focus()
    setEmojiMenuOpen(false)
    setEmojiQuery('')
  }

  const slashActions = [
    { label: 'Heading', run: toggleHeading },
    { label: 'Bullet List', run: toggleList },
    { label: 'Checklist', run: convertToChecklist },
    { label: 'Quote', run: convertToQuote },
    { label: 'Code Block', run: convertToCodeBlock },
  ]

  useEffect(() => {
    const handleMenuEditAction = (event: Event) => {
      const custom = event as CustomEvent<'undo' | 'redo'>
      const view = viewRef.current
      if (!view) {
        return
      }

      if (custom.detail === 'undo') {
        undo(view)
        return
      }

      if (custom.detail === 'redo') {
        redo(view)
      }
    }

    window.addEventListener('menu:edit-action', handleMenuEditAction)
    return () => {
      window.removeEventListener('menu:edit-action', handleMenuEditAction)
    }
  }, [])

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EMOJI_RECENTS_STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        return
      }

      const valid = parsed
        .filter((item): item is string => typeof item === 'string')
        .slice(0, MAX_RECENT_EMOJIS)

      if (valid.length > 0) {
        setRecentEmojiShortcodes(valid)
      }
    } catch {
      // no-op
    }
  }, [])

  useEffect(() => {
    if (!emojiMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) {
        return
      }
      if (emojiMenuRef.current?.contains(target)) {
        return
      }
      setEmojiMenuOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmojiMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [emojiMenuOpen])

  return (
    <section className="h-full border-l border-canvas-200" style={{ background: 'var(--editor-bg)' }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-canvas-200 px-3 py-2 text-xs text-ink-600">
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={() => setHeadingLevel(1)}>
            <Heading1 size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={() => setHeadingLevel(2)}>
            <Heading2 size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={() => setHeadingLevel(3)}>
            <Heading3 size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={duplicateBlock}>
            <Copy size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={deleteBlock}>
            <Trash2 size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={toggleList}>
            <List size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={convertToChecklist}>
            <ListChecks size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={convertToQuote}>
            <MessageSquareQuote size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={convertToCodeBlock}>
            <SquareCode size={14} />
          </button>
          <button className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100" type="button" onClick={insertLinkTemplate}>
            <Link size={14} />
          </button>
          <div className="relative" ref={emojiMenuRef}>
            <button
              className="rounded border border-canvas-200 px-2 py-1 hover:bg-canvas-100"
              type="button"
              onClick={() => {
                setEmojiMenuOpen((current) => !current)
                setEmojiQuery('')
              }}
            >
              <SmilePlus size={14} />
            </button>
            {emojiMenuOpen ? (
              <div className="absolute right-0 top-9 z-40 w-80 rounded-xl border border-canvas-200 bg-white p-2 shadow-soft">
                <input
                  value={emojiQuery}
                  onChange={(event) => setEmojiQuery(event.target.value)}
                  placeholder="Buscar emoji github..."
                  className="mb-2 w-full rounded-md border border-canvas-200 px-2 py-1 text-xs text-ink-700 outline-none focus:border-canvas-300"
                  type="text"
                />
                <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1">
                  {filteredRecentEmojiOptions.length > 0 ? (
                    <span className="col-span-2 px-2 pt-1 text-[10px] uppercase tracking-wide text-ink-500">
                      Recientes
                    </span>
                  ) : null}
                  {filteredRecentEmojiOptions.map((emoji) => (
                    <button
                      key={`recent-${emoji.shortcode}`}
                      type="button"
                      className="flex items-center gap-2 rounded-md border border-canvas-200/80 bg-canvas-50 px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-canvas-100"
                      onClick={() => insertEmoji(emoji.shortcode)}
                    >
                      <span className="text-base leading-none">{emoji.glyph}</span>
                      <span className="truncate">:{emoji.shortcode}:</span>
                    </button>
                  ))}
                  {filteredRecentEmojiOptions.length > 0 ? (
                    <span className="col-span-2 mt-1 px-2 pt-1 text-[10px] uppercase tracking-wide text-ink-500">
                      Todos
                    </span>
                  ) : null}
                  {filteredOtherEmojiOptions.map((emoji) => (
                    <button
                      key={emoji.shortcode}
                      type="button"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-canvas-100"
                      onClick={() => insertEmoji(emoji.shortcode)}
                    >
                      <span className="text-base leading-none">{emoji.glyph}</span>
                      <span className="truncate">:{emoji.shortcode}:</span>
                    </button>
                  ))}
                  {filteredRecentEmojiOptions.length === 0 && filteredOtherEmojiOptions.length === 0 ? (
                    <span className="col-span-2 px-2 py-3 text-center text-xs text-ink-500">Sin resultados</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <span className="ml-auto text-[10px] text-ink-400">⌘⇧D duplicar · ⌘⇧H heading · ⌘⇧L lista · ⌘Space autocomplete</span>
        </div>
        <div className="border-b border-canvas-200 px-3 py-2">
          <p className="truncate text-[11px] tracking-wide text-ink-500" title={editorBreadcrumbs} data-testid="editor-breadcrumbs">
            {editorBreadcrumbs}
          </p>
        </div>
        <div ref={editorRef} className="relative h-full overflow-hidden" data-testid="markdown-editor">
          <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={[
            markdown({ codeLanguages: languages }),
            autocompletion({
              activateOnTyping: true,
              override: [completeFromList(markdownCompletions)],
            }),
            readingScrollExtension,
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

                if ((event.metaKey || event.ctrlKey) && event.key === ' ') {
                  event.preventDefault()
                  const view = viewRef.current
                  if (view) {
                    startCompletion(view)
                  }
                  return true
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
