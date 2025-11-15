import type { StateCreator } from 'zustand'
import type { AppSettings } from '../types'

export interface SettingsSlice {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  backendUrl: 'ws://localhost:8080/ws',  // Default to API websocket endpoint
  authToken: '',
  agentName: 'Lara',
  wakePhrase: 'hey lara',
  autoScrollTranscript: true,
  confirmBeforeSpeaking: true,
  autoRaiseHandHint: true,
  logToFile: true,
  mockMode: false,  // Default to API mode
  callId: '1234',  // Default call_id
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
        callId: newSettings.callId || '',
      })

      return { settings: newSettings }
    })
  },

  resetSettings: () => {
    set({ settings: { ...DEFAULT_SETTINGS } })
    window.electronAPI.saveConfig(DEFAULT_SETTINGS)
  },
})
