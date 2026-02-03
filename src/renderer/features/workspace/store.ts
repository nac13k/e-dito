import { create } from 'zustand'

type WorkspaceState = {
  path: string | null
  setPath: (path: string | null) => void
  selectWorkspace: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  path: null,
  setPath: (path) => set({ path }),
  selectWorkspace: async () => {
    if (!window.api?.selectWorkspace) {
      set({ path: '/demo/workspace' })
      return
    }

    const result = await window.api.selectWorkspace()
    if (result) {
      set({ path: result })
      return
    }

    set({ path: '/demo/workspace' })
  },
}))
