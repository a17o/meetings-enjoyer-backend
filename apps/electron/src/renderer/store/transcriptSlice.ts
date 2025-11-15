import type { StateCreator } from 'zustand'
import type { TranscriptState, TranscriptLine } from '../types'

const MAX_TRANSCRIPT_LINES = 200

export interface TranscriptSlice extends TranscriptState {
  addTranscriptLine: (line: TranscriptLine) => void
  updateTranscriptLine: (id: string, update: Partial<TranscriptLine>) => void
  setFilter: (filter: 'all' | 'commands') => void
  clearTranscript: () => void
}

export const createTranscriptSlice: StateCreator<TranscriptSlice> = (set) => ({
  // Initial state
  lines: [],
  filter: 'all',
  maxLines: MAX_TRANSCRIPT_LINES,

  // Actions
  addTranscriptLine: (line) => {
    set((state) => {
      // Check if line already exists (partial update)
      const existingIndex = state.lines.findIndex((l) => l.id === line.id)

      if (existingIndex >= 0) {
        // Update existing line
        const newLines = [...state.lines]
        newLines[existingIndex] = { ...newLines[existingIndex], ...line }
        return { lines: newLines }
      }

      // Add new line
      const newLines = [...state.lines, line]

      // Prune to max lines (keep most recent)
      if (newLines.length > state.maxLines) {
        newLines.shift()
      }

      return { lines: newLines }
    })
  },

  updateTranscriptLine: (id, update) => {
    set((state) => ({
      lines: state.lines.map((line) => (line.id === id ? { ...line, ...update } : line)),
    }))
  },

  setFilter: (filter) => set({ filter }),

  clearTranscript: () => set({ lines: [] }),
})
