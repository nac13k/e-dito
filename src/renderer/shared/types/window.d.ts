export {}

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
      selectWorkspace: () => Promise<string | null>
      revealInFinder: (path: string) => Promise<void>
      exportPdfFile: (payload: { title: string; markdown: string }) => Promise<string>
      exportPdfFolder: () => Promise<string>
      exportPdfProject: () => Promise<string>
      loadTheme: () => Promise<{
        mode: 'light' | 'dark'
        colors: Record<string, string>
        mermaidTheme?: 'neutral' | 'dark'
      } | null>
    }
  }
}
