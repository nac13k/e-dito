import { app, BrowserWindow, Menu, nativeImage } from 'electron'

import { registerIpcHandlers } from './ipc/registerHandlers.js'
import { buildApplicationMenu } from './menu/createAppMenu.js'
import { createMainWindow, getAppIconPath } from './windows/createMainWindow.js'

app.whenReady().then(() => {
  const refreshMenu = async () => {
    const menu = await buildApplicationMenu()
    Menu.setApplicationMenu(menu)
  }

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAppIconPath())
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }

  registerIpcHandlers({
    onWorkspaceHistoryChange: () => {
      void refreshMenu()
    },
  })
  void refreshMenu()
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
