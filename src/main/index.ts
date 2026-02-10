import { app, BrowserWindow, Menu, nativeImage } from 'electron'

import { registerIpcHandlers } from './ipc/registerHandlers.js'
import { buildApplicationMenu } from './menu/createAppMenu.js'
import {
  getLanguagePreference,
  getResolvedLanguage,
  resolveLanguageFromPreference,
  setLanguagePreference,
  type UiLanguagePreference,
} from './workspaceConfig.js'
import { createMainWindow, getAppIconPath } from './windows/createMainWindow.js'

app.whenReady().then(() => {
  let languagePreference: UiLanguagePreference = 'system'
  let resolvedLanguage = resolveLanguageFromPreference(languagePreference)

  const refreshMenu = async () => {
    const menu = await buildApplicationMenu({
      language: resolvedLanguage,
      languagePreference,
      onLanguagePreferenceChange: (nextPreference) => {
        void setLanguagePreference(nextPreference).then(async () => {
          languagePreference = nextPreference
          resolvedLanguage = await getResolvedLanguage()
          void refreshMenu()
          BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send('i18n:changed', {
              language: resolvedLanguage,
              preference: languagePreference,
            })
          })
        })
      },
    })
    Menu.setApplicationMenu(menu)
  }

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAppIconPath())
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }

  void getLanguagePreference().then(async (preference) => {
    languagePreference = preference
    resolvedLanguage = await getResolvedLanguage()

    registerIpcHandlers({
      onWorkspaceHistoryChange: () => {
        void refreshMenu()
      },
      getI18nState: () => ({
        language: resolvedLanguage,
        preference: languagePreference,
      }),
      setI18nPreference: async (preferenceValue) => {
        await setLanguagePreference(preferenceValue)
        languagePreference = preferenceValue
        resolvedLanguage = await getResolvedLanguage()
        void refreshMenu()
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send('i18n:changed', {
            language: resolvedLanguage,
            preference: languagePreference,
          })
        })
      },
    })

    void refreshMenu()
    createMainWindow()
  })

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
