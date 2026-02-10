export {}

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
      getLastWorkspace: () => Promise<string | null>
      setLastWorkspace: (workspacePath: string | null) => Promise<void>
      getRecentWorkspaces: () => Promise<string[]>
      clearRecentWorkspaces: () => Promise<void>
      onWorkspaceOpenRequest: (callback: (workspacePath: string | null) => void) => () => void
      onMenuEditAction: (callback: (action: 'undo' | 'redo') => void) => () => void
      selectWorkspace: () => Promise<string | null>
      readWorkspaceTree: (workspacePath: string) => Promise<{
        id: string
        name: string
        path: string
        parentId: string | null
        depth: number
        files: { id: string; name: string; path: string; kind: 'markdown' | 'asset' }[]
      }[]>
      readWorkspaceFile: (payload: { workspacePath: string; filePath: string }) => Promise<string>
      readWorkspaceFileDataUrl: (payload: { workspacePath: string; filePath: string }) => Promise<string>
      writeWorkspaceFile: (payload: { workspacePath: string; filePath: string; content: string }) => Promise<void>
      createWorkspaceFile: (payload: {
        workspacePath: string
        folderPath: string
        baseName?: string
      }) => Promise<string>
      createWorkspaceFolder: (payload: {
        workspacePath: string
        parentPath: string
        name?: string
      }) => Promise<string>
      deleteWorkspaceFile: (payload: { workspacePath: string; filePath: string }) => Promise<void>
      duplicateWorkspaceFile: (payload: {
        workspacePath: string
        sourcePath: string
        destinationFolderPath: string
      }) => Promise<string>
      revealInFinder: (path: string) => Promise<void>
      exportPdfFile: (payload: {
        title: string
        markdown: string
        sourcePath?: string
        options?: { includeSourcePath?: boolean; includeFileName?: boolean }
      }) => Promise<string>
      exportPdfFolder: (payload: {
        title: string
        documents: { title: string; markdown: string; sourcePath?: string }[]
        options?: { includeSourcePath?: boolean; includeFileName?: boolean }
      }) => Promise<string>
      exportPdfProject: (payload: {
        title: string
        documents: { title: string; markdown: string; sourcePath?: string }[]
        options?: { includeSourcePath?: boolean; includeFileName?: boolean }
      }) => Promise<string>
      loadTheme: () => Promise<{
        mode: 'light' | 'dark'
        colors: Record<string, string>
        mermaidTheme?: 'neutral' | 'dark'
      } | null>
    }
  }
}
