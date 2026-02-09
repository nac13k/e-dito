import { create } from 'zustand'

type WorkspaceState = {
  path: string | null
  setPath: (path: string | null) => void
  loadLastWorkspace: () => Promise<void>
  selectWorkspace: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  path: null,
  setPath: (path) => {
    set({ path })
    void window.api.setLastWorkspace(path)
  },
  loadLastWorkspace: async () => {
    const api = globalThis.window?.api
    if (!api?.getLastWorkspace) {
      return
    }

    const lastWorkspace = await api.getLastWorkspace()
    if (lastWorkspace) {
      set({ path: lastWorkspace })
    }
  },
  selectWorkspace: async () => {
    const api = globalThis.window?.api
    if (!api?.selectWorkspace) {
      console.error('[workspace] API de Electron no disponible. Ejecuta la app con `npm run dev`.')
      return
    }

    const result = await api.selectWorkspace()
    if (result) {
      set({ path: result })
      void api.setLastWorkspace(result)
    }
  },
}))
