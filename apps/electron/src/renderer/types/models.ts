import type { AgentStatus, AnswerStatus, CallStatus, ConnectionStatus, SourceRef, TaskStatus } from './contracts'

export interface Session {
  sessionId: string | null
  callSid?: string
  meetingLabel?: string
  agentName: string
}

export interface TranscriptLine {
  id: string
  ts: number
  text: string
  partial: boolean
  speaker?: string
  wake?: boolean
}

export interface Command {
  commandId: string
  tsStart: number
  method: 'wake' | 'forced'
  tsEnd?: number
}

export interface Answer {
  answerId: string
  commandId: string
  ts: number
  text: string
  sources?: SourceRef[]
  metrics?: {
    latencyMs?: number
    confidence?: number
  }
  status: AnswerStatus
  expiresAt?: number // timestamp when answer becomes stale (90s from ts)
  taskId?: string  // Link to task
  questionId?: string  // Link to question
}

export interface Task {
  taskId: string
  ts: number
  summary: string
  payload: any
  status: TaskStatus
  answerId?: string  // Link to answer when ready
}

export interface AppSettings {
  backendUrl: string
  authToken: string
  agentName: string
  wakePhrase: string
  autoScrollTranscript: boolean
  confirmBeforeSpeaking: boolean
  autoRaiseHandHint: boolean
  logToFile: boolean
  mockMode: boolean
  callId?: string  // For API websocket connection
}

export interface OverlayState {
  collapsed: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ToastNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  ts: number
}

export interface UIState {
  collapsed: boolean
  hotZoneActive: boolean
  settingsOpen: boolean
  joinCallModalOpen: boolean
  prefersReducedMotion: boolean
}

export interface SessionState {
  connectionStatus: ConnectionStatus
  session: Session
  callStatus: CallStatus | null
  agentStatus: AgentStatus
  rtt: number | null // WebSocket round-trip time in ms
  reconnectCount: number
}

export interface TranscriptState {
  lines: TranscriptLine[]
  filter: 'all' | 'commands'
  maxLines: number
}

export interface AnswersState {
  current: Answer | null
  queue: Answer[]
  history: Answer[]
}

export interface TasksState {
  tasks: Task[]
}
