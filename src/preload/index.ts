import { contextBridge, ipcRenderer } from 'electron'

const api = {
  ping: () => ipcRenderer.invoke('app:ping') as Promise<string>,
  selectWorkspace: () =>
    ipcRenderer.invoke('workspace:select') as Promise<string | null>,
  revealInFinder: (path: string) =>
    ipcRenderer.invoke('workspace:reveal', path) as Promise<void>,
  exportPdf: (payload: { title: string; markdown: string }) =>
    ipcRenderer.invoke('export:pdf', payload) as Promise<string>,
  loadTheme: () => ipcRenderer.invoke('theme:load') as Promise<{
    mode: 'light' | 'dark'
    colors: Record<string, string>
    mermaidTheme?: 'neutral' | 'dark'
  } | null>,
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
