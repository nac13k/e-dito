import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, type RefObject } from 'react'

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
      viewRef.current.dispatch({
        selection: { anchor: from },
        scrollIntoView: true,
      })
      viewRef.current.focus()
    }

    onJumpHandled()
  }, [jumpRequest, onJumpHandled])

  return (
    <section className="h-full border-l border-canvas-200" style={{ background: 'var(--editor-bg)' }}>
      <div ref={editorRef} className="h-full overflow-hidden" data-testid="markdown-editor">
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
            }),
          ]}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          className="h-full"
        />
      </div>
    </section>
  )
}
