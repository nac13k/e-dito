import { FileDown, Files, FolderDown } from 'lucide-react'

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
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-canvas-200 bg-white/70 p-4 shadow-soft">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-ink-400">
          Export
        </p>
        <h2 className="text-lg font-semibold text-ink-900">PDF Autocontenido</h2>
      </header>
      <p className="text-sm text-ink-600">
        Incluye estilos, imagenes y Mermaid listos para compartir.
      </p>
      <div className="rounded-2xl border border-canvas-200 bg-canvas-50 px-3 py-2 text-xs text-ink-600">
        <span className="text-ink-500">Estado:</span>{' '}
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
          Incluir nombre de archivo
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeSourcePath}
            onChange={(event) => onToggleIncludeSourcePath(event.target.checked)}
            data-testid="export-option-path"
          />
          Incluir path del archivo
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <Button data-testid="export-file" onClick={onExportFile}>
          <FileDown size={16} />
          Exportar archivo
        </Button>
        <Button data-testid="export-folder" variant="outline" onClick={onExportFolder}>
          <Files size={16} />
          Exportar carpeta
        </Button>
        <Button data-testid="export-project" variant="ghost" onClick={onExportProject}>
          <FolderDown size={16} />
          Exportar proyecto
        </Button>
      </div>
    </section>
  )
}
