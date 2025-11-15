import { contextBridge, ipcRenderer } from 'electron'
import type { StoredConfig, StoredOverlay } from '../main/storage'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Overlay controls
  setCollapsed: (collapsed: boolean) => ipcRenderer.invoke('set-collapsed', collapsed),
  setTranscriptCollapsed: (collapsed: boolean) => ipcRenderer.invoke('set-transcript-collapsed', collapsed),
  setChatOpen: (open: boolean) => ipcRenderer.invoke('set-chat-open', open),
  setIgnoreMouse: (ignore: boolean, options?: { forward?: boolean }) =>
    ipcRenderer.invoke('set-ignore-mouse', ignore, options),
  setFocusable: (focusable: boolean) => ipcRenderer.invoke('set-focusable', focusable),

  // Data persistence
  saveConfig: (config: StoredConfig) => ipcRenderer.invoke('save-config', config),
  saveOverlay: (state: StoredOverlay) => ipcRenderer.invoke('save-overlay', state),

  // System info
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  getScreenDimensions: () => ipcRenderer.invoke('get-screen-dimensions'),

  // Event listeners
  onToggleCollapse: (callback: () => void) => {
    ipcRenderer.on('toggle-collapse', callback)
  },
  removeToggleCollapseListener: () => {
    ipcRenderer.removeAllListeners('toggle-collapse')
  },
})

// TypeScript declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      setCollapsed: (collapsed: boolean) => Promise<void>
      setTranscriptCollapsed: (collapsed: boolean) => Promise<void>
      setChatOpen?: (open: boolean) => Promise<void>
      setIgnoreMouse: (ignore: boolean, options?: { forward?: boolean }) => Promise<void>
      setFocusable: (focusable: boolean) => Promise<void>
      saveConfig: (config: StoredConfig) => Promise<void>
      saveOverlay: (state: StoredOverlay) => Promise<void>
      getUserDataPath: () => Promise<string>
      getVersion: () => Promise<string>
      getScreenDimensions: () => Promise<{ width: number; height: number }>
      onToggleCollapse: (callback: () => void) => void
      removeToggleCollapseListener: () => void
    }
  }
}
