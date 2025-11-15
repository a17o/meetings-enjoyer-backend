import type { StateCreator } from 'zustand'
import type { UIState, ToastNotification } from '../types'

export interface UISlice extends UIState {
  toasts: ToastNotification[]
  transcriptCollapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  setTranscriptCollapsed: (collapsed: boolean) => void
  toggleTranscript: () => void
  setHotZoneActive: (active: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setJoinCallModalOpen: (open: boolean) => void
  addToast: (type: ToastNotification['type'], message: string) => void
  removeToast: (id: string) => void
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  // Initial state
  collapsed: true, // Start in collapsed pill mode by default
  transcriptCollapsed: true, // Transcript starts hidden
  hotZoneActive: false,
  settingsOpen: false,
  joinCallModalOpen: false,
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  toasts: [],

  // Actions
  setCollapsed: (collapsed) => {
    set({ collapsed })
    // Call Electron API to update window
    window.electronAPI.setCollapsed(collapsed)
  },

  toggleCollapsed: () => {
    set((state) => {
      const newCollapsed = !state.collapsed
      window.electronAPI.setCollapsed(newCollapsed)
      return { collapsed: newCollapsed }
    })
  },

  setTranscriptCollapsed: (collapsed) => {
    set({ transcriptCollapsed: collapsed })
    // Call Electron API to update window width
    window.electronAPI.setTranscriptCollapsed(collapsed)
  },

  toggleTranscript: () => {
    set((state) => {
      const newCollapsed = !state.transcriptCollapsed
      window.electronAPI.setTranscriptCollapsed(newCollapsed)
      return { transcriptCollapsed: newCollapsed }
    })
  },

  setHotZoneActive: (active) => set({ hotZoneActive: active }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setJoinCallModalOpen: (open) => set({ joinCallModalOpen: open }),

  addToast: (type, message) => {
    const id = `toast_${Date.now()}`
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, ts: Date.now() }],
    }))

    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 5000)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
})
