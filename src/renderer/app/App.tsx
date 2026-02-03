import { Sparkles } from 'lucide-react'
import MarkdownIt from 'markdown-it'
import { useEffect, useMemo, useRef, useState } from 'react'

import { EditorPane } from '@/features/editor/EditorPane'
import { ExportPanel } from '@/features/export/ExportPanel'
import { ExplorerSidebar, type ExplorerFolder } from '@/features/explorer/ExplorerSidebar'
import { GitPanel } from '@/features/git/GitPanel'
import { PreviewPane } from '@/features/preview/PreviewPane'
import { WorkspaceSwitcher } from '@/features/workspace/WorkspaceSwitcher'
import { useWorkspaceStore } from '@/features/workspace/store'
import { Button } from '@/shared/ui/button'

import { CommandPalette } from './CommandPalette'
import { AppShell } from './AppShell'

const App = () => {
  const [docCount, setDocCount] = useState(0)
  const [markdown, setMarkdown] = useState('# Nuevo documento')
  const [activeFileId, setActiveFileId] = useState<string | null>('overview')
  const [files, setFiles] = useState<Record<string, string>>({
    overview: '# Overview\n\nNotas iniciales',
    diagrams: '```mermaid\nflowchart LR\n  A-->B\n```',
    notes: '# Notes\n\nIdeas sueltas',
  })
  const [folders, setFolders] = useState<ExplorerFolder[]>([
    {
      id: 'docs',
      name: 'docs',
      files: [
        { id: 'overview', name: 'overview.md' },
        { id: 'diagrams', name: 'diagrams.md' },
      ],
    },
    {
      id: 'research',
      name: 'research',
      files: [{ id: 'notes', name: 'notes.md' }],
    },
  ])
  const [exportStatus, setExportStatus] = useState('Sin exportaciones')
  const [gitSyncCount, setGitSyncCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'git' | 'export' | null>(null)
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor')
  const [commandOpen, setCommandOpen] = useState(false)
  const [scrollRatio, setScrollRatio] = useState(0)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [themeColors, setThemeColors] = useState<Record<string, string>>({})
  const [mermaidTheme, setMermaidTheme] = useState<'neutral' | 'dark'>('neutral')
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const workspacePath = useWorkspaceStore((state) => state.path)
  const [clipboard, setClipboard] = useState<{ name: string; content: string } | null>(null)

  const markdownIt = useMemo(() => {
    const instance = new MarkdownIt({ html: false, linkify: true })
    const defaultFence = instance.renderer.rules.fence

    instance.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const info = token.info.trim().toLowerCase()

      if (info === 'mermaid') {
        return `<div class="mermaid">${token.content}</div>`
      }

      if (defaultFence) {
        return defaultFence(tokens, idx, options, env, self)
      }

      return self.renderToken(tokens, idx, options)
    }

    return instance
  }, [])
  const previewHtml = useMemo(() => {
    const html = markdownIt.render(markdown)
    return html
  }, [markdown, markdownIt])

  const gitStatus = useMemo(() => {
    if (gitSyncCount === 0) {
      return 'Listo para sincronizar'
    }

    return 'Sincronizado'
  }, [gitSyncCount])

  const findFolderByFile = (fileId: string | null) => {
    if (!fileId) {
      return null
    }

    return folders.find((folder) => folder.files.some((file) => file.id === fileId)) ?? null
  }

  const createDoc = (folderId?: string) => {
    const nextCount = docCount + 1
    const id = `doc-${Date.now()}`
    const name = `doc-${nextCount}.md`
    const targetFolder =
      folderId ?? findFolderByFile(activeFileId)?.id ?? folders[0]?.id ?? null

    setDocCount(nextCount)
    setFiles((current) => ({ ...current, [id]: '# Nuevo documento' }))
    setFolders((current) => {
      if (!targetFolder) {
        return current
      }
      return current.map((folder) =>
        folder.id === targetFolder
          ? { ...folder, files: [...folder.files, { id, name }] }
          : folder
      )
    })
    setActiveFileId(id)
    setMarkdown('# Nuevo documento')
    setViewMode('editor')
  }

  const handleSelectFile = (id: string) => {
    setActiveFileId(id)
    setMarkdown(files[id] ?? '')
    setViewMode('editor')
  }

  const handleExportFile = async () => {
    if (window.api?.exportPdf) {
      const response = await window.api.exportPdf({
        title: 'Documento',
        markdown,
      })
      setExportStatus(response)
      return
    }

    setExportStatus('PDF exportado')
  }

  const handleExportFolder = () => {
    setExportStatus('Carpeta exportada')
  }

  const handleSync = () => {
    setGitSyncCount((current) => current + 1)
  }

  const openTool = (tool: 'git' | 'export') => {
    setActiveTool(tool)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const toggleView = () => {
    setViewMode((current) => (current === 'editor' ? 'preview' : 'editor'))
  }

  const applyTheme = (
    nextTheme: 'light' | 'dark',
    colors: Record<string, string>,
    mermaid: 'neutral' | 'dark'
  ) => {
    const root = document.documentElement
    root.dataset.theme = nextTheme
    root.dataset.mermaidTheme = mermaid
    root.style.setProperty('--canvas', colors.canvas)
    root.style.setProperty('--ink', colors.ink)
    root.style.setProperty('--accent', colors.accent)
    root.style.setProperty('--sidebar', colors.sidebar)
    root.style.setProperty('--editor-bg', colors.editorBg)
    root.style.setProperty('--preview-bg', colors.previewBg)
    root.style.setProperty('--border', colors.border)
    root.style.setProperty('--status-bg', colors.statusBg)
    root.style.setProperty('--status-text', colors.statusText)
    root.style.setProperty('--markdown-bg', colors.markdownBg)
    root.style.setProperty('--markdown-text', colors.markdownText)
  }

  useEffect(() => {
    const base =
      theme === 'dark'
        ? {
            canvas: '#0f1114',
            ink: '#e7eaee',
            accent: '#8fb3c9',
            sidebar: '#11151a',
            editorBg: '#0f1114',
            previewBg: '#0f1114',
            border: '#1f252c',
            statusBg: 'rgba(15, 17, 20, 0.9)',
            statusText: '#9aa7b2',
            markdownBg: 'transparent',
            markdownText: '#e7eaee',
          }
        : {
            canvas: '#ffffff',
            ink: '#14181c',
            accent: '#5e7288',
            sidebar: '#ffffff',
            editorBg: '#ffffff',
            previewBg: '#ffffff',
            border: '#e2e8f0',
            statusBg: 'rgba(255, 255, 255, 0.95)',
            statusText: '#5e7288',
            markdownBg: 'transparent',
            markdownText: '#14181c',
          }

    const merged = { ...base, ...themeColors }
    const mermaid = mermaidTheme ?? (theme === 'dark' ? 'dark' : 'neutral')
    applyTheme(theme, merged, mermaid)
  }, [theme, themeColors, mermaidTheme])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && commandOpen) {
        event.preventDefault()
        setCommandOpen(false)
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandOpen])

  useEffect(() => {
    if (viewMode === 'preview') {
      const preview = previewRef.current
      if (!preview) {
        return
      }
      const maxPreview = preview.scrollHeight - preview.clientHeight
      preview.scrollTop = maxPreview * scrollRatio
      return
    }

    const editor = editorRef.current
    if (!editor) {
      return
    }
    const maxEditor = editor.scrollHeight - editor.clientHeight
    editor.scrollTop = maxEditor * scrollRatio
  }, [viewMode, scrollRatio])

  const handleEditorScroll = (scrollTop: number) => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const maxEditor = editor.scrollHeight - editor.clientHeight
    setScrollRatio(maxEditor > 0 ? scrollTop / maxEditor : 0)
  }

  const handlePreviewScroll = (scrollTop: number) => {
    const preview = previewRef.current
    if (!preview) {
      return
    }

    const maxPreview = preview.scrollHeight - preview.clientHeight
    setScrollRatio(maxPreview > 0 ? scrollTop / maxPreview : 0)
  }

  const commands = [
    {
      id: 'toggle-view',
      label: viewMode === 'editor' ? 'Cambiar a Preview' : 'Cambiar a Editor',
      category: 'Editor',
      aliases: ['preview', 'vista', 'editor'],
      onRun: toggleView,
    },
    {
      id: 'theme-light',
      label: 'Tema Claro',
      category: 'Apariencia',
      aliases: ['light', 'claro', 'tema'],
      onRun: () => setTheme('light'),
    },
    {
      id: 'theme-dark',
      label: 'Tema Oscuro',
      category: 'Apariencia',
      aliases: ['dark', 'oscuro', 'tema'],
      onRun: () => {
        setTheme('dark')
        setMermaidTheme('dark')
      },
    },
    {
      id: 'theme-load',
      label: 'Cargar tema JSON',
      category: 'Apariencia',
      aliases: ['json', 'tema', 'colores'],
      onRun: async () => {
        const loaded = await window.api?.loadTheme?.()
        if (!loaded) {
          return
        }
        setTheme(loaded.mode)
        setThemeColors(loaded.colors)
        setMermaidTheme(loaded.mermaidTheme ?? (loaded.mode === 'dark' ? 'dark' : 'neutral'))
      },
    },
    {
      id: 'open-workspace',
      label: 'Abrir workspace',
      category: 'Workspace',
      aliases: ['proyecto', 'abrir carpeta', 'workspace'],
      onRun: () => void selectWorkspace(),
    },
    {
      id: 'new-doc',
      label: 'Nuevo documento',
      category: 'Editor',
      aliases: ['nuevo archivo', 'documento'],
      onRun: () => createDoc(),
    },
    {
      id: 'open-git',
      label: 'Abrir Git',
      category: 'Git',
      aliases: ['git panel', 'repositorio'],
      onRun: () => openTool('git'),
    },
    {
      id: 'open-export',
      label: 'Abrir Export',
      category: 'Export',
      aliases: ['exportar', 'pdf', 'export panel'],
      onRun: () => openTool('export'),
    },
    {
      id: 'sync-git',
      label: 'Sincronizar Git',
      category: 'Git',
      aliases: ['sync', 'push', 'pull'],
      onRun: handleSync,
    },
    {
      id: 'export-pdf',
      label: 'Exportar PDF',
      category: 'Export',
      aliases: ['pdf', 'exportar documento'],
      onRun: () => void handleExportFile(),
    },
  ]

  return (
    <>
      <AppShell
      header={
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-ink-400">
              Epica 01
            </p>
            <h1 className="font-serif text-2xl text-ink-900">
              Meridian Notes
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-full bg-canvas-100 px-3 py-1 text-xs text-ink-600">
              Documentos:{' '}
              <span data-testid="doc-count" className="font-semibold text-ink-800">
                {docCount}
              </span>
            </div>
            <WorkspaceSwitcher />
            <Button size="sm" data-testid="new-doc" onClick={() => createDoc()}>
              <Sparkles size={14} />
              Nuevo documento
            </Button>
          </div>
        </>
      }
      leftRail={
          <ExplorerSidebar
            folders={folders}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateDoc={(folderId) => createDoc(folderId)}
            onCreateFolder={() => {
              const nextIndex = folders.length + 1
              const id = `folder-${Date.now()}`
              setFolders((current) => [
                ...current,
                { id, name: `carpeta-${nextIndex}`, files: [] },
              ])
            }}
            onDeleteFile={(fileId) => {
              const remaining = folders
                .flatMap((folder) => folder.files)
                .filter((file) => file.id !== fileId)
              const nextActive = remaining[0]?.id ?? null

              setFolders((current) =>
                current.map((folder) => ({
                  ...folder,
                  files: folder.files.filter((file) => file.id !== fileId),
                }))
              )
              setFiles((current) => {
                const updated = { ...current }
                delete updated[fileId]
                return updated
              })
              setActiveFileId(nextActive)
              setMarkdown(nextActive ? files[nextActive] ?? '' : '')
            }}
            onCopyFile={(fileId) => {
              const fileName = folders
                .flatMap((folder) => folder.files)
                .find((file) => file.id === fileId)?.name
              if (!fileName) {
                return
              }
              setClipboard({ name: fileName, content: files[fileId] ?? '' })
            }}
            onPasteFile={(folderId) => {
              if (!clipboard) {
                return
              }
              const baseName = clipboard.name.replace(/\.md$/, '')
              const id = `doc-${Date.now()}`
              const name = `${baseName}-copia.md`
              const targetFolder =
                folderId ?? findFolderByFile(activeFileId)?.id ?? folders[0]?.id ?? null

              setFiles((current) => ({ ...current, [id]: clipboard.content }))
              setFolders((current) => {
                if (!targetFolder) {
                  return current
                }
                return current.map((folder) =>
                  folder.id === targetFolder
                    ? { ...folder, files: [...folder.files, { id, name }] }
                    : folder
                )
              })
            }}
            onRevealInFinder={(fileId) => {
              const fileName = fileId
                ? folders
                    .flatMap((folder) => folder.files)
                    .find((file) => file.id === fileId)?.name
                : null
              const basePath = workspacePath ?? '/workspace'
              const target = fileName ? `${basePath}/${fileName}` : basePath
              void window.api?.revealInFinder?.(target)
            }}
          />
      }
      main={
        viewMode === 'editor' ? (
          <EditorPane
            value={markdown}
            onChange={(value) => {
              setMarkdown(value)
              if (activeFileId) {
                setFiles((current) => ({ ...current, [activeFileId]: value }))
              }
            }}
            onScroll={handleEditorScroll}
            editorRef={editorRef}
          />
        ) : (
          <PreviewPane
            html={previewHtml}
            onScroll={handlePreviewScroll}
            previewRef={previewRef}
          />
        )
      }
      drawer={
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">
                Herramientas
              </p>
              <h2 className="text-lg font-semibold text-ink-900">
                {activeTool === 'git' ? 'Git' : 'Export'}
              </h2>
            </div>
            <button
              className="rounded-full border border-canvas-200 px-3 py-1 text-xs text-ink-600"
              onClick={closeDrawer}
              type="button"
            >
              Cerrar
            </button>
          </div>
          {activeTool === 'git' ? (
            <GitPanel status={gitStatus} onSync={handleSync} />
          ) : (
            <ExportPanel
              status={exportStatus}
              onExportFile={handleExportFile}
              onExportFolder={handleExportFolder}
            />
          )}
        </div>
      }
      drawerOpen={drawerOpen}
      onCloseDrawer={closeDrawer}
      statusBar={
        <>
          <div className="flex items-center gap-3 text-xs text-ink-600">
            <span className="rounded-full bg-canvas-100 px-3 py-1">main · limpio</span>
            <span data-testid="git-status">{gitStatus}</span>
            <span className="text-ink-400">Cmd/Ctrl + P</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-canvas-200 px-3 py-1 text-xs text-ink-600 hover:border-ink-400"
              onClick={() => openTool('git')}
              type="button"
              aria-label="Abrir Git"
              data-testid="tool-git"
            >
              Git
            </button>
            <button
              className="rounded-full border border-canvas-200 px-3 py-1 text-xs text-ink-600 hover:border-ink-400"
              onClick={() => openTool('export')}
              type="button"
              aria-label="Abrir Export"
              data-testid="tool-export"
            >
              Export
            </button>
          </div>
        </>
      }
    />
      <CommandPalette
        open={commandOpen}
        actions={commands}
        onClose={() => setCommandOpen(false)}
      />
    </>
  )
}

export default App
