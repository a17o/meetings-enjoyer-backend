import { useStore } from '../store'
import { WSClient } from '../services/wsClient'
import { format } from 'date-fns'

interface TasksQueueProps {
  wsClient: WSClient | null
}

export function TasksQueue({ wsClient }: TasksQueueProps) {
  const tasks = useStore((s) => s.tasks)

  if (tasks.length === 0) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">Queued</span>
      case 'approved':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Approved</span>
      case 'running':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 animate-pulse">Running</span>
      case 'success':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300">Success</span>
      case 'failure':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">Failed</span>
      case 'rejected':
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-300">Rejected</span>
      default:
        return null
    }
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Tasks</h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.taskId} className="glass rounded p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-white flex-1">{task.summary}</p>
              {getStatusBadge(task.status)}
            </div>

            <div className="text-xs text-white/40">{format(task.ts, 'HH:mm:ss')}</div>

            {task.status === 'queued' && (
              <div className="flex gap-2">
                <button
                  onClick={() => wsClient?.approveTask(task.taskId)}
                  className="btn-primary text-xs flex-1"
                >
                  Approve
                </button>
                <button
                  onClick={() => wsClient?.rejectTask(task.taskId)}
                  className="btn-secondary text-xs"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
