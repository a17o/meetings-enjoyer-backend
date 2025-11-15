import { Header } from './Header'
import { Transcript } from './Transcript'
import { Controls } from './Controls'
import { AnswerCard } from './AnswerCard'
import { TasksQueue } from './TasksQueue'
import { useStore } from '../store'
import { WSClient } from '../services/wsClient'

interface ExpandedDrawerProps {
  wsClient: WSClient | null
  onChatToggle: () => void
}

export function ExpandedDrawer({ wsClient, onChatToggle }: ExpandedDrawerProps) {
  const currentAnswer = useStore((s) => s.current)
  const answerQueue = useStore((s) => s.queue)
  const agentStatus = useStore((s) => s.agentStatus)
  const transcriptCollapsed = useStore((s) => s.transcriptCollapsed)
  const toggleTranscript = useStore((s) => s.toggleTranscript)

  const isSpeaking = agentStatus === 'speaking'

  const handleApprove = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.approveSpeak(currentAnswer.answerId)
  }

  const handleReject = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.rejectAnswer(currentAnswer.answerId)
  }

  const handleCancel = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.cancelSpeech(currentAnswer.answerId)
  }

  return (
    <div className="h-full flex flex-col glass overflow-hidden">
      {/* Header */}
      <Header onChatToggle={onChatToggle} />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Transcript - Collapsible */}
        {!transcriptCollapsed && (
          <div className="w-[55%] border-r border-white/10 flex flex-col transition-all duration-200">
            <Transcript />
          </div>
        )}

        {/* Right: Controls & Queue - Always visible */}
        <div className={`${transcriptCollapsed ? 'w-full' : 'w-[45%]'} flex flex-col overflow-y-auto transition-all duration-200 relative`}>
          {/* Toggle button - top right of controls panel */}
          <button
            onClick={toggleTranscript}
            className="absolute right-3 top-3 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all z-20"
            title={transcriptCollapsed ? 'Show transcript' : 'Hide transcript'}
          >
            <svg className={`w-4 h-4 text-white transition-transform ${transcriptCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* Controls */}
          <Controls wsClient={wsClient} />

          {/* Current Answer */}
          {currentAnswer && (
            <div className="p-3 border-b border-white/10">
              <AnswerCard
                answer={currentAnswer}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancel={handleCancel}
                isSpeaking={isSpeaking}
              />
            </div>
          )}

          {/* Answer Queue */}
          {answerQueue.length > 0 && (
            <div className="p-3 border-b border-white/10">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">Answer Queue</h3>
              <div className="space-y-2">
                {answerQueue.map((answer) => (
                  <div key={answer.answerId} className="glass rounded p-2">
                    <div className="text-sm text-white line-clamp-2">{answer.text}</div>
                    <div className="text-xs text-white/40 mt-1">
                      {answer.metrics?.latencyMs && `${answer.metrics.latencyMs}ms`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Queue */}
          <TasksQueue wsClient={wsClient} />

          {/* Raise hand hint */}
          {useStore((s) => s.settings.autoRaiseHandHint) && currentAnswer && currentAnswer.status === 'ready' && (
            <div className="p-3">
              <div className="glass-darker rounded p-3 flex items-center gap-3 border border-yellow-500/20">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Ready to speak</p>
                  <p className="text-xs text-white/60">Remember to allow the agent to unmute</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
