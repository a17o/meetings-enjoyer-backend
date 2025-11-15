import { useStore } from '../store'
import { WSClient } from '../services/wsClient'

interface ControlsProps {
  wsClient: WSClient | null
}

export function Controls({ wsClient }: ControlsProps) {
  const currentAnswer = useStore((s) => s.current)
  const agentStatus = useStore((s) => s.agentStatus)
  const connectionStatus = useStore((s) => s.connectionStatus)
  const setJoinCallModalOpen = useStore((s) => s.setJoinCallModalOpen)
  const callStatus = useStore((s) => s.callStatus)

  const isConnected = connectionStatus === 'connected'
  const isSpeaking = agentStatus === 'speaking'
  const hasAnswer = currentAnswer !== null && currentAnswer.status === 'ready'

  const handleForceCommand = () => {
    if (!wsClient) return
    wsClient.forceCommandNext()
  }

  const handleApproveSpeak = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.approveSpeak(currentAnswer.answerId)
  }

  const handleReject = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.rejectAnswer(currentAnswer.answerId)
  }

  const handlePanicStop = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.cancelSpeech(currentAnswer.answerId)
  }

  return (
    <div className="p-3 space-y-2 border-b border-white/10">
      {/* Primary controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleForceCommand}
          disabled={!isConnected || isSpeaking}
          className="btn-secondary text-sm"
          title="Force Command (⌘K)"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Force Command
        </button>

        {isSpeaking ? (
          <button onClick={handlePanicStop} className="btn-danger text-sm">
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
            Panic Stop
          </button>
        ) : (
          <button
            onClick={handleApproveSpeak}
            disabled={!hasAnswer}
            className="btn-primary text-sm"
            title="Approve to Speak (⌘↵)"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve Speak
          </button>
        )}
      </div>

      {/* Call controls */}
      {!callStatus || callStatus === 'ended' || callStatus === 'failed' ? (
        <button
          onClick={() => setJoinCallModalOpen(true)}
          disabled={!isConnected}
          className="btn-secondary w-full text-sm"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          Join Call
        </button>
      ) : (
        <button
          onClick={() => wsClient?.endCall()}
          disabled={!isConnected}
          className="btn-danger w-full text-sm"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
            />
          </svg>
          End Call
        </button>
      )}
    </div>
  )
}
