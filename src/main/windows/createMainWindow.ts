import { BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

const getPreloadPath = () => {
  if (isDev) {
    return path.join(process.cwd(), 'dist/preload/index.js')
  }

  return path.join(__dirname, '../../preload/index.js')
}

export const createMainWindow = () => {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#f7f3ef',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    if (process.env.ELECTRON_DEVTOOLS !== 'false') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  return win
}
