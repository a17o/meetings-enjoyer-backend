import { BrowserWindow, ipcMain, screen } from 'electron'
import { saveConfig, saveOverlayState, type StoredConfig, type StoredOverlay, getUserDataPath } from './storage'
import { logger } from './logger'

export function setupIPC(mainWindow: BrowserWindow): void {
  // Handle collapse/expand state changes (pill mode vs sidebar mode)
  ipcMain.handle('set-collapsed', async (_event, collapsed: boolean) => {
    logger.debug(`Setting collapsed state: ${collapsed}`)

    const display = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = display.workAreaSize

    if (collapsed) {
      // Pill at top-center - optimized size with margin
      const pillWidth = 300 // Window width (pill 280 + 10px margin each side)
      const pillHeight = 90 // Window height (pill 60px + margins + shadow)
      const x = Math.floor((screenWidth - pillWidth) / 2) // Center horizontally
      const y = 12 // Top margin

      mainWindow.setBounds({
        x,
        y,
        width: pillWidth,
        height: pillHeight,
      })
    } else {
      // Right-docked sidebar (transcript collapsed by default)
      const sidebarWidth = 400
      const sidebarHeight = Math.min(900, screenHeight - 24)
      const x = screenWidth - sidebarWidth
      const y = 12

      mainWindow.setBounds({
        x,
        y,
        width: sidebarWidth,
        height: sidebarHeight,
      })
    }

    // Save state
    await saveOverlayState({
      collapsed,
      bounds: mainWindow.getBounds(),
    })
  })

  // Handle transcript collapse/expand
  ipcMain.handle('set-transcript-collapsed', async (_event, transcriptCollapsed: boolean) => {
    logger.debug(`Setting transcript collapsed state: ${transcriptCollapsed}`)

    const display = screen.getPrimaryDisplay()
    const { width: screenWidth } = display.workAreaSize

    const currentBounds = mainWindow.getBounds()
    const newWidth = transcriptCollapsed ? 400 : 650

    // Keep window docked to right edge
    const newX = screenWidth - newWidth

    mainWindow.setBounds({
      ...currentBounds,
      x: newX,
      width: newWidth,
    })
  })

  // Handle chat/notification pill open/close in collapsed mode
  ipcMain.handle('set-chat-open', async (_event, isOpen: boolean) => {
    logger.debug(`Setting dropdown pill open state: ${isOpen}`)

    const display = screen.getPrimaryDisplay()
    const { width: screenWidth } = display.workAreaSize

    const currentBounds = mainWindow.getBounds()

    if (isOpen) {
      // Expand to fit dropdown pill (notification or chat)
      const pillWidth = 360 // Max width with margin (320 + 20px each side)
      const pillHeight = 400 // Main pill (56) + gap (8) + dropdown (316) + margins
      const x = Math.floor((screenWidth - pillWidth) / 2)
      const y = 12

      mainWindow.setBounds({
        x,
        y,
        width: pillWidth,
        height: pillHeight,
      })
    } else {
      // Shrink back to just main pill
      const pillWidth = 300 // With margin
      const pillHeight = 90 // With margin + shadow
      const x = Math.floor((screenWidth - pillWidth) / 2)
      const y = 12

      mainWindow.setBounds({
        x,
        y,
        width: pillWidth,
        height: pillHeight,
      })
    }
  })

  // Handle mouse event forwarding
  ipcMain.handle('set-ignore-mouse', (_event, ignore: boolean, options?: { forward?: boolean }) => {
    logger.debug(`Setting ignore mouse events: ${ignore}`, options)
    mainWindow.setIgnoreMouseEvents(ignore, options)
  })

  // Get user data path
  ipcMain.handle('get-user-data-path', () => {
    return getUserDataPath()
  })

  // Get app version
  ipcMain.handle('get-version', () => {
    return process.env.npm_package_version || '0.1.0'
  })

  // Save configuration
  ipcMain.handle('save-config', async (_event, config: StoredConfig) => {
    logger.info('Saving configuration')
    await saveConfig(config)
  })

  // Save overlay state
  ipcMain.handle('save-overlay', async (_event, state: StoredOverlay) => {
    logger.debug('Saving overlay state', state)
    await saveOverlayState(state)
  })

  // Set focusable
  ipcMain.handle('set-focusable', (_event, focusable: boolean) => {
    logger.debug(`Setting focusable: ${focusable}`)
    mainWindow.setFocusable(focusable)
  })

  // Get screen dimensions
  ipcMain.handle('get-screen-dimensions', () => {
    const { screen } = require('electron')
    const display = screen.getPrimaryDisplay()
    return {
      width: display.workAreaSize.width,
      height: display.workAreaSize.height,
    }
  })
}
