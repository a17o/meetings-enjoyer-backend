import type { StateCreator } from 'zustand'
import type { AppSettings } from '../types'

export interface SettingsSlice {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  backendUrl: 'ws://localhost:9001',
  authToken: '',
  agentName: 'Lara',
  wakePhrase: 'hey lara',
  autoScrollTranscript: true,
  confirmBeforeSpeaking: true,
  autoRaiseHandHint: true,
  logToFile: true,
  mockMode: true,
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  // Initial state
  settings: { ...DEFAULT_SETTINGS },

  // Actions
  updateSettings: (updates) => {
    set((state) => {
      const newSettings = { ...state.settings, ...updates }

      // Persist to Electron
      window.electronAPI.saveConfig({
        backendUrl: newSettings.backendUrl,
        authToken: newSettings.authToken,
        agentName: newSettings.agentName,
        wakePhrase: newSettings.wakePhrase,
        autoScrollTranscript: newSettings.autoScrollTranscript,
        confirmBeforeSpeaking: newSettings.confirmBeforeSpeaking,
        autoRaiseHandHint: newSettings.autoRaiseHandHint,
        logToFile: newSettings.logToFile,
        mockMode: newSettings.mockMode,
      })

      return { settings: newSettings }
    })
  },

  resetSettings: () => {
    set({ settings: { ...DEFAULT_SETTINGS } })
    window.electronAPI.saveConfig(DEFAULT_SETTINGS)
  },
})
