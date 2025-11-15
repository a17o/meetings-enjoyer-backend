// WebSocket Contracts - matches PRD specifications

export type AgentStatus = 'idle' | 'listening' | 'researching' | 'ready' | 'speaking'
export type CallStatus = 'dialing' | 'connected' | 'ended' | 'failed'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
export type TaskStatus = 'approved' | 'rejected' | 'queued' | 'running' | 'success' | 'failure'
export type AnswerStatus = 'ready' | 'approved' | 'rejected' | 'spoken' | 'stale'

export interface SourceRef {
  id: string
  title?: string
  snippet?: string
  url?: string
}

export interface MeetingInfo {
  label: string
  dialIn: string
  dtmf?: string
  displayName?: string
}

// Server → Client Events
export type ServerEvent =
  | { type: 'session_info'; sessionId: string; callSid?: string; agentName: string; meetingLabel?: string }
  | { type: 'transcript'; id: string; ts: number; text: string; partial: boolean; speaker?: string; wake?: boolean }
  | { type: 'wake_detected'; ts: number; phrase: string; by: string }
  | { type: 'command_started'; commandId: string; ts: number; method: 'wake' | 'forced' }
  | { type: 'agent_status'; commandId?: string; status: AgentStatus; detail?: string }
  | { type: 'answer_ready'; answerId: string; commandId: string; ts: number; text: string; sources?: SourceRef[]; metrics?: { latencyMs?: number; confidence?: number } }
  | { type: 'speaking_started'; answerId: string; ts: number }
  | { type: 'speaking_ended'; answerId: string; ts: number; durationMs?: number }
  | { type: 'speech_canceled'; answerId: string }
  | { type: 'task_proposed'; taskId: string; ts: number; summary: string; payload: any }
  | { type: 'task_status'; taskId: string; status: TaskStatus; detail?: string }
  | { type: 'call_status'; status: CallStatus; callSid?: string; reason?: string }
  | { type: 'pong'; ts: number; serverTs: number }
  | { type: 'error'; code: string; message: string; recoverable: boolean }

// Client → Server Commands
export interface ClientSettings {
  wakePhrase?: string
  confirmBeforeSpeaking?: boolean
  autoRaiseHandHint?: boolean
  transcriptFilter?: 'all' | 'commands'
}

export type ClientCommand =
  | { type: 'hello'; clientVersion: string; supports?: string[] }
  | { type: 'join_call'; meeting: MeetingInfo }
  | { type: 'end_call' }
  | { type: 'force_command_next' }
  | { type: 'text_query'; payload: { text: string } }
  | { type: 'approve_speak'; answerId: string }
  | { type: 'reject_answer'; answerId: string; reason?: string }
  | { type: 'cancel_speech'; answerId: string }
  | { type: 'approve_task'; taskId: string }
  | { type: 'reject_task'; taskId: string; reason?: string }
  | { type: 'set_settings'; settings: ClientSettings }
  | { type: 'request_history'; limit?: number }
  | { type: 'ping'; ts: number }

// Error Codes
export enum ErrorCode {
  WS_DISCONNECTED = 'WS_DISCONNECTED',
  AUTH_FAILED = 'AUTH_FAILED',
  NO_ACTIVE_CALL = 'NO_ACTIVE_CALL',
  BACKEND_BUSY = 'BACKEND_BUSY',
  INVALID_COMMAND = 'INVALID_COMMAND',
  TIMEOUT = 'TIMEOUT',
  SPEAK_FAILED = 'SPEAK_FAILED',
  TASK_FAILED = 'TASK_FAILED',
  CALL_FAILED = 'CALL_FAILED',
}
