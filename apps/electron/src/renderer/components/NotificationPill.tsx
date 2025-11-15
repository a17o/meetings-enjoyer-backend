import { useStore } from '../store'
import { WSClient } from '../services/wsClient'

interface NotificationPillProps {
  wsClient: WSClient | null
  onClose: () => void
}

export function NotificationPill({ wsClient, onClose }: NotificationPillProps) {
  const currentAnswer = useStore((s) => s.current)
  const tasksQueue = useStore((s) => s.queue)

  const handleApprove = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.approveSpeak(currentAnswer.answerId)
    onClose()
  }

  const handleReject = () => {
    if (!wsClient || !currentAnswer) return
    wsClient.rejectAnswer(currentAnswer.answerId)
    onClose()
  }

  const pendingTasks = tasksQueue.filter((t) => t.status === 'queued')

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
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 bg-blue-500 hover:bg-blue-600 rounded px-3 py-1.5 text-xs text-white transition-colors"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-white/10 hover:bg-white/20 rounded px-3 py-1.5 text-xs text-white transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs font-semibold text-yellow-300 uppercase">
                {pendingTasks.length} Pending Task{pendingTasks.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div key={task.taskId} className="border border-yellow-500/30 rounded-lg p-2 bg-yellow-500/10">
                  <p className="text-sm text-white line-clamp-2 mb-2">{task.summary}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        wsClient?.approveTask(task.taskId)
                        onClose()
                      }}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 rounded px-3 py-1.5 text-xs text-black font-medium transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        wsClient?.rejectTask(task.taskId)
                        onClose()
                      }}
                      className="flex-1 bg-white/10 hover:bg-white/20 rounded px-3 py-1.5 text-xs text-white transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No notifications */}
        {!currentAnswer && pendingTasks.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-white/40">No notifications</p>
          </div>
        )}
      </div>
    </div>
  )
}
