import { useState } from 'react'
import { useStore } from '../store'
import { WSClient } from '../services/wsClient'

interface JoinCallModalProps {
  wsClient: WSClient | null
}

export function JoinCallModal({ wsClient }: JoinCallModalProps) {
  const isOpen = useStore((s) => s.joinCallModalOpen)
  const setIsOpen = useStore((s) => s.setJoinCallModalOpen)

  const [rawInvite, setRawInvite] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!wsClient || !rawInvite.trim()) return

    wsClient.joinCall({
      rawInvite: rawInvite.trim(),
    })

    // Close modal
    setIsOpen(false)

    // Reset form
    setRawInvite('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-darker rounded-xl p-6 w-[500px] max-w-[90vw] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Join Call</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Paste Google Calendar Invite
            </label>
            <textarea
              value={rawInvite}
              onChange={(e) => setRawInvite(e.target.value)}
              placeholder={`Paste your Google Calendar invite here...

It can include:
• Phone numbers
• Meeting codes
• Google Meet links
• Any other meeting details`}
              className="input w-full min-h-[200px] resize-y font-mono text-sm"
              required
              autoFocus
            />
            <p className="text-xs text-white/40 mt-1">
              Just copy and paste the entire calendar invite - we'll extract all the details automatically.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={!rawInvite.trim()}
            >
              Join Call
            </button>
            <button 
              type="button" 
              onClick={() => {
                setIsOpen(false)
                setRawInvite('')
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
