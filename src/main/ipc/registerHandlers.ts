import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import MarkdownIt from 'markdown-it'
import * as markdownItEmoji from 'markdown-it-emoji'
import { createRequire } from 'node:module'
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, extname, join, normalize, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  clearWorkspaceHistory,
  getResolvedLanguage,
  getValidLastWorkspace,
  getValidRecentWorkspaces,
  getLanguagePreference,
  setConfirmExternalLinks,
  setLanguagePreference,
  setLastWorkspacePath,
  shouldConfirmExternalLinks,
  type SupportedUiLanguage,
  type UiLanguagePreference,
} from '../workspaceConfig.js'
import { getMainI18n } from '../i18n.js'

type WorkspaceTreeFile = {
  id: string
  name: string
  path: string
  kind: 'markdown' | 'asset'
}

type WorkspaceTreeFolder = {
  id: string
  name: string
  path: string
  parentId: string | null
  depth: number
  files: WorkspaceTreeFile[]
}

type ExportMarkdownDocument = {
  title: string
  markdown: string
  sourcePath?: string
}

type ExportOptions = {
  includeSourcePath: boolean
  includeFileName: boolean
}

type ExportPdfPayload = {
  title: string
  markdown: string
  sourcePath?: string
  options?: Partial<ExportOptions>
}

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx', '.txt'])
const require = createRequire(import.meta.url)
const githubMarkdownCssPath = require.resolve('github-markdown-css/github-markdown.css')
const mermaidBundlePath = require.resolve('mermaid/dist/mermaid.min.js')
const emojiPlugin = (
  markdownItEmoji as unknown as {
    full?: (md: MarkdownIt) => void
  }
).full

const getWindowFromEvent = (event: Electron.IpcMainInvokeEvent) =>
  BrowserWindow.fromWebContents(event.sender)

const ensureInsideWorkspace = (workspacePath: string, targetPath: string) => {
  const normalizedWorkspace = normalize(workspacePath)
  const normalizedTarget = normalize(targetPath)
  if (
    normalizedTarget !== normalizedWorkspace
    && !normalizedTarget.startsWith(`${normalizedWorkspace}/`)
    && !normalizedTarget.startsWith(`${normalizedWorkspace}\\`)
  ) {
    throw new Error('Ruta fuera del workspace')
  }
}

const toId = (workspacePath: string, targetPath: string) => {
  const rel = relative(workspacePath, targetPath)
  return rel.split('\\').join('/')
}

const buildWorkspaceTree = async (workspacePath: string): Promise<WorkspaceTreeFolder[]> => {
  const folders = new Map<string, WorkspaceTreeFolder>()
  const rootName = basename(workspacePath)

  const ensureFolder = (folderPath: string) => {
    const id = toId(workspacePath, folderPath) || '.'
    if (folders.has(id)) {
      return folders.get(id)!
    }

    const folder: WorkspaceTreeFolder = {
      id,
      name: id === '.' ? rootName : basename(folderPath),
      path: folderPath,
      parentId: id === '.' ? null : (toId(workspacePath, dirname(folderPath)) || '.'),
      depth: id === '.' ? 0 : id.split('/').length,
      files: [],
    }
    folders.set(id, folder)
    return folder
  }

  const walk = async (currentPath: string) => {
    const entries = await readdir(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name)
      if (entry.isDirectory()) {
        ensureFolder(entryPath)
        await walk(entryPath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = extname(entry.name).toLowerCase()
      const kind: WorkspaceTreeFile['kind'] = MARKDOWN_EXTENSIONS.has(extension) ? 'markdown' : 'asset'

      const parentFolder = ensureFolder(currentPath)
      parentFolder.files.push({
        id: toId(workspacePath, entryPath),
        name: entry.name,
        path: entryPath,
        kind,
      })
    }
  }

  ensureFolder(workspacePath)
  await walk(workspacePath)

  const result = Array.from(folders.values())
    .map((folder) => ({
      ...folder,
      files: [...folder.files].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path))

  const fileFolderIds = new Set(result.filter((folder) => folder.files.length > 0).map((folder) => folder.id))

  return result.filter((folder) => {
    if (folder.id === '.') {
      return true
    }
    if (fileFolderIds.has(folder.id)) {
      return true
    }
    const prefix = `${folder.id}/`
    for (const id of fileFolderIds) {
      if (id.startsWith(prefix)) {
        return true
      }
    }
    return false
  })
}

const nextAvailablePath = async (folderPath: string, baseName: string, extension: string) => {
  let attempt = 0

  while (attempt < 9999) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`
    const candidate = join(folderPath, `${baseName}${suffix}${extension}`)
    try {
      await stat(candidate)
      attempt += 1
    } catch {
      return candidate
    }
  }

  return join(folderPath, `${baseName}-${Date.now()}${extension}`)
}

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

const withTaskCheckboxes = (html: string) =>
  html
    .replace(/<li>\s*\[ \]\s+/g, '<li><input type="checkbox" disabled /> ')
    .replace(/<li>\s*\[(x|X)\]\s+/g, '<li><input type="checkbox" disabled checked /> ')

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

type PreparedExportDocument = ExportMarkdownDocument & {
  docId: string
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const getMimeTypeForPath = (targetPath: string) =>
  IMAGE_MIME_TYPES[extname(targetPath).toLowerCase()] ?? 'application/octet-stream'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const isExternalHref = (href: string) => /^(https?:|mailto:|tel:|data:|file:)/i.test(href)

const extractMarkdownLinks = (markdown: string) => {
  const pattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g
  const links: string[] = []

  for (const match of markdown.matchAll(pattern)) {
    const rawTarget = (match[1] ?? '').trim().replace(/^<|>$/g, '')
    const href = rawTarget.split(/\s+/)[0]
    if (!href || href.startsWith('#') || isExternalHref(href)) {
      continue
    }

    const [filePart] = href.split('#')
    const extension = extname(filePart).toLowerCase()
    if (MARKDOWN_EXTENSIONS.has(extension)) {
      links.push(filePart)
    }
  }

  return links
}

const collectLinkedDocumentsInOrder = async (payload: ExportPdfPayload): Promise<ExportMarkdownDocument[]> => {
  if (!payload.sourcePath) {
    return [{ title: payload.title, markdown: payload.markdown, sourcePath: payload.sourcePath }]
  }

  const visited = new Set<string>()
  const ordered: ExportMarkdownDocument[] = []

  const visit = async (filePath: string, contentOverride?: string, titleOverride?: string) => {
    const normalizedPath = normalize(filePath)
    if (visited.has(normalizedPath)) {
      return
    }
    visited.add(normalizedPath)

    let markdownContent = contentOverride
    if (typeof markdownContent !== 'string') {
      try {
        markdownContent = await readFile(normalizedPath, 'utf-8')
      } catch {
        return
      }
    }

    ordered.push({
      title: titleOverride ?? basename(normalizedPath, extname(normalizedPath)),
      markdown: markdownContent,
      sourcePath: normalizedPath,
    })

    const links = extractMarkdownLinks(markdownContent)
    for (const relativeLink of links) {
      const nextPath = normalize(join(dirname(normalizedPath), decodeURI(relativeLink)))
      await visit(nextPath)
    }
  }

  await visit(payload.sourcePath, payload.markdown, payload.title)
  return ordered
}

const toDocId = (index: number, sourcePath?: string) => {
  if (!sourcePath) {
    return `doc-${index + 1}`
  }

  const name = basename(sourcePath, extname(sourcePath))
  const safe = slugify(name) || `doc-${index + 1}`
  return `${safe}-${index + 1}`
}

const addHeadingIds = (html: string, docId: string) => {
  const seen = new Map<string, number>()
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_full, level, content) => {
    const plainText = content.replace(/<[^>]+>/g, '')
    const base = slugify(plainText) || `heading-${level}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const unique = count === 0 ? base : `${base}-${count + 1}`
    return `<h${level} id="${docId}--${unique}">${content}</h${level}>`
  })
}

const rewriteMarkdownImages = async (markdown: string, sourcePath?: string) => {
  if (!sourcePath) {
    return markdown
  }

  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g
  let updated = markdown
  const matches = Array.from(markdown.matchAll(pattern))

  for (const match of matches) {
    const alt = match[1]
    const rawTarget = match[2].trim().replace(/^<|>$/g, '')
    const href = rawTarget.split(/\s+/)[0]
    if (!href || href.startsWith('#') || isExternalHref(href)) {
      continue
    }

    const absolutePath = join(dirname(sourcePath), decodeURI(href))
    try {
      const buffer = await readFile(absolutePath)
      const mime = getMimeTypeForPath(absolutePath)
      const dataUri = `data:${mime};base64,${buffer.toString('base64')}`
      const original = `![${alt}](${match[2]})`
      const replacement = `![${alt}](${dataUri})`
      updated = updated.replace(original, replacement)
    } catch {
      // Mantener la referencia original si no se puede resolver la imagen.
    }
  }

  return updated
}

const rewriteMarkdownLinks = (
  markdown: string,
  docId: string,
  sourcePath: string | undefined,
  docsByPath: Map<string, string>,
) => {
  const pattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g

  return markdown.replace(pattern, (_full, label: string, rawTarget: string) => {
    const raw = rawTarget.trim().replace(/^<|>$/g, '')
    const href = raw.split(/\s+/)[0]
    if (!href) {
      return `[${label}](${rawTarget})`
    }

    if (href.startsWith('#')) {
      const fragment = slugify(href.slice(1))
      return `[${label}](#${docId}--${fragment})`
    }

    if (isExternalHref(href) || !sourcePath) {
      return `[${label}](${href})`
    }

    const [targetPathRaw, hashRaw] = href.split('#')
    const resolvedPath = normalize(join(dirname(sourcePath), decodeURI(targetPathRaw)))
    const targetDocId = docsByPath.get(resolvedPath)
    if (targetDocId) {
      if (hashRaw) {
        return `[${label}](#${targetDocId}--${slugify(hashRaw)})`
      }
      return `[${label}](#${targetDocId})`
    }

    return `[${label}](${pathToFileURL(resolvedPath).href})`
  })
}

const prepareDocumentsForExport = async (documents: ExportMarkdownDocument[]) => {
  const withIds: PreparedExportDocument[] = documents.map((document, index) => ({
    ...document,
    docId: toDocId(index, document.sourcePath),
  }))

  const docsByPath = new Map<string, string>()
  for (const document of withIds) {
    if (document.sourcePath) {
      docsByPath.set(normalize(document.sourcePath), document.docId)
    }
  }

  const prepared: PreparedExportDocument[] = []
  for (const document of withIds) {
    const withImages = await rewriteMarkdownImages(document.markdown, document.sourcePath)
    const withLinks = rewriteMarkdownLinks(withImages, document.docId, document.sourcePath, docsByPath)
    prepared.push({
      ...document,
      markdown: withLinks,
    })
  }

  return prepared
}

const buildPdfHtml = (
  documents: PreparedExportDocument[],
  githubCss: string,
  options: ExportOptions,
) => {
  const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
  const defaultValidateLink = md.validateLink
  md.validateLink = (url) => {
    if (/^data:image\//i.test(url)) {
      return true
    }
    return defaultValidateLink(url)
  }
  if (emojiPlugin) {
    md.use(emojiPlugin)
  }
  const defaultFence = md.renderer.rules.fence

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info.trim().toLowerCase()

    if (info === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(token.content)}</div>`
    }

    if (defaultFence) {
      return defaultFence(tokens, idx, options, env, self)
    }

    return self.renderToken(tokens, idx, options)
  }

  const sections = documents
    .map((document, index) => {
      const html = addHeadingIds(withTaskCheckboxes(md.render(normalizeMarkdownInput(document.markdown))), document.docId)
      const metadata: string[] = []
      if (options.includeFileName && document.sourcePath) {
        metadata.push(`<span class="meta-chip">${escapeHtml(basename(document.sourcePath))}</span>`)
      }
      if (options.includeSourcePath && document.sourcePath) {
        metadata.push(`<span class="meta-chip">${escapeHtml(document.sourcePath)}</span>`)
      }
      const source = metadata.length > 0 ? `<p class="source">${metadata.join(' ')}</p>` : ''
      return `
        <section class="doc-section" id="${document.docId}">
          <h1 id="${document.docId}">${index + 1}. ${escapeHtml(document.title)}</h1>
          ${source}
          ${html}
        </section>
      `
    })
    .join('\n')

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Exportacion Markdown</title>
        <style>
          ${githubCss}
          @page { margin: 16mm; }
          body { margin: 0; }
          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 960px;
            margin: 0 auto;
            padding: 24px;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #1f2937;
            line-height: 1.55;
            font-size: 13px;
          }
          .doc-section { page-break-after: always; }
          .doc-section:last-child { page-break-after: auto; }
          .doc-section > h1:first-child {
            margin-top: 0;
            border-bottom: 1px solid #d0d7de;
            padding-bottom: 0.25em;
          }
          .source { color: #64748b; font-size: 11px; margin-top: -2px; }
          .meta-chip {
            display: inline-block;
            margin-right: 6px;
            margin-top: 4px;
            border: 1px solid #d0d7de;
            border-radius: 999px;
            padding: 2px 8px;
          }
          .mermaid {
            display: block;
            overflow-x: auto;
            padding: 8px 0;
          }
          .mermaid svg {
            max-width: 100%;
            height: auto;
          }
          input[type='checkbox'] { transform: translateY(1px); margin-right: 0.5em; }
        </style>
      </head>
      <body>
        <article class="markdown-body">
          ${sections}
        </article>
      </body>
    </html>
  `
}

const exportMarkdownDocumentsToPdf = async (
  event: Electron.IpcMainInvokeEvent,
  payload: { title: string; documents: ExportMarkdownDocument[]; options?: Partial<ExportOptions> },
) => {
  const i18n = getMainI18n(await getResolvedLanguage())
  const exportOptions: ExportOptions = {
    includeSourcePath: payload.options?.includeSourcePath ?? true,
    includeFileName: payload.options?.includeFileName ?? true,
  }
  const sourceWindow = getWindowFromEvent(event)
  const result = sourceWindow
    ? await dialog.showSaveDialog(sourceWindow, {
        title: i18n.export.saveDialogTitle,
        defaultPath: `${payload.title || 'documento'}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
    : await dialog.showSaveDialog({
        title: i18n.export.saveDialogTitle,
        defaultPath: `${payload.title || 'documento'}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })

  if (result.canceled || !result.filePath) {
    return i18n.export.canceled
  }

  if (payload.documents.length === 0) {
    return i18n.export.noDocuments
  }

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  })

  try {
    const preparedDocuments = await prepareDocumentsForExport(payload.documents)
    const githubCss = await readFile(githubMarkdownCssPath, 'utf-8')
    const html = buildPdfHtml(preparedDocuments, githubCss, exportOptions)
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const hasMermaidBlocks = preparedDocuments.some((doc) => doc.markdown.includes('```mermaid'))
    if (hasMermaidBlocks) {
      try {
        const mermaidBundle = await readFile(mermaidBundlePath, 'utf-8')
        await pdfWindow.webContents.executeJavaScript(`(() => { ${mermaidBundle}\n return true })()`, true)
        await pdfWindow.webContents.executeJavaScript(`
          if (window.mermaid) {
            window.mermaid.initialize({ startOnLoad: false, theme: 'default' })
            return window.mermaid
              .run({ nodes: Array.from(document.querySelectorAll('.mermaid')) })
              .then(() => true)
              .catch(() => true)
          }
          return true
        `)
      } catch (error) {
        console.warn('[export:pdf] mermaid no se pudo renderizar, se exporta sin diagramas', error)
      }
    }
    await pdfWindow.webContents.executeJavaScript(
      'document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true'
    )
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'A4',
    })
    await writeFile(result.filePath, pdfBuffer)
    const fileStat = await stat(result.filePath)
    if (fileStat.size <= 0) {
      return i18n.export.genericError
    }

    try {
      shell.showItemInFolder(result.filePath)
    } catch {
      // Ignorar errores de apertura del explorador; el PDF ya fue generado.
    }

    return i18n.export.successPath(result.filePath)
  } finally {
    pdfWindow.destroy()
  }
}

type RegisterIpcHandlersOptions = {
  onWorkspaceHistoryChange?: () => void
  getI18nState?: () => {
    language: SupportedUiLanguage
    preference: UiLanguagePreference
  }
  setI18nPreference?: (preference: UiLanguagePreference) => Promise<void>
}

export const registerIpcHandlers = (options: RegisterIpcHandlersOptions = {}) => {
  const notifyWorkspaceHistoryChange = () => {
    options.onWorkspaceHistoryChange?.()
  }

  ipcMain.handle('app:ping', async () => 'pong')

  ipcMain.handle('i18n:get-state', async () => {
    const state = options.getI18nState?.()
    if (state) {
      return state
    }

    const preference = await getLanguagePreference()
    const language = await getResolvedLanguage()
    return { language, preference }
  })

  ipcMain.handle('i18n:set-preference', async (_event, preference: UiLanguagePreference) => {
    if (options.setI18nPreference) {
      await options.setI18nPreference(preference)
      return
    }

    await setLanguagePreference(preference)
  })

  ipcMain.handle('workspace:last:get', async () => {
    return getValidLastWorkspace()
  })

  ipcMain.handle('workspace:last:set', async (_event, workspacePath: string | null) => {
    await setLastWorkspacePath(workspacePath)
    notifyWorkspaceHistoryChange()
  })

  ipcMain.handle('workspace:recent:list', async () => {
    return getValidRecentWorkspaces()
  })

  ipcMain.handle('workspace:recent:clear', async () => {
    await clearWorkspaceHistory()
    notifyWorkspaceHistoryChange()
  })

  ipcMain.handle('workspace:select', async (event) => {
    const i18n = getMainI18n(await getResolvedLanguage())
    const win = getWindowFromEvent(event)
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: i18n.dialogs.openWorkspaceTitle,
          properties: ['openDirectory', 'createDirectory'],
        })
      : await dialog.showOpenDialog({
          title: i18n.dialogs.openWorkspaceTitle,
          properties: ['openDirectory', 'createDirectory'],
        })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0] ?? null
    if (selectedPath) {
      await setLastWorkspacePath(selectedPath)
      notifyWorkspaceHistoryChange()
    }

    return selectedPath
  })

  ipcMain.handle('workspace:tree', async (_event, workspacePath: string) => {
    return buildWorkspaceTree(workspacePath)
  })

  ipcMain.handle('workspace:file:read', async (_event, payload: { workspacePath: string; filePath: string }) => {
    ensureInsideWorkspace(payload.workspacePath, payload.filePath)
    return readFile(payload.filePath, 'utf-8')
  })

  ipcMain.handle('workspace:file:read-data-url', async (_event, payload: { workspacePath: string; filePath: string }) => {
    ensureInsideWorkspace(payload.workspacePath, payload.filePath)
    const buffer = await readFile(payload.filePath)
    const mime = getMimeTypeForPath(payload.filePath)
    return `data:${mime};base64,${buffer.toString('base64')}`
  })

  ipcMain.handle(
    'workspace:file:write',
    async (_event, payload: { workspacePath: string; filePath: string; content: string }) => {
      ensureInsideWorkspace(payload.workspacePath, payload.filePath)
      await writeFile(payload.filePath, payload.content, 'utf-8')
    }
  )

  ipcMain.handle(
    'workspace:file:create',
    async (_event, payload: { workspacePath: string; folderPath: string; baseName?: string }) => {
      const i18n = getMainI18n(await getResolvedLanguage())
      ensureInsideWorkspace(payload.workspacePath, payload.folderPath)
      await mkdir(payload.folderPath, { recursive: true })
      const filePath = await nextAvailablePath(
        payload.folderPath,
        payload.baseName || i18n.workspace.newDocumentBase,
        '.md'
      )
      await writeFile(filePath, i18n.workspace.newDocumentTitle, 'utf-8')
      return filePath
    }
  )

  ipcMain.handle(
    'workspace:folder:create',
    async (_event, payload: { workspacePath: string; parentPath: string; name?: string }) => {
      const i18n = getMainI18n(await getResolvedLanguage())
      ensureInsideWorkspace(payload.workspacePath, payload.parentPath)
      const baseName = payload.name || i18n.workspace.newFolderBase
      const folderPath = await nextAvailablePath(payload.parentPath, baseName, '')
      await mkdir(folderPath, { recursive: true })
      return folderPath
    }
  )

  ipcMain.handle('workspace:file:delete', async (_event, payload: { workspacePath: string; filePath: string }) => {
    ensureInsideWorkspace(payload.workspacePath, payload.filePath)
    await shell.trashItem(payload.filePath)
  })

  ipcMain.handle(
    'workspace:file:duplicate',
    async (_event, payload: { workspacePath: string; sourcePath: string; destinationFolderPath: string }) => {
      const i18n = getMainI18n(await getResolvedLanguage())
      ensureInsideWorkspace(payload.workspacePath, payload.sourcePath)
      ensureInsideWorkspace(payload.workspacePath, payload.destinationFolderPath)

      const extension = extname(payload.sourcePath)
      const sourceName = basename(payload.sourcePath, extension)
      const destinationPath = await nextAvailablePath(
        payload.destinationFolderPath,
        `${sourceName}-${i18n.workspace.duplicateSuffix}`,
        extension || '.md'
      )
      await copyFile(payload.sourcePath, destinationPath)
      return destinationPath
    }
  )

  ipcMain.handle('workspace:reveal', async (_event, targetPath: string) => {
    if (!targetPath) {
      return
    }
    shell.showItemInFolder(targetPath)
  })

  ipcMain.handle('external:open-url', async (event, url: string) => {
    if (!url) {
      return { opened: false }
    }

    const confirmExternal = await shouldConfirmExternalLinks()
    const language = await getResolvedLanguage()
    const i18n = getMainI18n(language)
    if (!confirmExternal) {
      await shell.openExternal(url)
      return { opened: true }
    }

    const win = getWindowFromEvent(event)
    const result = win
      ? await dialog.showMessageBox(win, {
          type: 'question',
          title: i18n.dialogs.openExternalTitle,
          message: i18n.dialogs.openExternalMessage,
          detail: url,
          buttons: [i18n.dialogs.openExternalConfirm, i18n.dialogs.openExternalCancel],
          defaultId: 0,
          cancelId: 1,
          checkboxLabel: i18n.dialogs.openExternalDontAsk,
          checkboxChecked: false,
        })
      : await dialog.showMessageBox({
          type: 'question',
          title: i18n.dialogs.openExternalTitle,
          message: i18n.dialogs.openExternalMessage,
          detail: url,
          buttons: [i18n.dialogs.openExternalConfirm, i18n.dialogs.openExternalCancel],
          defaultId: 0,
          cancelId: 1,
          checkboxLabel: i18n.dialogs.openExternalDontAsk,
          checkboxChecked: false,
        })

    const shouldOpen = result.response === 0
    if (shouldOpen && result.checkboxChecked) {
      await setConfirmExternalLinks(false)
    }

    if (!shouldOpen) {
      return { opened: false }
    }

    await shell.openExternal(url)
    return { opened: true }
  })

  ipcMain.handle('export:pdf', async (event, payload: ExportPdfPayload) => {
    try {
      const orderedDocuments = await collectLinkedDocumentsInOrder(payload)
      return await exportMarkdownDocumentsToPdf(event, {
        title: payload.title,
        documents: orderedDocuments,
        options: payload.options,
      })
    } catch (error) {
      console.error('[export:pdf] fallo en exportacion', error)
      const i18n = getMainI18n(await getResolvedLanguage())
      return i18n.export.genericError
    }
  })

  ipcMain.handle('export:pdf-folder', async (event, payload: {
    title: string
    documents: ExportMarkdownDocument[]
    options?: Partial<ExportOptions>
  }) => {
    try {
      return await exportMarkdownDocumentsToPdf(event, payload)
    } catch (error) {
      console.error('[export:pdf-folder] fallo en exportacion', error)
      const i18n = getMainI18n(await getResolvedLanguage())
      return i18n.export.folderError
    }
  })

  ipcMain.handle('export:pdf-project', async (event, payload: {
    title: string
    documents: ExportMarkdownDocument[]
    options?: Partial<ExportOptions>
  }) => {
    try {
      return await exportMarkdownDocumentsToPdf(event, payload)
    } catch (error) {
      console.error('[export:pdf-project] fallo en exportacion', error)
      const i18n = getMainI18n(await getResolvedLanguage())
      return i18n.export.projectError
    }
  })

  ipcMain.handle('theme:load', async (event) => {
    const win = getWindowFromEvent(event)
    const result = win
      ? await dialog.showOpenDialog(win, {
          properties: ['openFile'],
          filters: [{ name: 'JSON', extensions: ['json'] }],
        })
      : await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [{ name: 'JSON', extensions: ['json'] }],
        })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as {
      mode: 'light' | 'dark'
      colors: Record<string, string>
      mermaidTheme?: 'neutral' | 'dark'
    }
  })
}
