import { useStore } from '../store'

interface CollapsedPillProps {
  onExpand: () => void
  onChatToggle: () => void
  onNotificationToggle: () => void
}

export function CollapsedPill({ onExpand, onChatToggle, onNotificationToggle }: CollapsedPillProps) {
  const connectionStatus = useStore((s) => s.connectionStatus)
  const currentAnswer = useStore((s) => s.current)
  const tasks = useStore((s) => s.tasks)

  const statusColor = connectionStatus === 'connected'
    ? 'bg-green-500'
    : connectionStatus === 'connecting'
    ? 'bg-yellow-500'
    : 'bg-red-500'

  // Count notifications
  const notificationCount = (currentAnswer && currentAnswer.status === 'ready' ? 1 : 0) +
                           tasks.filter((t) => t.status === 'queued').length

  return (
    <div className="glass-pill px-4 py-3 flex items-center gap-3">
      {/* Status indicator with label */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse shadow-lg`} />
        <span className="text-xs font-medium text-white/80">
          {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
        </span>
      </div>

      {/* Quick action buttons - larger and clearer */}
      <div className="flex items-center gap-2 border-l border-white/20 pl-3">
        {/* Notifications button with badge */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNotificationToggle()
          }}
          className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 relative"
          title="Notifications"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notificationCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-black/50 shadow-lg animate-pulse">
              {notificationCount}
            </div>
          )}
        </button>

        {/* Chat button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChatToggle()
          }}
          className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
          title="Text Query"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Expand sidebar button */}
        <button
          onClick={onExpand}
          className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
          title="Open Console"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
