import { dialog, ipcMain, shell } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

export const registerIpcHandlers = () => {
  ipcMain.handle('app:ping', async () => 'pong')
  ipcMain.handle('workspace:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled) {
      return null
    }

    return result.filePaths[0] ?? null
  })

  ipcMain.handle('workspace:reveal', async (_event, targetPath: string) => {
    if (!targetPath) {
      return
    }
    shell.showItemInFolder(targetPath)
  })

  ipcMain.handle('export:pdf', async (_event, payload: { title: string }) => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar PDF',
      defaultPath: `${payload.title || 'documento'}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })

    if (result.canceled || !result.filePath) {
      return 'Exportacion cancelada'
    }

    return `PDF exportado en ${result.filePath}`
  })

  ipcMain.handle('export:pdf-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Exportar carpeta',
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return 'Exportacion cancelada'
    }

    return `Carpeta exportada en ${result.filePaths[0]}`
  })

  ipcMain.handle('export:pdf-project', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Exportar proyecto',
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return 'Exportacion cancelada'
    }

    const folder = result.filePaths[0]
    const name = basename(folder)
    return `Proyecto ${name} exportado en ${folder}`
  })

  ipcMain.handle('theme:load', async () => {
    const result = await dialog.showOpenDialog({
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
