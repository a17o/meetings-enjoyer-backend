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
  const moveAnswerToHistory = useStore((s) => s.moveAnswerToHistory)

  const handleDismiss = () => {
    if (!currentAnswer) return
    // Move to history to remove from notifications
    moveAnswerToHistory(currentAnswer.answerId)
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
          {/* Controls */}
          <Controls wsClient={wsClient} />

          {/* Current Answer */}
          {currentAnswer && (
            <div className="p-3 border-b border-white/10">
              <AnswerCard
                answer={currentAnswer}
                onDismiss={handleDismiss}
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

          {/* Toggle button - bottom of controls panel */}
          <div className="sticky bottom-0 p-3 border-t border-white/10 bg-glass">
            <button
              onClick={toggleTranscript}
              className="w-full bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all flex items-center justify-center gap-2"
              title={transcriptCollapsed ? 'Show transcript' : 'Hide transcript'}
            >
              <svg className={`w-4 h-4 text-white transition-transform ${transcriptCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs text-white/80">
                {transcriptCollapsed ? 'Show Transcript' : 'Hide Transcript'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
