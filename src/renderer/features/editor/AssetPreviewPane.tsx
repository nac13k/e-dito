type AssetPreviewPaneProps = {
  fileName: string
  fileId: string
  filePath: string
  imageDataUrl: string | null
}

export const AssetPreviewPane = ({
  fileName,
  fileId,
  filePath,
  imageDataUrl,
}: AssetPreviewPaneProps) => {
  const { t } = useTranslation()
  const markdownLink = `[${fileName}](./${fileId})`
  const markdownImage = `![${fileName}](./${fileId})`

  return (
    <section className="h-full overflow-y-auto border-l border-canvas-200 p-6" style={{ background: 'var(--editor-bg)' }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header>
          <p className="text-xs uppercase tracking-[0.22em] text-ink-400">{t('assetPreview.title')}</p>
          <h2 className="text-lg font-semibold text-ink-900">{fileName}</h2>
          <p className="mt-1 text-xs text-ink-500">{filePath}</p>
        </header>

        {imageDataUrl ? (
          <div className="rounded-2xl border border-canvas-200 bg-canvas-50 p-3">
            <img src={imageDataUrl} alt={fileName} className="max-h-[60vh] w-full rounded-lg object-contain" />
          </div>
        ) : (
          <div className="rounded-2xl border border-canvas-200 bg-canvas-50 px-4 py-5 text-sm text-ink-600">
            {t('assetPreview.unavailable')}
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-canvas-200 bg-canvas-50 p-3 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">{t('assetPreview.snippets')}</p>
          <code className="block rounded border border-canvas-200 bg-white/60 px-2 py-1">{markdownLink}</code>
          {imageDataUrl ? (
            <code className="block rounded border border-canvas-200 bg-white/60 px-2 py-1">{markdownImage}</code>
          ) : null}
        </div>
      </div>
    </section>
  )
}
import { useTranslation } from 'react-i18next'
