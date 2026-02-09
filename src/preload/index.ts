import { contextBridge, ipcRenderer } from 'electron'

type WorkspaceTreeFile = {
  id: string
  name: string
  path: string
  kind: 'markdown' | 'asset'
}

type WorkspaceTreeFolder = {
  id: string
  name: string
  path: string
  files: WorkspaceTreeFile[]
}

type ExportMarkdownDocument = {
  title: string
  markdown: string
  sourcePath?: string
}

type ExportOptions = {
  includeSourcePath: boolean
  includeFileName: boolean
}

const toSerializable = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const api = {
  ping: () => ipcRenderer.invoke('app:ping') as Promise<string>,
  getLastWorkspace: () => ipcRenderer.invoke('workspace:last:get') as Promise<string | null>,
  setLastWorkspace: (workspacePath: string | null) =>
    ipcRenderer.invoke('workspace:last:set', workspacePath) as Promise<void>,
  selectWorkspace: () =>
    ipcRenderer.invoke('workspace:select') as Promise<string | null>,
  readWorkspaceTree: (workspacePath: string) =>
    ipcRenderer.invoke('workspace:tree', workspacePath) as Promise<WorkspaceTreeFolder[]>,
  readWorkspaceFile: (payload: { workspacePath: string; filePath: string }) =>
    ipcRenderer.invoke('workspace:file:read', payload) as Promise<string>,
  readWorkspaceFileDataUrl: (payload: { workspacePath: string; filePath: string }) =>
    ipcRenderer.invoke('workspace:file:read-data-url', payload) as Promise<string>,
  writeWorkspaceFile: (payload: { workspacePath: string; filePath: string; content: string }) =>
    ipcRenderer.invoke('workspace:file:write', payload) as Promise<void>,
  createWorkspaceFile: (payload: { workspacePath: string; folderPath: string; baseName?: string }) =>
    ipcRenderer.invoke('workspace:file:create', payload) as Promise<string>,
  createWorkspaceFolder: (payload: { workspacePath: string; parentPath: string; name?: string }) =>
    ipcRenderer.invoke('workspace:folder:create', payload) as Promise<string>,
  deleteWorkspaceFile: (payload: { workspacePath: string; filePath: string }) =>
    ipcRenderer.invoke('workspace:file:delete', payload) as Promise<void>,
  duplicateWorkspaceFile: (payload: {
    workspacePath: string
    sourcePath: string
    destinationFolderPath: string
  }) => ipcRenderer.invoke('workspace:file:duplicate', payload) as Promise<string>,
  revealInFinder: (path: string) =>
    ipcRenderer.invoke('workspace:reveal', path) as Promise<void>,
  exportPdfFile: (payload: {
    title: string
    markdown: string
    sourcePath?: string
    options?: Partial<ExportOptions>
  }) =>
    ipcRenderer.invoke('export:pdf', toSerializable(payload)) as Promise<string>,
  exportPdfFolder: (payload: {
    title: string
    documents: ExportMarkdownDocument[]
    options?: Partial<ExportOptions>
  }) =>
    ipcRenderer.invoke('export:pdf-folder', toSerializable(payload)) as Promise<string>,
  exportPdfProject: (payload: {
    title: string
    documents: ExportMarkdownDocument[]
    options?: Partial<ExportOptions>
  }) =>
    ipcRenderer.invoke('export:pdf-project', toSerializable(payload)) as Promise<string>,
  loadTheme: () => ipcRenderer.invoke('theme:load') as Promise<{
    mode: 'light' | 'dark'
    colors: Record<string, string>
    mermaidTheme?: 'neutral' | 'dark'
  } | null>,
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
