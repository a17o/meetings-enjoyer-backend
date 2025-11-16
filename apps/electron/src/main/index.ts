import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureUserDataDir, loadConfig, loadOverlayState } from './storage'
import { logger, cleanOldLogs, setLoggingEnabled } from './logger'
import { setupIPC } from './ipc'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Disable hardware acceleration for transparency to work properly on some systems
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const COLLAPSED_PILL_WIDTH = 300 // Pill width - needs margin
const COLLAPSED_PILL_HEIGHT = 90 // Pill height - needs margin for 60px pill + shadow
const TRANSCRIPT_COLLAPSED_WIDTH = 400 // Width when only showing controls
const TRANSCRIPT_EXPANDED_WIDTH = 650 // Width when showing transcript + controls
const WINDOW_HEIGHT = 900
const MIN_WIDTH = 300 // Allow small pill size
const MIN_HEIGHT = 90

async function createWindow(): Promise<void> {
  // Load persisted state
  const overlayState = await loadOverlayState()
  const config = await loadConfig()

  // Set logging based on config
  if (config.logToFile !== undefined) {
    setLoggingEnabled(config.logToFile)
  }

  // Get primary display dimensions
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.workAreaSize

  // Start in collapsed (pill) mode by default
  const windowWidth = COLLAPSED_PILL_WIDTH
  const windowHeight = COLLAPSED_PILL_HEIGHT
  const x = Math.floor((screenWidth - windowWidth) / 2) // Center for pill
  const y = 12 // Top margin

  logger.info('Creating main window', {
    collapsed: overlayState.collapsed,
    bounds: { x, y, width: windowWidth, height: windowHeight },
  })

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    transparent: true,
    frame: false,
    titleBarStyle: 'hidden', // Hide traffic lights completely
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    resizable: true,
    fullscreenable: false,
    hasShadow: true,
    backgroundColor: '#00000000',
    // vibrancy causes white background bug on macOS - removed
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, './index.mjs'),
      backgroundThrottling: false,
    },
  })

  // Hide traffic light buttons on macOS
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false)
  }

  // Always on top across all spaces
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  // Setup IPC handlers
  setupIPC(mainWindow)

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    // Open devtools in development
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // In production, index.html is in the dist folder in the asar
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Register global hotkey: Alt/Cmd+Space to toggle collapse
  const toggleShortcut = process.platform === 'darwin' ? 'Command+Space' : 'Alt+Space'

  globalShortcut.register(toggleShortcut, () => {
    logger.debug('Global hotkey triggered: toggle collapse')
    mainWindow?.webContents.send('toggle-collapse')
  })

  // Re-assert always-on-top on blur/focus
  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    }
  })

  mainWindow.on('focus', () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  logger.info('Main window created successfully')
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    await ensureUserDataDir()
    await cleanOldLogs()
    await createWindow()

    // Listen for display metrics changes (must be after app ready)
    screen.on('display-metrics-changed', async () => {
      logger.info('Display metrics changed, re-docking window')
      if (mainWindow) {
        const display = screen.getPrimaryDisplay()
        const { width: screenWidth, height: screenHeight } = display.workArea
        const currentWidth = mainWindow.getBounds().width
        const windowHeight = Math.min(WINDOW_HEIGHT, screenHeight - 24) // 12px top + 12px bottom margin
        const x = screenWidth - currentWidth // Maintain current width
        const y = 12 // Safe margin for notch

        mainWindow.setBounds({ x, y, width: currentWidth, height: windowHeight })
      }
    })

    screen.on('display-added', () => {
      logger.info('Display added')
      screen.emit('display-metrics-changed')
    })

    screen.on('display-removed', () => {
      logger.info('Display removed')
      screen.emit('display-metrics-changed')
    })
  } catch (error) {
    logger.error('Failed to initialize app', error)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Clean up global shortcuts
  globalShortcut.unregisterAll()

  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // Clean up global shortcuts
  globalShortcut.unregisterAll()
  logger.info('App is quitting')
})

// Handle errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason)
})
