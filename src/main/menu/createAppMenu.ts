import { app, BrowserWindow, dialog, Menu, shell } from 'electron'

import { clearWorkspaceHistory, getValidRecentWorkspaces } from '../workspaceConfig.js'

const getTargetWindow = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null

const sendWorkspaceOpenRequest = (workspacePath: string | null) => {
  const targetWindow = getTargetWindow()
  targetWindow?.webContents.send('workspace:open-request', workspacePath)
}

const sendMenuEditAction = (action: 'undo' | 'redo') => {
  const targetWindow = getTargetWindow()
  targetWindow?.webContents.send('menu:edit-action', action)
}

const handleOpenWorkspace = async () => {
  const targetWindow = getTargetWindow()
  const result = targetWindow
    ? await dialog.showOpenDialog(targetWindow, {
        title: 'Abrir workspace',
        properties: ['openDirectory', 'createDirectory'],
      })
    : await dialog.showOpenDialog({
        title: 'Abrir workspace',
        properties: ['openDirectory', 'createDirectory'],
      })

  if (!result.canceled && result.filePaths[0]) {
    sendWorkspaceOpenRequest(result.filePaths[0])
  }
}

const buildRecentWorkspaceSubmenu = async (): Promise<Electron.MenuItemConstructorOptions[]> => {
  const recentWorkspaces = await getValidRecentWorkspaces()
  const recentItems = recentWorkspaces.map((workspacePath) => ({
    label: workspacePath,
    click: () => sendWorkspaceOpenRequest(workspacePath),
  }))

  const clearHistoryItem = {
    label: 'Clear Recent Workspaces',
    click: () => {
      void clearWorkspaceHistory().then(() => {
        sendWorkspaceOpenRequest(null)
      })
    },
  }

  if (recentItems.length === 0) {
    return [
      { label: 'No Recent Workspaces', enabled: false },
      { type: 'separator' as const },
      clearHistoryItem,
    ]
  }

  return [
    ...recentItems,
    { type: 'separator' as const },
    clearHistoryItem,
  ]
}

export const buildApplicationMenu = async () => {
  const recentSubmenu = await buildRecentWorkspaceSubmenu()
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = []

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  const fileSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Open Workspace...',
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        void handleOpenWorkspace()
      },
    },
    {
      label: 'Open Recent Workspace',
      submenu: recentSubmenu,
    },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ]

  template.push(
    {
      label: 'File',
      submenu: fileSubmenu,
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendMenuEditAction('undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => sendMenuEditAction('redo'),
        },
        { type: 'separator' },
        { role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { label: 'Paste (Keep Format)', role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { label: 'Paste as Plain Text', role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' },
        { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'E-Dito Docs',
          click: () => {
            void shell.openExternal('https://github.com')
          },
        },
      ],
    },
  )

  if (!isMac) {
    template.push({
      label: 'App',
      submenu: [{ role: 'about' }, { role: 'quit' }],
    })
  }

  return Menu.buildFromTemplate(template)
}
