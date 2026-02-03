export {}

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
      selectWorkspace: () => Promise<string | null>
      revealInFinder: (path: string) => Promise<void>
      exportPdf: (payload: { title: string; markdown: string }) => Promise<string>
      loadTheme: () => Promise<{
        mode: 'light' | 'dark'
        colors: Record<string, string>
        mermaidTheme?: 'neutral' | 'dark'
      } | null>
    }
  }
}
