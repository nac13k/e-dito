import { ClipboardPaste, Copy, FileText, Folder, FolderOpen, FolderPlus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

export type ExplorerFile = {
  id: string
  name: string
}

export type ExplorerFolder = {
  id: string
  name: string
  files: ExplorerFile[]
}

type ExplorerSidebarProps = {
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
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; target: string | null }>(
    { open: false, x: 0, y: 0, target: null }
  )
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

  return (
    <section
      className="flex h-full flex-col gap-3 border-r border-canvas-200 p-4"
      style={{ background: 'var(--sidebar)' }}
      onContextMenu={(event) => openMenu(event, activeFileId)}
    >
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-ink-400">
            Explorer
          </p>
          <h2 className="text-lg font-semibold text-ink-900">Proyecto</h2>
        </div>
        <button
          className="rounded-full bg-canvas-100 p-2 text-ink-600"
          type="button"
          aria-label="Buscar en el explorador"
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
          placeholder="Buscar archivos..."
          className="w-full rounded-xl border border-canvas-200 bg-white px-3 py-2 text-xs text-ink-700 shadow-soft focus:outline-none"
          type="text"
        />
      ) : null}
      <div className="space-y-3 text-sm">
        {filteredFolders.map((folder) => (
          <div key={folder.id} className="space-y-2">
            <div className="flex items-center gap-2 text-ink-800">
              <Folder size={16} />
              {folder.name}/
            </div>
            <div className="space-y-1 pl-4">
              {folder.files.map((file) => (
                <button
                  key={file.id}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-ink-700 hover:bg-canvas-100 ${
                    activeFileId === file.id ? 'bg-canvas-100 text-ink-900' : ''
                  }`}
                  onClick={() => onSelectFile(file.id)}
                  onContextMenu={(event) => openMenu(event, file.id)}
                  type="button"
                  data-testid={`file-${file.id}`}
                >
                  <FileText size={14} />
                  {file.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {menu.open ? (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0"
            type="button"
            aria-label="Cerrar menu"
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
              Nuevo documento
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleReveal}
            >
              <FolderOpen size={14} />
              Reveal in Finder
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleCreateFolder}
            >
              <FolderPlus size={14} />
              Crear carpeta
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleDelete}
              disabled={!menu.target}
            >
              <Trash2 size={14} />
              Eliminar
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleCopy}
              disabled={!menu.target}
            >
              <Copy size={14} />
              Copiar
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handlePaste}
            >
              <ClipboardPaste size={14} />
              Pegar
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-canvas-100"
              type="button"
              onClick={handleSearch}
            >
              <Search size={14} />
              Buscar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
