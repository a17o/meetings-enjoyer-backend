import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { WSClient } from './services/wsClient'
import { useKeyboard } from './hooks/useKeyboard'
import { CollapsedPill } from './components/CollapsedPill'
import { ExpandedDrawer } from './components/ExpandedDrawer'
import { ChatPill } from './components/ChatPill'
import { NotificationPill } from './components/NotificationPill'
import { ToastContainer } from './components/Toast'
import { JoinCallModal } from './components/JoinCallModal'
import { SettingsModal } from './components/Settings'

function App() {
  const collapsed = useStore((s) => s.collapsed)
  const settings = useStore((s) => s.settings)
  const toggleCollapsed = useStore((s) => s.toggleCollapsed)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const checkStaleAnswers = useStore((s) => s.checkStaleAnswers)

  const wsClientRef = useRef<WSClient | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

  // Notify Electron when chat/notification opens/closes in collapsed mode
  useEffect(() => {
    if (collapsed) {
      const anyOpen = chatOpen || notificationOpen
      window.electronAPI.setChatOpen?.(anyOpen)
    }
  }, [chatOpen, notificationOpen, collapsed])

  // Initialize WebSocket client
  useEffect(() => {
    const store = useStore.getState()
    const client = new WSClient(store as any)
    wsClientRef.current = client

    // Connect to backend
    const url = settings.backendUrl
    const token = settings.authToken || undefined
    const callId = settings.callId || undefined
    client.connect(url, token, callId)

    return () => {
      client.disconnect()
    }
  }, [settings.backendUrl, settings.authToken, settings.callId])

  // Listen for global toggle collapse event from main process
  useEffect(() => {
    window.electronAPI.onToggleCollapse(() => {
      toggleCollapsed()
    })

    return () => {
      window.electronAPI.removeToggleCollapseListener()
    }
  }, [toggleCollapsed])

  // Check for stale answers periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkStaleAnswers()
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [checkStaleAnswers])

  // Keyboard shortcuts (only when expanded)
  useKeyboard({
    collapse: () => {
      if (!collapsed) {
        toggleCollapsed()
      }
    },
    settings: () => {
      if (!collapsed) {
        setSettingsOpen(true)
      }
    },
    toggleFilter: () => {
      if (!collapsed) {
        setFilter(filter === 'all' ? 'commands' : 'all')
      }
    },
  })

  return (
    <div className="h-screen w-screen overflow-hidden no-select relative">
      {collapsed ? (
        <div className="h-full w-full flex flex-col items-center pt-3">
          <CollapsedPill
            onExpand={toggleCollapsed}
            onChatToggle={() => {
              setChatOpen(!chatOpen)
              setNotificationOpen(false)
            }}
            onNotificationToggle={() => {
              setNotificationOpen(!notificationOpen)
              setChatOpen(false)
            }}
          />

          {/* Notification pill below main pill when in collapsed mode */}
          {notificationOpen && (
            <div className="mt-2">
              <NotificationPill wsClient={wsClientRef.current} onClose={() => setNotificationOpen(false)} />
            </div>
          )}

          {/* Chat pill below main pill when in collapsed mode */}
          {chatOpen && (
            <div className="mt-2">
              <ChatPill wsClient={wsClientRef.current} onClose={() => setChatOpen(false)} />
            </div>
          )}
        </div>
      ) : (
        <>
          <ExpandedDrawer wsClient={wsClientRef.current} onChatToggle={() => setChatOpen(!chatOpen)} />

          {/* Chat pill at bottom when in expanded mode */}
          {chatOpen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
              <ChatPill wsClient={wsClientRef.current} onClose={() => setChatOpen(false)} />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <JoinCallModal wsClient={wsClientRef.current} />
      <SettingsModal />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}

export default App
