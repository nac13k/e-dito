import { app, BrowserWindow, dialog, Menu, shell } from 'electron'

import { clearWorkspaceHistory, getValidRecentWorkspaces } from '../workspaceConfig.js'
import { getMainI18n } from '../i18n.js'
import type { SupportedUiLanguage, UiLanguagePreference } from '../workspaceConfig.js'

const getTargetWindow = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null

const sendWorkspaceOpenRequest = (workspacePath: string | null) => {
  const targetWindow = getTargetWindow()
  targetWindow?.webContents.send('workspace:open-request', workspacePath)
}

const sendMenuEditAction = (action: 'undo' | 'redo') => {
  const targetWindow = getTargetWindow()
  targetWindow?.webContents.send('menu:edit-action', action)
}

const handleOpenWorkspace = async (openTitle: string) => {
  const targetWindow = getTargetWindow()
  const result = targetWindow
    ? await dialog.showOpenDialog(targetWindow, {
        title: openTitle,
        properties: ['openDirectory', 'createDirectory'],
      })
    : await dialog.showOpenDialog({
        title: openTitle,
        properties: ['openDirectory', 'createDirectory'],
      })

  if (!result.canceled && result.filePaths[0]) {
    sendWorkspaceOpenRequest(result.filePaths[0])
  }
}

const buildRecentWorkspaceSubmenu = async (
  labels: { clearRecent: string; noRecent: string }
): Promise<Electron.MenuItemConstructorOptions[]> => {
  const recentWorkspaces = await getValidRecentWorkspaces()
  const recentItems = recentWorkspaces.map((workspacePath) => ({
    label: workspacePath,
    click: () => sendWorkspaceOpenRequest(workspacePath),
  }))

  const clearHistoryItem = {
    label: labels.clearRecent,
    click: () => {
      void clearWorkspaceHistory().then(() => {
        sendWorkspaceOpenRequest(null)
      })
    },
  }

  if (recentItems.length === 0) {
    return [
      { label: labels.noRecent, enabled: false },
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

type BuildApplicationMenuOptions = {
  language: SupportedUiLanguage
  languagePreference: UiLanguagePreference
  onLanguagePreferenceChange: (preference: UiLanguagePreference) => void
}

export const buildApplicationMenu = async (options: BuildApplicationMenuOptions) => {
  const labels = getMainI18n(options.language)
  const recentSubmenu = await buildRecentWorkspaceSubmenu({
    clearRecent: labels.menu.clearRecentWorkspaces,
    noRecent: labels.menu.noRecentWorkspaces,
  })
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
      label: labels.menu.openWorkspace,
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        void handleOpenWorkspace(labels.dialogs.openWorkspaceTitle)
      },
    },
    {
      label: labels.menu.openRecentWorkspace,
      submenu: recentSubmenu,
    },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ]

  template.push(
    {
      label: labels.menu.file,
      submenu: fileSubmenu,
    },
    {
      label: labels.menu.edit,
      submenu: [
        {
          label: labels.menu.undo,
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendMenuEditAction('undo'),
        },
        {
          label: labels.menu.redo,
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => sendMenuEditAction('redo'),
        },
        { type: 'separator' },
        { role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { label: labels.menu.pasteKeepFormat, role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { label: labels.menu.pastePlainText, role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' },
        { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
        { type: 'separator' },
        {
          label: labels.menu.language,
          submenu: [
            {
              label: labels.menu.languageSystem,
              type: 'radio',
              checked: options.languagePreference === 'system',
              click: () => options.onLanguagePreferenceChange('system'),
            },
            {
              label: 'Espanol (Mexico)',
              type: 'radio',
              checked: options.languagePreference === 'es-MX',
              click: () => options.onLanguagePreferenceChange('es-MX'),
            },
            {
              label: 'English (United States)',
              type: 'radio',
              checked: options.languagePreference === 'en-US',
              click: () => options.onLanguagePreferenceChange('en-US'),
            },
          ],
        },
      ],
    },
    {
      label: labels.menu.window,
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }],
    },
    {
      label: labels.menu.help,
      submenu: [
        {
          label: labels.menu.docs,
          click: () => {
            void shell.openExternal('https://github.com')
          },
        },
      ],
    },
  )

  if (!isMac) {
    template.push({
      label: labels.menu.app,
      submenu: [{ role: 'about' }, { role: 'quit' }],
    })
  }

  return Menu.buildFromTemplate(template)
}
