import { app, BrowserWindow } from 'electron'

import { registerIpcHandlers } from './ipc/registerHandlers.js'
import { createMainWindow } from './windows/createMainWindow.js'

app.whenReady().then(() => {
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
