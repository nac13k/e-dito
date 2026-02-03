import { FolderOpen } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { useWorkspaceStore } from './store'

export const WorkspaceSwitcher = () => {
  const path = useWorkspaceStore((state) => state.path)
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-ink-500">Workspace</div>
      <div
        className="rounded-full bg-canvas-100 px-3 py-1 text-sm text-ink-800 shadow-soft"
        data-testid="workspace-path"
      >
        {path ?? 'Sin proyecto abierto'}
      </div>
      <Button
        variant="outline"
        size="sm"
        data-testid="workspace-open"
        onClick={() => void selectWorkspace()}
      >
        <FolderOpen size={16} />
        Abrir
      </Button>
    </div>
  )
}
