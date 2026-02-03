type EditorPaneProps = {
  value: string
  onChange: (value: string) => void
  onScroll: (scrollTop: number) => void
  editorRef: React.RefObject<HTMLTextAreaElement>
}

export const EditorPane = ({
  value,
  onChange,
  onScroll,
  editorRef,
}: EditorPaneProps) => {
  return (
    <section className="h-full border-l border-canvas-200" style={{ background: 'var(--editor-bg)' }}>
      <textarea
        className="h-full w-full resize-none border-0 p-6 text-sm text-ink-800 focus:outline-none"
        style={{ background: 'var(--editor-bg)' }}
        data-testid="markdown-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
        ref={editorRef}
      />
    </section>
  )
}
