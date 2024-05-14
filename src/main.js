import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeTheme, session, shell } from 'electron'
import log from 'electron-log'
import Store from 'electron-store'
import updater from 'electron-updater'

import * as path from 'node:path'
import * as fs from 'node:fs'

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

log.info(`Starting Numara... [v${app.getVersion()}] ${app.isPackaged ? '' : '(Dev)'}`)
log.initialize({ spyRendererConsole: true })
log.errorHandler.startCatching()
log.eventLogger.startLogging()

const { autoUpdater } = updater

autoUpdater.logger = log

const schema = {
  appHeight: { type: 'number', default: 480 },
  appWidth: { type: 'number', default: 560 },
  fullSize: { type: 'boolean', default: false },
  theme: { type: 'string', default: 'system' }
}

const config = new Store({ schema, clearInvalidConfig: true, fileExtension: '' })

const theme = config.get('theme')

const dark = '#1f1f1f'
const light = '#ffffff'

let win

function appWindow() {
  win = new BrowserWindow({
    backgroundColor:
      theme === 'system' ? (nativeTheme.shouldUseDarkColors ? dark : light) : theme === 'dark' ? dark : light,
    frame: false,
    hasShadow: true,
    height: parseInt(config.get('appHeight')),
    width: parseInt(config.get('appWidth')),
    minHeight: 360,
    minWidth: 420,
    paintWhenInitiallyHidden: false,
    show: false,
    titleBarStyle: 'hiddenInset',
    useContentSize: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.cjs'),
      spellcheck: false
    }
  })

  win.loadFile('build/index.html')

  win.webContents.on('did-finish-load', () => {
    if (config.get('fullSize') & (process.platform === 'win32')) {
      win.webContents.send('fullscreen', true)
    }

    win.setHasShadow(true)
    win.show()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)

    return { action: 'deny' }
  })

  win.on('close', () => {
    config.set('fullSize', win.isMaximized())

    if (!win.isMaximized()) {
      config.set('appWidth', win.getSize()[0])
      config.set('appHeight', win.getSize()[1])
    }
  })

  win.on('maximize', () => win.webContents.send('isMax', true))
  win.on('unmaximize', () => win.webContents.send('isMax', false))

  if (app.isPackaged) {
    win.on('focus', () => globalShortcut.registerAll(['CommandOrControl+R', 'F5'], () => {}))
    win.on('blur', () => globalShortcut.unregisterAll())
  }
}

app.setAppUserModelId(app.name)

app.whenReady().then(appWindow)

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => win.focus())
}

nativeTheme.on('updated', () => win.webContents.send('themeUpdate', nativeTheme.shouldUseDarkColors))

ipcMain.on('isDark', (event) => (event.returnValue = nativeTheme.shouldUseDarkColors))
ipcMain.on('setTheme', (event, mode) => config.set('theme', mode))
ipcMain.on('setOnTop', (event, bool) => win.setAlwaysOnTop(bool))
ipcMain.on('close', () => app.quit())
ipcMain.on('minimize', () => win.minimize())
ipcMain.on('maximize', () => win.maximize())
ipcMain.on('unmaximize', () => win.unmaximize())
ipcMain.on('isMaximized', (event) => (event.returnValue = win.isMaximized()))
ipcMain.on('isResized', (event) => {
  event.returnValue = win.getSize()[0] !== schema.appWidth.default || win.getSize()[1] !== schema.appHeight.default
})

ipcMain.on('import', (event) => {
  const file = dialog.showOpenDialogSync(win, {
    filters: [{ name: 'Numara', extensions: ['numara'] }],
    properties: ['openFile'],
    title: 'Open Calculations'
  })

  if (file) {
    fs.readFile(file[0], 'utf8', (error, data) => {
      if (error) {
        event.sender.send('importDataError', error)

        return
      }

      event.sender.send('importData', data, 'Imported from: ' + file[0])
    })
  }
})

ipcMain.on('export', (event, fileName, content) => {
  const file = dialog.showSaveDialogSync(win, {
    defaultPath: fileName,
    filters: [{ name: 'Numara', extensions: ['numara'] }],
    title: 'Export Calculations'
  })

  if (file) {
    fs.writeFile(file, content, (error) => {
      if (error) {
        event.sender.send('exportDataError', error)

        return
      }

      event.sender.send('exportData', 'Exported to: ' + file)
    })
  }
})

function resetSize() {
  if (win) {
    win.setSize(schema.appWidth.default, schema.appHeight.default)
  }
}

ipcMain.on('resetSize', resetSize)

ipcMain.on('resetApp', () => {
  session.defaultSession.clearStorageData().then(() => {
    config.clear()
    app.relaunch()
    app.exit()
  })
})

ipcMain.on('openDevTools', () => win.webContents.openDevTools())

const contextHeader = (index, isMultiLine, hasAnswer) =>
  hasAnswer || index !== null
    ? [
        { label: isMultiLine ? 'Multiple lines:' : `Line ${+index + 1}:`, enabled: false, click: () => {} },
        { type: 'separator' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' }
      ]
    : [{ label: '', visible: false }]

const commonContext = (event, index, isEmpty, isSelection, isMultiLine, hasAnswer) => {
  const context = [
    {
      label: 'Copy line',
      enabled: hasAnswer && !isMultiLine,
      click: () => event.sender.send('copyLine', index, false)
    },
    {
      label: 'Copy answer',
      enabled: hasAnswer && !isMultiLine,
      click: () => event.sender.send('copyAnswer', index, false)
    },
    {
      label: 'Copy line with answer',
      enabled: hasAnswer && !isMultiLine,
      click: () => event.sender.send('copyLineWithAnswer', index, true)
    }
  ]

  return [
    ...context,
    { type: 'separator' },
    {
      label: 'Copy all lines',
      enabled: !isEmpty,
      click: () => event.sender.send('copyAllLines')
    },
    {
      label: 'Copy all answers',
      enabled: !isEmpty,
      click: () => event.sender.send('copyAllAnswers')
    },
    {
      label: 'Copy all lines with answers',
      enabled: !isEmpty,
      click: () => event.sender.send('copyAll')
    }
  ]
}

ipcMain.on('inputContextMenu', (event, index, isEmpty, isLine, isSelection, isMultiLine, hasAnswer) => {
  const contextMenuTemplate = [
    ...contextHeader(index, isMultiLine, hasAnswer),
    ...commonContext(event, index, isEmpty, isSelection, isMultiLine, hasAnswer)
  ]

  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate)

  contextMenu.popup()
})

ipcMain.on('outputContextMenu', (event, index, isEmpty, hasAnswer) => {
  const contextMenuTemplate = [
    ...contextHeader(index, false, hasAnswer),
    ...commonContext(event, index, isEmpty, false, false, hasAnswer)
  ]

  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate)

  contextMenu.popup()
})

ipcMain.on('textboxContextMenu', () => {
  const contextMenuTemplate = [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }]
  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate)

  contextMenu.popup()
})

ipcMain.on('checkUpdate', () => {
  autoUpdater.checkForUpdatesAndNotify()
})

ipcMain.on('updateApp', () => setImmediate(() => autoUpdater.quitAndInstall(true, true)))

autoUpdater.on('checking-for-update', () => win.webContents.send('updateStatus', 'Checking for update...'))
autoUpdater.on('update-available', () => win.webContents.send('notifyUpdate'))
autoUpdater.on('update-not-available', () => win.webContents.send('updateStatus', app.name + ' is up to date.'))
autoUpdater.on('error', () => {
  win.webContents.send('updateStatus', 'Error checking for update.')
})
autoUpdater.on('update-downloaded', () => win.webContents.send('updateStatus', 'ready'))
autoUpdater.on('download-progress', (progress) => {
  win.webContents.send('updateStatus', 'Downloading latest version... (' + Math.round(progress.percent) + '%)')
})

const menuTemplate = [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'Import',
        click: () => {
          win.webContents.send('import')
        }
      },
      {
        label: 'Export',
        click: () => {
          win.webContents.send('export')
        }
      },
      { type: 'separator' },
      {
        label: 'Print',
        click: () => {
          win.webContents.send('print')
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { role: 'togglefullscreen' },
      {
        label: 'Reset Size',
        click: () => {
          resetSize()
        }
      },
      { type: 'separator' },
      { role: 'front' },
      { type: 'separator' },
      { role: 'window' }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: () => shell.openExternal('https://github.com/bornova/numara-calculator')
      },
      { type: 'separator' },
      { role: 'toggleDevTools' }
    ]
  }
]

Menu.setApplicationMenu(
  process.platform === 'darwin' || process.platform === 'linux' ? Menu.buildFromTemplate(menuTemplate) : null
)
