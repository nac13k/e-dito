import {
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileText,
  FileType2,
  FileVideo,
  Folder,
  FolderOpen,
  FolderPlus,
  Search,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'

export type ExplorerFile = {
  id: string
  name: string
  kind: 'markdown' | 'asset'
}

export type ExplorerFolder = {
  id: string
  name: string
  parentId: string | null
  depth: number
  files: ExplorerFile[]
}

type ExplorerSidebarProps = {
  workspacePath: string | null
  folders: ExplorerFolder[]
  activeFileId: string | null
  onSelectFile: (id: string) => void
  onCreateDoc: (folderId?: string) => void
  onCreateFolder: () => void
  onDeleteFile: (fileId: string) => void
  onCopyFile: (fileId: string) => void
  onPasteFile: (folderId?: string) => void
  onRevealInFinder: (fileId?: string) => void
}

export const ExplorerSidebar = ({
  workspacePath,
  folders,
  activeFileId,
  onSelectFile,
  onCreateDoc,
  onCreateFolder,
  onDeleteFile,
  onCopyFile,
  onPasteFile,
  onRevealInFinder,
}: ExplorerSidebarProps) => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; target: string | null }>(
    { open: false, x: 0, y: 0, target: null }
  )
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredFolders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return folders
    }

    return folders
      .map((folder) => ({
        ...folder,
        files: folder.files.filter((file) => file.name.toLowerCase().includes(normalized)),
      }))
      .filter((folder) => folder.files.length > 0)
  }, [folders, query])

  useEffect(() => {
    if (!searchOpen) {
      return
    }
    searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!menu.open) {
      return
    }

    const handler = () => setMenu((current) => ({ ...current, open: false }))
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [menu.open])

  const openMenu = (event: MouseEvent, target: string | null) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ open: true, x: event.clientX, y: event.clientY, target })
  }

  const findFolderId = (fileId: string | null) => {
    if (!fileId) {
      return undefined
    }
    return folders.find((folder) => folder.files.some((file) => file.id === fileId))?.id
  }

  const handleCreateDoc = () => {
    onCreateDoc(findFolderId(menu.target))
    setMenu((current) => ({ ...current, open: false }))
  }

  const handleCreateFolder = () => {
    onCreateFolder()
    setMenu((current) => ({ ...current, open: false }))
  }

  const handleDelete = () => {
    if (menu.target) {
      onDeleteFile(menu.target)
    }
    setMenu((current) => ({ ...current, open: false }))
  }

  const handleCopy = () => {
    if (menu.target) {
      onCopyFile(menu.target)
    }
    setMenu((current) => ({ ...current, open: false }))
  }

  const handlePaste = () => {
    onPasteFile(findFolderId(menu.target))
    setMenu((current) => ({ ...current, open: false }))
  }

  const handleReveal = () => {
    onRevealInFinder(menu.target ?? undefined)
    setMenu((current) => ({ ...current, open: false }))
  }

  const handleSearch = () => {
    setSearchOpen(true)
    setMenu((current) => ({ ...current, open: false }))
  }

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((current) => ({
      ...current,
      [folderId]: !current[folderId],
    }))
  }

  const foldersById = useMemo(
    () => filteredFolders.reduce<Record<string, ExplorerFolder>>((acc, folder) => {
      acc[folder.id] = folder
      return acc
    }, {}),
    [filteredFolders]
  )

  const visibleFolders = useMemo(() => {
    return filteredFolders.filter((folder) => {
      let parentId = folder.parentId
      while (parentId) {
        if (collapsedFolders[parentId]) {
          return false
        }
        parentId = foldersById[parentId]?.parentId ?? null
      }
      return true
    })
  }, [collapsedFolders, filteredFolders, foldersById])

  const getFileVisual = (file: ExplorerFile): { Icon: LucideIcon; colorClass: string } => {
    if (file.kind === 'markdown') {
      return { Icon: FileText, colorClass: 'text-sky-500' }
    }

    const name = file.name.toLowerCase()
    if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/.test(name)) {
      return { Icon: FileImage, colorClass: 'text-emerald-500' }
    }
    if (/\.(mp4|mov|mkv|webm|avi|m4v)$/.test(name)) {
      return { Icon: FileVideo, colorClass: 'text-violet-500' }
    }
    if (/\.(mp3|wav|ogg|m4a|flac)$/.test(name)) {
      return { Icon: FileAudio, colorClass: 'text-amber-500' }
    }
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) {
      return { Icon: FileArchive, colorClass: 'text-rose-500' }
    }
    if (/\.(json|ya?ml|toml|xml|html?|css|js|ts|tsx|jsx)$/.test(name)) {
      return { Icon: FileCode2, colorClass: 'text-cyan-500' }
    }
    return { Icon: FileType2, colorClass: 'text-slate-500' }
  }

  const toAbsolutePath = (relativePath: string) => {
    if (!workspacePath) {
      return relativePath
    }

    if (relativePath === '.' || relativePath.length === 0) {
      return workspacePath
    }

    if (workspacePath.includes('\\')) {
      return `${workspacePath}\\${relativePath.split('/').join('\\')}`
    }

    return `${workspacePath}/${relativePath}`
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col gap-3 overflow-hidden border-r border-canvas-200 p-4"
      style={{ background: 'var(--sidebar)' }}
      onContextMenu={(event) => openMenu(event, null)}
    >
      <header className="flex justify-end">
        <button
          className="rounded-full bg-canvas-100 p-2 text-ink-600"
          type="button"
          aria-label={t('explorer.searchAria')}
          onClick={() => setSearchOpen((current) => !current)}
        >
          <Search size={16} />
        </button>
      </header>
      {searchOpen ? (
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('explorer.searchPlaceholder')}
          className="w-full rounded-xl border border-canvas-200 bg-white px-3 py-2 text-xs text-ink-700 shadow-soft focus:outline-none"
          type="text"
        />
      ) : null}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
        {visibleFolders.map((folder) => {
          const folderIndent = Math.max(8, folder.depth * 14)
          const fileIndent = folderIndent + 24

          return (
            <div key={folder.id} className="space-y-2">
              <button
                className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-ink-800 hover:bg-canvas-100"
              type="button"
              onClick={() => toggleFolder(folder.id)}
              data-testid={`folder-toggle-${folder.id}`}
              title={toAbsolutePath(folder.id)}
              style={{ paddingLeft: `${folderIndent}px` }}
            >
                {collapsedFolders[folder.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <Folder size={16} />
                {folder.name}/
              </button>
              {!collapsedFolders[folder.id] ? (
                <div
                  className="space-y-1 border-l border-canvas-200/70"
                  data-testid={`folder-files-${folder.id}`}
                  style={{
                    marginLeft: `${folderIndent + 10}px`,
                    paddingLeft: `${Math.max(10, fileIndent - folderIndent - 10)}px`,
                  }}
                >
                  {folder.files.map((file) => {
                    const { Icon, colorClass } = getFileVisual(file)
                    return (
                      <button
                        key={file.id}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-ink-700 hover:bg-canvas-100 ${
                          activeFileId === file.id ? 'bg-canvas-100 text-ink-900' : ''
                        }`}
                        onClick={() => onSelectFile(file.id)}
                        onContextMenu={(event) => openMenu(event, file.id)}
                        type="button"
                        data-testid={`file-${file.id}`}
                        title={toAbsolutePath(file.id)}
                      >
                        <Icon size={14} className={colorClass} />
                        {file.name}
                        {file.kind === 'asset' ? (
                          <span className="ml-auto rounded bg-canvas-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-500">
                            {t('explorer.assetTag')}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {menu.open ? (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0"
            type="button"
            aria-label={t('explorer.closeMenu')}
            onClick={() => setMenu((current) => ({ ...current, open: false }))}
          />
          <div
            className="absolute min-w-[220px] rounded-2xl border border-canvas-200 bg-white p-2 text-xs text-ink-700 shadow-soft"
            style={{ top: menu.y, left: menu.x }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleCreateDoc}
            >
              <FileText size={14} />
              {t('explorer.newDocument')}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleReveal}
            >
              <FolderOpen size={14} />
              {t('explorer.revealInFinder')}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleCreateFolder}
            >
              <FolderPlus size={14} />
              {t('explorer.createFolder')}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleDelete}
              disabled={!menu.target}
            >
              <Trash2 size={14} />
              {t('explorer.delete')}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleCopy}
              disabled={!menu.target}
            >
              <Copy size={14} />
              {t('explorer.copy')}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handlePaste}
            >
              <ClipboardPaste size={14} />
              {t('explorer.paste')}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleSearch}
            >
              <Search size={14} />
              {t('explorer.search')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
