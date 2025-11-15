import { useStore } from '../store'
import { WSClient } from '../services/wsClient'

interface NotificationPillProps {
  wsClient: WSClient | null
  onClose: () => void
}

export function NotificationPill({ onClose }: NotificationPillProps) {
  const currentAnswer = useStore((s) => s.current)
  const tasks = useStore((s) => s.tasks)
  const moveAnswerToHistory = useStore((s) => s.moveAnswerToHistory)

  const handleDismiss = () => {
    if (!currentAnswer) return
    // Move to history to remove from notifications
    moveAnswerToHistory(currentAnswer.answerId)
    onClose()
  }

  const pendingTasks = tasks.filter((t) => t.status === 'running' && !t.answerId)

  return (
    <div className="glass-pill p-4 w-[320px] max-h-[316px] overflow-y-auto rounded-2xl">
      <div className="space-y-2">
        {/* Current Answer */}
        {currentAnswer && currentAnswer.status === 'ready' && (
          <div className="border border-blue-500/30 rounded-lg p-2 bg-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300 uppercase">Answer Ready</span>
            </div>
            <p className="text-sm text-white line-clamp-3 mb-2">{currentAnswer.text}</p>
            <button
              onClick={handleDismiss}
              className="w-full bg-white/10 hover:bg-white/20 rounded px-3 py-1.5 text-xs text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Processing Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300 uppercase">
                {pendingTasks.length} Processing Question{pendingTasks.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div key={task.taskId} className="border border-blue-500/30 rounded-lg p-2 bg-blue-500/10">
                  <p className="text-sm text-white line-clamp-2">{task.summary}</p>
                  <div className="text-xs text-white/60 mt-1">Processing answer...</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No notifications */}
        {!currentAnswer && pendingTasks.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-white/40">No notifications yet!</p>
          </div>
        )}
      </div>
    </div>
  )
}
