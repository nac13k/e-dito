import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/button'
import { useWorkspaceStore } from './store'

export const WorkspaceSwitcher = () => {
  const { t } = useTranslation()
  const path = useWorkspaceStore((state) => state.path)
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const workspaceName = path
    ? path.split('/').filter(Boolean).pop() ?? path.split('\\').filter(Boolean).pop() ?? path
    : null

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-ink-500">{t('workspace.label')}</div>
      <button
        type="button"
        className="rounded-full bg-canvas-100 px-3 py-1 text-sm text-ink-800 shadow-soft"
        data-testid="workspace-path"
        title={path ?? t('workspace.noWorkspace')}
        onClick={() => {
          if (!path) {
            return
          }
          void window.api.revealInFinder(path)
        }}
      >
        {workspaceName ?? t('workspace.noWorkspace')}
      </button>
      <Button
        variant="outline"
        size="sm"
        data-testid="workspace-open"
        onClick={() => void selectWorkspace()}
      >
        <FolderOpen size={16} />
        {t('common.open')}
      </Button>
    </div>
  )
}
