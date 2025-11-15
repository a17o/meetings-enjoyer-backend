import type { StateCreator } from 'zustand'
import type { SessionState, Session, AgentStatus, CallStatus, ConnectionStatus } from '../types'

export interface SessionSlice extends SessionState {
  setConnectionStatus: (status: ConnectionStatus) => void
  setSession: (session: Partial<Session>) => void
  setCallStatus: (status: CallStatus | null, callSid?: string) => void
  setAgentStatus: (status: AgentStatus) => void
  setRTT: (rtt: number) => void
  incrementReconnectCount: () => void
  resetReconnectCount: () => void
}

export const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  // Initial state
  connectionStatus: 'disconnected',
  session: {
    sessionId: null,
    agentName: 'Lara',
  },
  callStatus: null,
  agentStatus: 'idle',
  rtt: null,
  reconnectCount: 0,

  // Actions
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setSession: (sessionUpdate) => {
    set((state) => ({
      session: {
        ...state.session,
        ...sessionUpdate,
      },
    }))
  },

  setCallStatus: (status, callSid) => {
    set((state) => ({
      callStatus: status,
      session: callSid ? { ...state.session, callSid } : state.session,
    }))
  },

  setAgentStatus: (status) => set({ agentStatus: status }),

  setRTT: (rtt) => set({ rtt }),

  incrementReconnectCount: () => {
    set((state) => ({
      reconnectCount: state.reconnectCount + 1,
    }))
  },

  resetReconnectCount: () => set({ reconnectCount: 0 }),
})
