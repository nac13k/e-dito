import { FileDown, Files, FolderDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/button'

type ExportPanelProps = {
  status: string
  includeSourcePath: boolean
  includeFileName: boolean
  onToggleIncludeSourcePath: (nextValue: boolean) => void
  onToggleIncludeFileName: (nextValue: boolean) => void
  onExportFile: () => void
  onExportFolder: () => void
  onExportProject: () => void
}

export const ExportPanel = ({
  status,
  includeSourcePath,
  includeFileName,
  onToggleIncludeSourcePath,
  onToggleIncludeFileName,
  onExportFile,
  onExportFolder,
  onExportProject,
}: ExportPanelProps) => {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-canvas-200 bg-white/70 p-4 shadow-soft">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-ink-400">
          {t('exportPanel.title')}
        </p>
        <h2 className="text-lg font-semibold text-ink-900">{t('exportPanel.subtitle')}</h2>
      </header>
      <p className="text-sm text-ink-600">
        {t('exportPanel.description')}
      </p>
      <div className="rounded-2xl border border-canvas-200 bg-canvas-50 px-3 py-2 text-xs text-ink-600">
        <span className="text-ink-500">{t('exportPanel.status')}:</span>{' '}
        <span data-testid="export-status">{status}</span>
      </div>
      <div className="space-y-2 rounded-2xl border border-canvas-200 bg-canvas-50 px-3 py-3 text-xs text-ink-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeFileName}
            onChange={(event) => onToggleIncludeFileName(event.target.checked)}
            data-testid="export-option-filename"
          />
          {t('exportPanel.includeFileName')}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeSourcePath}
            onChange={(event) => onToggleIncludeSourcePath(event.target.checked)}
            data-testid="export-option-path"
          />
          {t('exportPanel.includePath')}
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <Button data-testid="export-file" onClick={onExportFile}>
          <FileDown size={16} />
          {t('exportPanel.exportFile')}
        </Button>
        <Button data-testid="export-folder" variant="outline" onClick={onExportFolder}>
          <Files size={16} />
          {t('exportPanel.exportFolder')}
        </Button>
        <Button data-testid="export-project" variant="ghost" onClick={onExportProject}>
          <FolderDown size={16} />
          {t('exportPanel.exportProject')}
        </Button>
      </div>
    </section>
  )
}
