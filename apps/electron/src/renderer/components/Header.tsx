import { useStore } from '../store'

interface HeaderProps {
  onChatToggle?: () => void
}

export function Header({ onChatToggle }: HeaderProps = {}) {
  const connectionStatus = useStore((s) => s.connectionStatus)
  const callStatus = useStore((s) => s.callStatus)
  const agentStatus = useStore((s) => s.agentStatus)
  const rtt = useStore((s) => s.rtt)
  const session = useStore((s) => s.session)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const setCollapsed = useStore((s) => s.setCollapsed)

  const getConnectionStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'status-connected'
      case 'connecting':
        return 'status-connecting'
      case 'disconnected':
        return 'status-disconnected'
      default:
        return 'status-disconnected'
    }
  }

  const getAgentStatusClass = () => {
    switch (agentStatus) {
      case 'idle':
        return 'status-idle'
      case 'listening':
        return 'status-listening'
      case 'researching':
        return 'status-researching'
      case 'ready':
        return 'status-ready'
      case 'speaking':
        return 'status-speaking'
      default:
        return 'status-idle'
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10 drag-region">
      {/* Left: Status pills */}
      <div className="flex items-center gap-2 flex-1 overflow-hidden">
        {/* Connection status */}
        <div className={`status-pill ${getConnectionStatusClass()}`}>
          <div className={`status-dot status-dot-${connectionStatus === 'connected' ? 'ready' : connectionStatus === 'connecting' ? 'researching' : 'idle'}`} />
          <span className="capitalize">{connectionStatus}</span>
        </div>

        {/* Call status */}
        {callStatus && (
          <div className="status-pill bg-purple-500/20 text-purple-300">
            <span className="capitalize">{callStatus}</span>
            {session.callSid && <span className="text-xs opacity-60">({session.callSid.slice(-6)})</span>}
          </div>
        )}

        {/* Agent status */}
        <div className={`status-pill ${getAgentStatusClass()}`}>
          <div className={`status-dot status-dot-${agentStatus === 'researching' || agentStatus === 'speaking' ? agentStatus : agentStatus === 'ready' ? 'ready' : 'idle'}`} />
          <span className="capitalize">{agentStatus}</span>
        </div>

        {/* RTT */}
        {rtt !== null && (
          <div className="status-pill bg-white/5 text-white/60">
            <span>{rtt}ms</span>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Chat button */}
        {onChatToggle && (
          <button
            onClick={onChatToggle}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            title="Text Query"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="Settings (⌘,)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="Collapse (Alt+Space)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
