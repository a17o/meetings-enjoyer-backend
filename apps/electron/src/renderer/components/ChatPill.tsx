import { useState } from 'react'
import { WSClient } from '../services/wsClient'

interface ChatPillProps {
  wsClient: WSClient | null
  onClose: () => void
}

export function ChatPill({ wsClient, onClose }: ChatPillProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (!wsClient || !message.trim()) return

    // Send text query to backend
    wsClient.sendMessage({
      type: 'text_query',
      payload: { text: message },
    })

    setMessage('')
    onClose() // Close after sending
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="glass-pill p-3 flex items-center gap-2 w-[280px]">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        className="flex-1 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
        autoFocus
      />
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:cursor-not-allowed rounded-full w-7 h-7 flex items-center justify-center text-white transition-colors"
        title="Send"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )
}
