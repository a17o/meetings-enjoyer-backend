import { useState } from 'react'
import { useStore } from '../store'
import { WSClient } from '../services/wsClient'

interface JoinCallModalProps {
  wsClient: WSClient | null
}

export function JoinCallModal({ wsClient }: JoinCallModalProps) {
  const isOpen = useStore((s) => s.joinCallModalOpen)
  const setIsOpen = useStore((s) => s.setJoinCallModalOpen)

  const [meetingLabel, setMeetingLabel] = useState('')
  const [dialIn, setDialIn] = useState('')
  const [dtmf, setDtmf] = useState('')
  const [displayName, setDisplayName] = useState('Lara AI')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!wsClient || !dialIn) return

    wsClient.joinCall({
      label: meetingLabel || 'Unnamed Meeting',
      dialIn,
      dtmf: dtmf || undefined,
      displayName,
    })

    // Close modal
    setIsOpen(false)

    // Reset form
    setMeetingLabel('')
    setDialIn('')
    setDtmf('')
    setDisplayName('Lara AI')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-darker rounded-xl p-6 w-[350px] shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Join Call</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Meeting Label</label>
            <input
              type="text"
              value={meetingLabel}
              onChange={(e) => setMeetingLabel(e.target.value)}
              placeholder="e.g., Investor Meeting"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              Dial-In Number / Google Meet Link <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={dialIn}
              onChange={(e) => setDialIn(e.target.value)}
              placeholder="+1234567890 or meet.google.com/xxx-yyyy-zzz"
              required
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">DTMF / PIN (optional)</label>
            <input
              type="text"
              value={dtmf}
              onChange={(e) => setDtmf(e.target.value)}
              placeholder="e.g., 123456#"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Lara AI"
              className="input w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">
              Join Call
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
