import { GitBranch, GitCommit, GitPullRequest } from 'lucide-react'

import { Button } from '@/shared/ui/button'

type GitPanelProps = {
  status: string
  onSync: () => void
}

export const GitPanel = ({ status, onSync }: GitPanelProps) => {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-canvas-200 bg-white/70 p-4 shadow-soft">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Git</p>
        <h2 className="text-lg font-semibold text-ink-900">Estado</h2>
      </header>
      <div className="space-y-2 text-sm text-ink-700">
        <div className="flex items-center gap-2">
          <GitBranch size={14} />
          main · limpio
        </div>
        <div className="flex items-center gap-2">
          <GitCommit size={14} />
          0 cambios en staging
        </div>
        <div className="flex items-center gap-2 text-ink-600">
          <span data-testid="git-status">{status}</span>
        </div>
      </div>
      <Button size="sm" data-testid="git-sync" onClick={onSync}>
        <GitPullRequest size={14} />
        Sincronizar
      </Button>
    </section>
  )
}
