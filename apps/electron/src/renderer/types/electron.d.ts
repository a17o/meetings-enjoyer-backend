import type { StoredConfig, StoredOverlay } from '../../main/storage'

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

export {}
