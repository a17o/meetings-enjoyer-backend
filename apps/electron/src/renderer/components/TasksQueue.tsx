import { useStore } from '../store'
import { WSClient } from '../services/wsClient'
import { format } from 'date-fns'

interface TasksQueueProps {
  wsClient: WSClient | null
}

export function TasksQueue({ wsClient }: TasksQueueProps) {
  const tasks = useStore((s) => s.tasks)
  const answers = useStore((s) => {
    const allAnswers = s.current ? [s.current, ...s.queue, ...s.history] : [...s.queue, ...s.history]
    return allAnswers
  })

  if (tasks.length === 0) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 animate-pulse">Processing</span>
      case 'success':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300">Answered</span>
      case 'failure':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">Failed</span>
      default:
        return null
    }
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Questions & Answers</h3>
      <div className="space-y-3">
        {tasks.map((task) => {
          const linkedAnswer = task.answerId ? answers.find((a) => a.answerId === task.answerId) : null
          
          return (
            <div key={task.taskId} className="glass rounded p-3 space-y-3">
              {/* Question/Task */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-white flex-1">{task.summary}</p>
                  {getStatusBadge(task.status)}
                </div>
                <div className="text-xs text-white/40">{format(task.ts, 'HH:mm:ss')}</div>
              </div>

              {/* Answer (if available) */}
              {linkedAnswer && (
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-green-300 uppercase">Answer</span>
                  </div>
                  <p className="text-sm text-white/90">{linkedAnswer.text}</p>
                  {linkedAnswer.metrics && (
                    <div className="text-xs text-white/40 mt-1">
                      {linkedAnswer.metrics.latencyMs && `${linkedAnswer.metrics.latencyMs}ms`}
                      {linkedAnswer.metrics.confidence && ` • ${Math.round(linkedAnswer.metrics.confidence * 100)}% confidence`}
                    </div>
                  )}
                </div>
              )}

              {/* Processing indicator */}
              {task.status === 'running' && !linkedAnswer && (
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs text-white/60">Processing answer...</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
