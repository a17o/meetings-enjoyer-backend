import { create } from 'zustand'
import { createUISlice, type UISlice } from './uiSlice'
import { createSessionSlice, type SessionSlice } from './sessionSlice'
import { createTranscriptSlice, type TranscriptSlice } from './transcriptSlice'
import { createAnswersSlice, type AnswersSlice } from './answersSlice'
import { createTasksSlice, type TasksSlice } from './tasksSlice'
import { createSettingsSlice, type SettingsSlice } from './settingsSlice'

export type AppStore = UISlice & SessionSlice & TranscriptSlice & AnswersSlice & TasksSlice & SettingsSlice

export const useStore = create<AppStore>()((...args) => ({
  ...createUISlice(...args),
  ...createSessionSlice(...args),
  ...createTranscriptSlice(...args),
  ...createAnswersSlice(...args),
  ...createTasksSlice(...args),
  ...createSettingsSlice(...args),
}))

// Convenience selectors
export const selectConnectionStatus = (state: AppStore) => state.connectionStatus
export const selectCollapsed = (state: AppStore) => state.collapsed
export const selectAgentStatus = (state: AppStore) => state.agentStatus
export const selectCurrentAnswer = (state: AppStore) => state.current
export const selectTranscriptLines = (state: AppStore) => {
  if (state.filter === 'commands') {
    return state.lines.filter((line) => line.wake)
  }
  return state.lines
}
export const selectSettings = (state: AppStore) => state.settings
