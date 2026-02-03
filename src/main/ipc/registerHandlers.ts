import { dialog, ipcMain, shell } from 'electron'
import { readFile } from 'node:fs/promises'

export const registerIpcHandlers = () => {
  ipcMain.handle('app:ping', async () => 'pong')
  ipcMain.handle('workspace:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: '/workspace',
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
    return `PDF exportado: ${payload.title || 'documento'}`
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
