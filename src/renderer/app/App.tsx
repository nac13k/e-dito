import MarkdownIt from 'markdown-it'
import * as markdownItEmoji from 'markdown-it-emoji'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EditorPane } from '@/features/editor/EditorPane'
import { AssetPreviewPane } from '@/features/editor/AssetPreviewPane'
import { ExportPanel } from '@/features/export/ExportPanel'
import { ExplorerSidebar, type ExplorerFolder } from '@/features/explorer/ExplorerSidebar'
import { GitPanel } from '@/features/git/GitPanel'
import { PreviewPane } from '@/features/preview/PreviewPane'
import { WorkspaceSwitcher } from '@/features/workspace/WorkspaceSwitcher'
import { useWorkspaceStore } from '@/features/workspace/store'
import { Button } from '@/shared/ui/button'

import { CommandPalette } from './CommandPalette'
import { AppShell } from './AppShell'

const normalizeMarkdownInput = (source: string) =>
  source
    .split('\n')
    .map((line) => {
      if (/^\s*[-*_]{3,}\s*$/.test(line)) {
        return line
      }

      if (/^(#{1,6})([^\s#].+)$/.test(line)) {
        return line.replace(/^(#{1,6})([^\s#].+)$/, '$1 $2')
      }

      if (/^(\s*[-*+])([^\s*+-].+)$/.test(line)) {
        return line.replace(/^(\s*[-*+])([^\s].+)$/, '$1 $2')
      }

      if (/^(\s*\d+\.)([^\s].+)$/.test(line)) {
        return line.replace(/^(\s*\d+\.)([^\s].+)$/, '$1 $2')
      }

      return line
    })
    .join('\n')

const withTaskCheckboxes = (html: string) => {
  let taskIndex = 0
  return html.replace(/<li>\s*\[([ xX])\]\s+/g, (_full, marker: string) => (
    `<li><input type="checkbox" data-task-index="${taskIndex++}"${marker.toLowerCase() === 'x' ? ' checked' : ''} /> `
  ))
}

const toDisplayName = (fileName: string) => fileName.replace(/\.(md|markdown|mdx|txt)$/i, '')
const isExternalHref = (href: string) => /^(https?:|mailto:|tel:|data:|file:)/i.test(href)
const resolvePreviewHref = (href: string, sourcePath?: string) => {
  if (!href || href.startsWith('#') || isExternalHref(href) || !sourcePath) {
    return href
  }

  try {
    const normalizedSource = sourcePath.replace(/\\/g, '/')
    const baseUrl = normalizedSource.startsWith('/')
      ? `file://${normalizedSource}`
      : `file:///${normalizedSource}`
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

const rewriteLocalImagesForPreview = async (
  markdownSource: string,
  workspacePath: string,
  sourcePath?: string,
) => {
  if (!sourcePath) {
    return markdownSource
  }

  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g
  const matches = Array.from(markdownSource.matchAll(pattern))
  let updated = markdownSource

  for (const match of matches) {
    const rawTarget = match[2].trim().replace(/^<|>$/g, '')
    const href = rawTarget.split(/\s+/)[0]
    if (!href || href.startsWith('#') || isExternalHref(href)) {
      continue
    }

    const normalizedSource = sourcePath.replace(/\\/g, '/')
    const baseUrl = normalizedSource.startsWith('/')
      ? `file://${normalizedSource}`
      : `file:///${normalizedSource}`

    try {
      const absolutePath = new URL(href, baseUrl).pathname
      const dataUrl = await window.api.readWorkspaceFileDataUrl({
        workspacePath,
        filePath: decodeURIComponent(absolutePath),
      })
      updated = updated.replace(match[0], `![${match[1]}](${dataUrl})`)
    } catch {
      // Mantener referencia original cuando no se pueda resolver.
    }
  }

  return updated
}
const emojiPlugin = (
  markdownItEmoji as unknown as {
    full?: (md: MarkdownIt) => void
  }
).full

const App = () => {
  const { t } = useTranslation()
  const [docCount, setDocCount] = useState(0)
  const [markdown, setMarkdown] = useState('')
  const [previewMarkdown, setPreviewMarkdown] = useState('')
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [folders, setFolders] = useState<ExplorerFolder[]>([])
  const [filePaths, setFilePaths] = useState<Record<string, string>>({})
  const [fileKinds, setFileKinds] = useState<Record<string, 'markdown' | 'asset'>>({})
  const [activeAssetPreview, setActiveAssetPreview] = useState<{
    id: string
    name: string
    path: string
    imageDataUrl: string | null
  } | null>(null)
  const [folderPaths, setFolderPaths] = useState<Record<string, string>>({})
  const [exportIncludeSourcePath, setExportIncludeSourcePath] = useState(false)
  const [exportIncludeFileName, setExportIncludeFileName] = useState(false)
  const [exportStatus, setExportStatus] = useState(() => t('exportStatus.none'))
  const [jumpRequest, setJumpRequest] = useState<{ text: string; nonce: number } | null>(null)
  const [activeEditBlockIndex, setActiveEditBlockIndex] = useState<number | null>(null)
  const [editSnapshotBlocks, setEditSnapshotBlocks] = useState<string[] | null>(null)
  const [editSnapshotPreviewBlocks, setEditSnapshotPreviewBlocks] = useState<string[] | null>(null)
  const [editBlockDraft, setEditBlockDraft] = useState('')
  const [editCaretPlacement, setEditCaretPlacement] = useState<'start' | 'end'>('end')
  const [editCaretNonce, setEditCaretNonce] = useState(0)
  const [gitSyncCount, setGitSyncCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'git' | 'export' | null>(null)
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor')
  const [commandOpen, setCommandOpen] = useState(false)
  const [scrollRatio, setScrollRatio] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [themeColors, setThemeColors] = useState<Record<string, string>>({})
  const [mermaidTheme, setMermaidTheme] = useState<'neutral' | 'dark'>('dark')
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const loadLastWorkspace = useWorkspaceStore((state) => state.loadLastWorkspace)
  const setWorkspacePath = useWorkspaceStore((state) => state.setPath)
  const workspacePath = useWorkspaceStore((state) => state.path)
  const [clipboard, setClipboard] = useState<{ name: string; path: string } | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const markdownRef = useRef(markdown)
  const previewUndoStackRef = useRef<string[]>([])
  const previewRedoStackRef = useRef<string[]>([])
  const applyingPreviewHistoryRef = useRef(false)

  const getEditorScroller = () => editorRef.current?.querySelector('.cm-scroller') as HTMLDivElement | null

  const splitBlocks = (source: string) => {
    const blocks = source.split(/\n{2,}/)
    return blocks.length === 1 && blocks[0] === '' ? [''] : blocks
  }

  const normalizeBlockDraft = (value: string) =>
    value
      .replace(/\r\n/g, '\n')
      .replace(/\s+$/g, '')

  const buildHeadingTrail = (source: string, upToBlockIndex: number) => {
    const blocks = splitBlocks(source)
    const levels = new Map<number, string>()
    for (let index = 0; index <= upToBlockIndex && index < blocks.length; index += 1) {
      const lines = blocks[index].split('\n')
      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        if (!match) {
          continue
        }
        const level = match[1].length
        levels.set(level, match[2].trim())
        for (let next = level + 1; next <= 6; next += 1) {
          levels.delete(next)
        }
      }
    }

    return Array.from(levels.keys())
      .sort((a, b) => a - b)
      .map((level) => levels.get(level))
      .filter((value): value is string => Boolean(value))
  }

  const flushMarkdownSave = (content?: string) => {
    if (!workspacePath || !activeFileId) {
      return
    }

    const targetPath = filePaths[activeFileId]
    if (!targetPath) {
      return
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    const payload = typeof content === 'string' ? content : markdownRef.current
    void window.api.writeWorkspaceFile({
      workspacePath,
      filePath: targetPath,
      content: payload,
    })
  }

  const resetPreviewHistory = () => {
    previewUndoStackRef.current = []
    previewRedoStackRef.current = []
  }

  const applyPreviewHistory = (action: 'undo' | 'redo') => {
    const canEdit = workspacePath && activeFileId && fileKinds[activeFileId] === 'markdown'
    if (!canEdit) {
      return
    }

    if (action === 'undo') {
      const next = previewUndoStackRef.current.pop()
      if (typeof next !== 'string') {
        return
      }
      previewRedoStackRef.current.push(markdownRef.current)
      applyingPreviewHistoryRef.current = true
      updateMarkdown(next, true, { source: 'history' })
      applyingPreviewHistoryRef.current = false
      return
    }

    const next = previewRedoStackRef.current.pop()
    if (typeof next !== 'string') {
      return
    }
    previewUndoStackRef.current.push(markdownRef.current)
    applyingPreviewHistoryRef.current = true
    updateMarkdown(next, true, { source: 'history' })
    applyingPreviewHistoryRef.current = false
  }

  const updateMarkdown = (
    nextValue: string,
    flush = false,
    options: { source?: 'editor' | 'preview' | 'history' } = {}
  ) => {
    const currentValue = markdownRef.current
    const source = options.source ?? 'editor'

    if (
      source === 'preview'
      && !applyingPreviewHistoryRef.current
      && nextValue !== currentValue
    ) {
      previewUndoStackRef.current.push(currentValue)
      if (previewUndoStackRef.current.length > 200) {
        previewUndoStackRef.current.shift()
      }
      previewRedoStackRef.current = []
    }

    setMarkdown(nextValue)
    markdownRef.current = nextValue

    if (!workspacePath || !activeFileId) {
      return
    }

    const targetPath = filePaths[activeFileId]
    if (!targetPath) {
      return
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    if (flush) {
      flushMarkdownSave(nextValue)
      return
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void window.api.writeWorkspaceFile({
        workspacePath,
        filePath: targetPath,
        content: nextValue,
      })
    }, 220)
  }

  const markdownIt = useMemo(() => {
    const instance = new MarkdownIt({ html: false, linkify: true, breaks: true })
    const defaultValidateLink = instance.validateLink
    instance.validateLink = (url) => {
      if (/^data:image\//i.test(url)) {
        return true
      }
      return defaultValidateLink(url)
    }
    if (emojiPlugin) {
      instance.use(emojiPlugin)
    }
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

    const defaultImage = instance.renderer.rules.image
    instance.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const sourcePath = (env as { sourcePath?: string }).sourcePath
      const srcIndex = token.attrIndex('src')
      if (srcIndex >= 0) {
        token.attrs![srcIndex]![1] = resolvePreviewHref(token.attrs![srcIndex]![1], sourcePath)
      }

      if (defaultImage) {
        return defaultImage(tokens, idx, options, env, self)
      }

      return self.renderToken(tokens, idx, options)
    }

    const defaultLinkOpen = instance.renderer.rules.link_open
    instance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const sourcePath = (env as { sourcePath?: string }).sourcePath
      const hrefIndex = token.attrIndex('href')
      if (hrefIndex >= 0) {
        token.attrs![hrefIndex]![1] = resolvePreviewHref(token.attrs![hrefIndex]![1], sourcePath)
      }

      if (token.attrIndex('target') < 0) {
        token.attrPush(['target', '_blank'])
      }
      if (token.attrIndex('rel') < 0) {
        token.attrPush(['rel', 'noopener noreferrer'])
      }

      if (defaultLinkOpen) {
        return defaultLinkOpen(tokens, idx, options, env, self)
      }

      return self.renderToken(tokens, idx, options)
    }

    return instance
  }, [])

  useEffect(() => {
    markdownRef.current = markdown
  }, [markdown])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!workspacePath) {
        setPreviewMarkdown(markdown)
        return
      }

      const sourcePath = activeFileId ? filePaths[activeFileId] : undefined
      const withImages = await rewriteLocalImagesForPreview(markdown, workspacePath, sourcePath)
      if (!cancelled) {
        setPreviewMarkdown(withImages)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [activeFileId, filePaths, markdown, workspacePath])

  const markdownBlocks = useMemo(() => splitBlocks(markdown), [markdown])
  const previewBlocks = useMemo(() => splitBlocks(previewMarkdown), [previewMarkdown])
  const sourceMarkdownBlocks = activeEditBlockIndex !== null && editSnapshotBlocks
    ? editSnapshotBlocks
    : markdownBlocks
  const sourcePreviewBlocks = activeEditBlockIndex !== null && editSnapshotPreviewBlocks
    ? editSnapshotPreviewBlocks
    : previewBlocks
  const renderedBlocks = useMemo(() => {
    const sourcePath = activeFileId ? filePaths[activeFileId] : undefined
    return sourcePreviewBlocks.map((block, index) => {
      const normalized = normalizeMarkdownInput(block)
      const html = withTaskCheckboxes(markdownIt.render(normalized, { sourcePath }))
      return {
        index,
        html,
        raw: activeEditBlockIndex === index ? editBlockDraft : (sourceMarkdownBlocks[index] ?? ''),
        isEditing: activeEditBlockIndex === index,
      }
    })
  }, [
    activeEditBlockIndex,
    activeFileId,
    editBlockDraft,
    filePaths,
    markdownIt,
    sourceMarkdownBlocks,
    sourcePreviewBlocks,
  ])

  const previewBreadcrumbs = useMemo(() => {
    if (!activeFileId) {
      return t('preview.noSelectedFile')
    }
    const currentMarkdown =
      activeEditBlockIndex !== null && editSnapshotBlocks
        ? [...editSnapshotBlocks]
            .map((block, index) => (index === activeEditBlockIndex ? editBlockDraft : block))
            .join('\n\n')
        : markdown
    const headingTrail = buildHeadingTrail(currentMarkdown, activeEditBlockIndex ?? 0)
    return headingTrail.length > 0 ? `${activeFileId} / ${headingTrail.join(' / ')}` : activeFileId
  }, [activeEditBlockIndex, activeFileId, editBlockDraft, editSnapshotBlocks, markdown, t])

  const gitStatus = useMemo(() => {
    if (gitSyncCount === 0) {
      return t('git.readyToSync')
    }

    return t('git.synced')
  }, [gitSyncCount, t])

  const findFolderByFile = (fileId: string | null) => {
    if (!fileId) {
      return null
    }

    return folders.find((folder) => folder.files.some((file) => file.id === fileId)) ?? null
  }

  const toFileId = (rootPath: string, targetPath: string) =>
    targetPath
      .replace(`${rootPath}/`, '')
      .replace(`${rootPath}\\`, '')
      .split('\\')
      .join('/')

  const toNormalizedPath = (targetPath: string) => {
    const unified = targetPath.replace(/\\/g, '/')
    const parts = unified.split('/')
    const normalized: string[] = []

    parts.forEach((part, index) => {
      if (!part || part === '.') {
        if (index === 0 && unified.startsWith('/')) {
          normalized.push('')
        }
        return
      }
      if (part === '..') {
        if (normalized.length > 1 || (normalized.length === 1 && normalized[0] !== '')) {
          normalized.pop()
        }
        return
      }
      normalized.push(part)
    })

    return normalized.join('/')
  }

  const dirnameOfPath = (targetPath: string) => {
    const slashIndex = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'))
    return slashIndex >= 0 ? targetPath.slice(0, slashIndex) : targetPath
  }

  const resolveWorkspaceLinkPath = (linkPath: string, sourcePath: string, workspaceRoot: string) => {
    const isWindows = workspaceRoot.includes('\\')
    const separator = isWindows ? '\\' : '/'
    const sanitized = decodeURIComponent(linkPath)
    const startsAtRoot = sanitized.startsWith('/') || sanitized.startsWith('\\')
    const base = startsAtRoot ? workspaceRoot : dirnameOfPath(sourcePath)
    const withoutLeadingSlashes = sanitized.replace(/^[/\\]+/, '')

    return toNormalizedPath(`${base}${separator}${withoutLeadingSlashes}`)
  }

  const loadWorkspaceTree = useCallback(async (targetPath: string, preferredActiveId: string | null) => {
    const tree = await window.api.readWorkspaceTree(targetPath)
    const nextFolders: ExplorerFolder[] = tree.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      depth: folder.depth,
      files: folder.files.map((file) => ({ id: file.id, name: file.name, kind: file.kind })),
    }))
    const nextFilePaths = tree.reduce<Record<string, string>>((acc, folder) => {
      for (const file of folder.files) {
        acc[file.id] = file.path
      }
      return acc
    }, {})
    const nextFolderPaths = tree.reduce<Record<string, string>>((acc, folder) => {
      acc[folder.id] = folder.path
      return acc
    }, {})
    const nextFileKinds = tree.reduce<Record<string, 'markdown' | 'asset'>>((acc, folder) => {
      for (const file of folder.files) {
        acc[file.id] = file.kind
      }
      return acc
    }, {})

    setFolders(nextFolders)
    setFilePaths(nextFilePaths)
    setFileKinds(nextFileKinds)
    setFolderPaths(nextFolderPaths)
    setDocCount(Object.keys(nextFilePaths).length)

    const availableFiles = Object.keys(nextFilePaths)
    if (availableFiles.length === 0) {
      setActiveFileId(null)
      setMarkdown('')
      setActiveAssetPreview(null)
      return
    }

    const nextActive =
      (preferredActiveId && nextFilePaths[preferredActiveId] ? preferredActiveId : null)
      ?? availableFiles[0]
    const content = await window.api.readWorkspaceFile({
      workspacePath: targetPath,
      filePath: nextFilePaths[nextActive],
    })
    setActiveFileId(nextActive)
    setMarkdown(content)
    setActiveAssetPreview(null)
    setActiveEditBlockIndex(null)
    setViewMode('preview')
  }, [])

  const createDoc = async (folderId?: string) => {
    if (!workspacePath) {
      return
    }

    const fallbackFolderId = findFolderByFile(activeFileId)?.id ?? folders[0]?.id ?? '.'
    const targetFolderId = folderId ?? fallbackFolderId
    const targetFolderPath = folderPaths[targetFolderId] ?? workspacePath
    const createdPath = await window.api.createWorkspaceFile({
      workspacePath,
      folderPath: targetFolderPath,
      baseName: t('workspace.defaultDocumentBase'),
    })

    const createdId = toFileId(workspacePath, createdPath)
    await loadWorkspaceTree(workspacePath, createdId)
    const content = await window.api.readWorkspaceFile({ workspacePath, filePath: createdPath })
    setActiveFileId(createdId)
    setMarkdown(content)
    setActiveAssetPreview(null)
    setActiveEditBlockIndex(null)
    setViewMode('editor')
  }

  const handleSelectFile = async (id: string) => {
    if (!workspacePath || !filePaths[id]) {
      return
    }

    if (fileKinds[id] === 'asset') {
      const filePath = filePaths[id]
      const fileName = id.split('/').pop() ?? id
      const imagePattern = /\.(png|jpe?g|gif|svg|webp|avif)$/i
      const imageDataUrl = imagePattern.test(id)
        ? await window.api.readWorkspaceFileDataUrl({ workspacePath, filePath })
        : null

      setActiveFileId(id)
      setActiveAssetPreview({
        id,
        name: fileName,
        path: filePath,
        imageDataUrl,
      })
      setActiveEditBlockIndex(null)
      setViewMode('editor')
      return
    }

    const content = await window.api.readWorkspaceFile({
      workspacePath,
      filePath: filePaths[id],
    })
    setActiveFileId(id)
    setMarkdown(content)
    setActiveAssetPreview(null)
    setActiveEditBlockIndex(null)
    setViewMode('preview')
  }

  const handleOpenPreviewLink = useCallback(async (href: string) => {
    const target = href.trim()
    if (!target) {
      return
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(target)
    if (target.startsWith('#') || !workspacePath || !activeFileId) {
      if (hasScheme) {
        await window.api.openExternalUrl(target)
      }
      return
    }

    const sourcePath = filePaths[activeFileId]
    if (!sourcePath) {
      return
    }

    const candidatePaths: string[] = []

    if (hasScheme) {
      if (target.toLowerCase().startsWith('file:')) {
        try {
          const parsed = new URL(target)
          const decodedPath = decodeURIComponent(parsed.pathname)
          const normalizedFilePath = toNormalizedPath(
            /^\/[a-zA-Z]:\//.test(decodedPath) ? decodedPath.slice(1) : decodedPath
          )
          candidatePaths.push(normalizedFilePath)
        } catch {
          // ignore invalid file URL and fallback to external handling below
        }
      }
    } else {
      const linkPathOnly = target.split('#')[0]?.split('?')[0] ?? ''
      if (linkPathOnly) {
        candidatePaths.push(resolveWorkspaceLinkPath(linkPathOnly, sourcePath, workspacePath))
      }
    }

    const linkedEntry = Object.entries(filePaths).find(([fileId, filePath]) =>
      fileKinds[fileId] === 'markdown'
      && candidatePaths.some((candidatePath) => toNormalizedPath(filePath) === candidatePath)
    )

    if (linkedEntry) {
      await handleSelectFile(linkedEntry[0])
      return
    }

    if (hasScheme) {
      await window.api.openExternalUrl(target)
    }
  }, [activeFileId, fileKinds, filePaths, handleSelectFile, workspacePath])

  const handleTogglePreviewTaskCheckbox = useCallback((blockIndex: number, taskIndex: number, checked: boolean) => {
    const blocks = markdown.split('\n\n')
    const targetBlock = blocks[blockIndex]
    if (typeof targetBlock !== 'string') {
      return
    }

    let seenTasks = 0
    const nextBlock = targetBlock.replace(/^(\s*[-*+]\s+)\[([ xX])\]/gm, (full, prefix: string) => {
      if (seenTasks === taskIndex) {
        seenTasks += 1
        return `${prefix}[${checked ? 'x' : ' '}]`
      }
      seenTasks += 1
      return full
    })

    if (seenTasks <= taskIndex) {
      return
    }

    blocks[blockIndex] = nextBlock
    updateMarkdown(blocks.join('\n\n'), true, { source: 'preview' })
  }, [markdown])

  const handleExportFile = async () => {
    const activePath = activeFileId ? filePaths[activeFileId] : null
    if (!activeFileId || !activePath) {
      setExportStatus(t('exportStatus.selectFile'))
      return
    }

    const activeName = folders
      .flatMap((folder) => folder.files)
      .find((file) => file.id === activeFileId)?.name

    const response = await window.api.exportPdfFile({
      title: toDisplayName(activeName || t('commands.newDocument')),
      markdown,
      sourcePath: activePath,
      options: {
        includeSourcePath: exportIncludeSourcePath,
        includeFileName: exportIncludeFileName,
      },
    })
    setExportStatus(response)
  }

  const handleExportFolder = async () => {
    if (!workspacePath || folders.length === 0) {
      setExportStatus(t('exportStatus.noFolderLoaded'))
      return
    }

    const activeFolderId = findFolderByFile(activeFileId)?.id ?? folders[0]?.id
    const folder = folders.find((entry) => entry.id === activeFolderId)
    if (!folder) {
      setExportStatus(t('exportStatus.noFolderAvailable'))
      return
    }

    const documents = await Promise.all(
      folder.files.map(async (file) => {
        const sourcePath = filePaths[file.id]
        if (!sourcePath) {
          return null
        }

        const content =
          activeFileId === file.id
            ? markdown
            : await window.api.readWorkspaceFile({ workspacePath, filePath: sourcePath })

        return {
          title: toDisplayName(file.name),
          markdown: content,
          sourcePath,
        }
      })
    )

    const filteredDocuments = documents.filter((document) => document !== null)
    if (filteredDocuments.length === 0) {
      setExportStatus(t('exportStatus.noMarkdownInFolder'))
      return
    }

    const response = await window.api.exportPdfFolder({
      title: `carpeta-${folder.name}`,
      documents: filteredDocuments,
      options: {
        includeSourcePath: exportIncludeSourcePath,
        includeFileName: exportIncludeFileName,
      },
    })
    setExportStatus(response)
  }

  const handleExportProject = async () => {
    if (!workspacePath || folders.length === 0) {
      setExportStatus(t('exportStatus.noProjectLoaded'))
      return
    }

    const allFiles = folders.flatMap((folder) => folder.files)
    const documents = await Promise.all(
      allFiles.map(async (file) => {
        const sourcePath = filePaths[file.id]
        if (!sourcePath) {
          return null
        }

        const content =
          activeFileId === file.id
            ? markdown
            : await window.api.readWorkspaceFile({ workspacePath, filePath: sourcePath })

        return {
          title: toDisplayName(file.name),
          markdown: content,
          sourcePath,
        }
      })
    )

    const filteredDocuments = documents.filter((document) => document !== null)
    if (filteredDocuments.length === 0) {
      setExportStatus(t('exportStatus.noMarkdownInProject'))
      return
    }

    const workspaceName = workspacePath.split('/').filter(Boolean).pop() || 'proyecto'
    const response = await window.api.exportPdfProject({
      title: `proyecto-${workspaceName}`,
      documents: filteredDocuments,
      options: {
        includeSourcePath: exportIncludeSourcePath,
        includeFileName: exportIncludeFileName,
      },
    })
    setExportStatus(response)
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
    void loadLastWorkspace()
  }, [loadLastWorkspace])

  useEffect(() => {
    if (!window.api.onWorkspaceOpenRequest) {
      return
    }

    const unsubscribe = window.api.onWorkspaceOpenRequest((nextPath) => {
      setWorkspacePath(nextPath)
    })

    return unsubscribe
  }, [setWorkspacePath])

  useEffect(() => {
    if (!window.api.onMenuEditAction) {
      return
    }

    const unsubscribe = window.api.onMenuEditAction((action) => {
      if (viewMode === 'editor' && !activeAssetPreview) {
        window.dispatchEvent(new CustomEvent('menu:edit-action', { detail: action }))
        return
      }

      applyPreviewHistory(action)
    })

    return unsubscribe
  }, [activeAssetPreview, viewMode, workspacePath, activeFileId, fileKinds])

  useEffect(() => {
    resetPreviewHistory()
  }, [workspacePath, activeFileId])

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
    if (!workspacePath) {
      resetPreviewHistory()
      setFolders([])
      setFilePaths({})
      setFileKinds({})
      setFolderPaths({})
      setDocCount(0)
      setActiveFileId(null)
      setMarkdown('')
      setPreviewMarkdown('')
      setActiveAssetPreview(null)
      setActiveEditBlockIndex(null)
      return
    }

    const timer = window.setTimeout(() => {
      void loadWorkspaceTree(workspacePath, activeFileId)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [workspacePath, activeFileId, loadWorkspaceTree])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

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

    const editorScroller = getEditorScroller()
    if (!editorScroller) {
      return
    }
    const maxEditor = editorScroller.scrollHeight - editorScroller.clientHeight
    editorScroller.scrollTop = maxEditor * scrollRatio
  }, [viewMode, scrollRatio])

  const handleEditorScroll = (scrollTop: number) => {
    const editorScroller = getEditorScroller()
    if (!editorScroller) {
      return
    }

    const maxEditor = editorScroller.scrollHeight - editorScroller.clientHeight
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

  const fileCommands = folders.flatMap((folder) =>
    folder.files.map((file) => ({
      id: `open-file-${file.id.replace(/[^a-zA-Z0-9-_]/g, '-')}`,
      label: t('commands.openFile', { name: file.name }),
      category: t('commands.categories.files'),
      aliases: [file.name, folder.name, file.id],
      onRun: () => void handleSelectFile(file.id),
    }))
  )

  const commands = [
    {
      id: 'toggle-view',
      label: viewMode === 'editor' ? t('commands.toggleToPreview') : t('commands.toggleToEditor'),
      category: t('commands.categories.editor'),
      aliases: ['preview', 'vista', 'editor'],
      onRun: toggleView,
    },
    {
      id: 'theme-light',
      label: t('commands.lightTheme'),
      category: t('commands.categories.appearance'),
      aliases: ['light', 'claro', 'tema'],
      onRun: () => setTheme('light'),
    },
    {
      id: 'theme-dark',
      label: t('commands.darkTheme'),
      category: t('commands.categories.appearance'),
      aliases: ['dark', 'oscuro', 'tema'],
      onRun: () => {
        setTheme('dark')
        setMermaidTheme('dark')
      },
    },
    {
      id: 'theme-load',
      label: t('commands.loadThemeJson'),
      category: t('commands.categories.appearance'),
      aliases: ['json', 'tema', 'colores'],
      onRun: async () => {
    const loaded = await window.api.loadTheme()
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
      label: t('commands.openWorkspace'),
      category: t('commands.categories.workspace'),
      aliases: ['proyecto', 'abrir carpeta', 'workspace'],
      onRun: () => void selectWorkspace(),
    },
    {
      id: 'new-doc',
      label: t('commands.newDocument'),
      category: t('commands.categories.editor'),
      aliases: ['nuevo archivo', 'documento'],
      onRun: () => createDoc(),
    },
    {
      id: 'open-git',
      label: t('commands.openGit'),
      category: t('commands.categories.git'),
      aliases: ['git panel', 'repositorio'],
      onRun: () => openTool('git'),
    },
    {
      id: 'open-export',
      label: t('commands.openExport'),
      category: t('commands.categories.export'),
      aliases: ['exportar', 'pdf', 'export panel'],
      onRun: () => openTool('export'),
    },
    {
      id: 'sync-git',
      label: t('commands.syncGit'),
      category: t('commands.categories.git'),
      aliases: ['sync', 'push', 'pull'],
      onRun: handleSync,
    },
    {
      id: 'export-pdf',
      label: t('commands.exportPdf'),
      category: t('commands.categories.export'),
      aliases: ['pdf', 'exportar documento'],
      onRun: () => void handleExportFile(),
    },
    {
      id: 'export-folder',
      label: t('commands.exportFolder'),
      category: t('commands.categories.export'),
      aliases: ['carpeta', 'exportar carpeta'],
      onRun: () => void handleExportFolder(),
    },
    {
      id: 'export-project',
      label: t('commands.exportProject'),
      category: t('commands.categories.export'),
      aliases: ['proyecto', 'exportar proyecto'],
      onRun: () => void handleExportProject(),
    },
    ...fileCommands,
  ]

  return (
    <>
      <AppShell
      header={
        <>
          <div>
            <h1 className="font-serif text-2xl text-ink-900">
              E-Dito
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-full bg-canvas-100 px-3 py-1 text-xs text-ink-600">
              {t('header.documents')}:{' '}
              <span data-testid="doc-count" className="font-semibold text-ink-800">
                {docCount}
              </span>
            </div>
            <WorkspaceSwitcher />
          </div>
        </>
      }
      leftRail={
          <ExplorerSidebar
            workspacePath={workspacePath}
            folders={folders}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateDoc={(folderId) => createDoc(folderId)}
            onCreateFolder={() => {
              if (!workspacePath) {
                return
              }
              void window.api
                .createWorkspaceFolder({
                  workspacePath,
                  parentPath: workspacePath,
                  name: t('workspace.defaultFolderBase'),
                })
                .then(() => loadWorkspaceTree(workspacePath, activeFileId))
            }}
            onDeleteFile={(fileId) => {
              if (!workspacePath) {
                return
              }

              const currentPath = filePaths[fileId]
              if (!currentPath) {
                return
              }

              void window.api
                .deleteWorkspaceFile({ workspacePath, filePath: currentPath })
                .then(() => {
                  const remaining = folders
                    .flatMap((folder) => folder.files)
                    .filter((file) => file.id !== fileId)
                  const nextActive = remaining[0]?.id ?? null
                  return loadWorkspaceTree(workspacePath, nextActive)
                })
            }}
            onCopyFile={(fileId) => {
              const sourcePath = filePaths[fileId]
              const fileName = folders
                .flatMap((folder) => folder.files)
                .find((file) => file.id === fileId)?.name
              if (!fileName || !sourcePath) {
                return
              }
              setClipboard({ name: fileName, path: sourcePath })
            }}
            onPasteFile={(folderId) => {
              if (!workspacePath || !clipboard) {
                return
              }

              const fallbackFolderId = findFolderByFile(activeFileId)?.id ?? folders[0]?.id ?? '.'
              const destinationFolderId = folderId ?? fallbackFolderId
              const destinationFolderPath = folderPaths[destinationFolderId] ?? workspacePath
              void window.api
                .duplicateWorkspaceFile({
                  workspacePath,
                  sourcePath: clipboard.path,
                  destinationFolderPath,
                })
                .then((duplicatedPath) => {
                  const duplicatedId = toFileId(workspacePath, duplicatedPath)
                  return loadWorkspaceTree(workspacePath, duplicatedId)
                })
            }}
            onRevealInFinder={(fileId) => {
              if (!workspacePath) {
                return
              }

              const targetPath = (fileId ? filePaths[fileId] : null) ?? workspacePath
              if (!targetPath) {
                return
              }

              void window.api.revealInFinder(targetPath)
            }}
          />
      }
      main={
        !workspacePath ? (
          <section className="flex h-full items-center justify-center border-l border-canvas-200" style={{ background: 'var(--editor-bg)' }}>
            <div className="max-w-md space-y-3 px-6 text-center">
              <h2 className="text-lg font-semibold text-ink-900">{t('workspace.noWorkspace')}</h2>
              <p className="text-sm text-ink-600">{t('workspace.openWorkspaceDescription')}</p>
              <Button size="sm" onClick={() => void selectWorkspace()}>
                {t('workspace.openWorkspace')}
              </Button>
            </div>
          </section>
        ) : viewMode === 'editor' ? (
          activeAssetPreview ? (
            <AssetPreviewPane
              fileName={activeAssetPreview.name}
              fileId={activeAssetPreview.id}
              filePath={activeAssetPreview.path}
              imageDataUrl={activeAssetPreview.imageDataUrl}
            />
          ) : (
            <EditorPane
              value={markdown}
              breadcrumbFile={activeFileId}
              onChange={(value) => updateMarkdown(value)}
              onScroll={handleEditorScroll}
              editorRef={editorRef}
              jumpRequest={jumpRequest}
              onJumpHandled={() => setJumpRequest(null)}
            />
          )
        ) : (
          <PreviewPane
            blocks={renderedBlocks}
            breadcrumbs={previewBreadcrumbs}
            onScroll={handlePreviewScroll}
            previewRef={previewRef}
            onOpenLink={(href) => {
              void handleOpenPreviewLink(href)
            }}
            onToggleTaskCheckbox={(index, taskIndex, checked) => {
              handleTogglePreviewTaskCheckbox(index, taskIndex, checked)
            }}
            onSelectBlock={(index) => {
              setActiveEditBlockIndex(index)
              setEditSnapshotBlocks(markdownBlocks)
              setEditSnapshotPreviewBlocks(previewBlocks)
              setEditBlockDraft(markdownBlocks[index] ?? '')
              setEditCaretPlacement('end')
              setEditCaretNonce((current) => current + 1)
            }}
            onChangeBlock={(index, nextValue) => {
              const baseBlocks = activeEditBlockIndex !== null && editSnapshotBlocks
                ? [...editSnapshotBlocks]
                : [...markdownBlocks]
              baseBlocks[index] = nextValue
              setEditBlockDraft(nextValue)
      updateMarkdown(baseBlocks.join('\n\n'), false, { source: 'preview' })
            }}
            onBlurBlock={() => {
              const baseBlocks = activeEditBlockIndex !== null && editSnapshotBlocks
                ? [...editSnapshotBlocks]
                : [...markdownBlocks]
              if (activeEditBlockIndex !== null) {
                const normalizedDraft = normalizeBlockDraft(editBlockDraft)
                const nextBlocksFromDraft = splitBlocks(normalizedDraft)
                baseBlocks.splice(activeEditBlockIndex, 1, ...nextBlocksFromDraft)
              }
              const compactBlocks = baseBlocks.filter((block) => {
                if (baseBlocks.length === 1) {
                  return true
                }
                return block.trim().length > 0
              })
              const nextValue = compactBlocks.join('\n\n')
              updateMarkdown(nextValue, true, { source: 'preview' })
              setEditSnapshotBlocks(null)
              setEditSnapshotPreviewBlocks(null)
              setEditBlockDraft('')
              setActiveEditBlockIndex(null)
            }}
            onInsertBlockBelow={(index) => {
              const baseBlocks = activeEditBlockIndex !== null && editSnapshotBlocks
                ? [...editSnapshotBlocks]
                : [...markdownBlocks]
              if (activeEditBlockIndex !== null) {
                baseBlocks[activeEditBlockIndex] = editBlockDraft
              }

              baseBlocks.splice(index + 1, 0, '')
              setEditSnapshotBlocks(baseBlocks)
              setEditSnapshotPreviewBlocks(baseBlocks)
              setEditBlockDraft('')
              setActiveEditBlockIndex(index + 1)
              setEditCaretPlacement('start')
              setEditCaretNonce((current) => current + 1)
              updateMarkdown(baseBlocks.join('\n\n'), true, { source: 'preview' })
            }}
            onMergeBlockWithPrevious={(index) => {
              if (index <= 0) {
                return
              }

              const baseBlocks = activeEditBlockIndex !== null && editSnapshotBlocks
                ? [...editSnapshotBlocks]
                : [...markdownBlocks]

              if (activeEditBlockIndex !== null) {
                baseBlocks[activeEditBlockIndex] = editBlockDraft
              }

              const previous = baseBlocks[index - 1] ?? ''
              const current = baseBlocks[index] ?? ''
              const separator = previous.endsWith('\n') || current.startsWith('\n') ? '' : '\n'
              const merged = `${previous}${separator}${current}`

              baseBlocks[index - 1] = merged
              baseBlocks.splice(index, 1)

              setEditSnapshotBlocks(baseBlocks)
              setEditSnapshotPreviewBlocks(baseBlocks)
              setEditBlockDraft(merged)
              setActiveEditBlockIndex(index - 1)
              setEditCaretPlacement('end')
              setEditCaretNonce((current) => current + 1)
              updateMarkdown(baseBlocks.join('\n\n'), true, { source: 'preview' })
            }}
            onNavigateBlock={(index, direction) => {
              const baseBlocks = activeEditBlockIndex !== null && editSnapshotBlocks
                ? [...editSnapshotBlocks]
                : [...markdownBlocks]

              if (activeEditBlockIndex !== null) {
                baseBlocks[activeEditBlockIndex] = editBlockDraft
              }

              const nextIndex = direction === 'down' ? index + 1 : index - 1
              if (nextIndex < 0 || nextIndex >= baseBlocks.length) {
                return
              }

              setEditSnapshotBlocks(baseBlocks)
              setEditSnapshotPreviewBlocks(baseBlocks)
              setActiveEditBlockIndex(nextIndex)
              setEditBlockDraft(baseBlocks[nextIndex] ?? '')
              setEditCaretPlacement(direction === 'down' ? 'start' : 'end')
              setEditCaretNonce((current) => current + 1)
              updateMarkdown(baseBlocks.join('\n\n'), false, { source: 'preview' })
            }}
            editCaretPlacement={editCaretPlacement}
            editCaretNonce={editCaretNonce}
          />
        )
      }
      drawer={
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">
                {t('toolDrawer.title')}
              </p>
              <h2 className="text-lg font-semibold text-ink-900">
                {activeTool === 'git' ? t('commands.categories.git') : t('commands.categories.export')}
              </h2>
            </div>
            <button
              className="rounded-full border border-canvas-200 px-3 py-1 text-xs text-ink-600"
              onClick={closeDrawer}
              type="button"
            >
              {t('common.close')}
            </button>
          </div>
          {activeTool === 'git' ? (
            <GitPanel status={gitStatus} onSync={handleSync} />
          ) : (
            <ExportPanel
              status={exportStatus}
              includeSourcePath={exportIncludeSourcePath}
              includeFileName={exportIncludeFileName}
              onToggleIncludeSourcePath={setExportIncludeSourcePath}
              onToggleIncludeFileName={setExportIncludeFileName}
              onExportFile={handleExportFile}
              onExportFolder={handleExportFolder}
              onExportProject={handleExportProject}
            />
          )}
        </div>
      }
      drawerOpen={drawerOpen}
      onCloseDrawer={closeDrawer}
      statusBar={
        <>
          <div className="flex items-center gap-3 text-xs text-ink-600">
            <span className="rounded-full bg-canvas-100 px-3 py-1">{t('git.cleanBranch')}</span>
            <span data-testid="git-status">{gitStatus}</span>
            <span className="text-ink-400">{t('statusBar.shortcutOpen')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-canvas-200 px-3 py-1 text-xs text-ink-600 hover:border-ink-400"
              onClick={() => openTool('git')}
              type="button"
              aria-label={t('statusBar.openGit')}
              data-testid="tool-git"
            >
              Git
            </button>
            <button
              className="rounded-full border border-canvas-200 px-3 py-1 text-xs text-ink-600 hover:border-ink-400"
              onClick={() => openTool('export')}
              type="button"
              aria-label={t('statusBar.openExport')}
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
