import { useState, useEffect } from 'react'
import { useStore } from '../store'

export function SettingsModal() {
  const isOpen = useStore((s) => s.settingsOpen)
  const setIsOpen = useStore((s) => s.setSettingsOpen)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetSettings = useStore((s) => s.resetSettings)

  const [formData, setFormData] = useState(settings)

  useEffect(() => {
    setFormData(settings)
  }, [settings, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    updateSettings(formData)
    setIsOpen(false)
  }

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings()
      setIsOpen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-darker rounded-xl p-6 w-[400px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
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

        <div className="space-y-4">
          {/* Backend URL */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Backend URL</label>
            <input
              type="text"
              value={formData.backendUrl}
              onChange={(e) => setFormData({ ...formData, backendUrl: e.target.value })}
              placeholder="ws://localhost:9001"
              className="input w-full"
            />
          </div>

          {/* Auth Token */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Auth Token (optional)</label>
            <input
              type="password"
              value={formData.authToken}
              onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              placeholder="Bearer token"
              className="input w-full"
            />
          </div>

          {/* Call ID (for API mode) */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Call ID (required for API mode)</label>
            <input
              type="text"
              value={formData.callId || ''}
              onChange={(e) => setFormData({ ...formData, callId: e.target.value })}
              placeholder="Enter call_id to receive questions/answers"
              className="input w-full"
            />
          </div>

          {/* Agent Name */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Agent Name</label>
            <input
              type="text"
              value={formData.agentName}
              onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
              placeholder="Lara"
              className="input w-full"
            />
          </div>

          {/* Wake Phrase */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Wake Phrase</label>
            <input
              type="text"
              value={formData.wakePhrase}
              onChange={(e) => setFormData({ ...formData, wakePhrase: e.target.value })}
              placeholder="hey lara"
              className="input w-full"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoScrollTranscript}
                onChange={(e) => setFormData({ ...formData, autoScrollTranscript: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
              />
              <span className="text-sm text-white">Auto-scroll transcript</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmBeforeSpeaking}
                onChange={(e) => setFormData({ ...formData, confirmBeforeSpeaking: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
              />
              <span className="text-sm text-white">Confirm before speaking</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoRaiseHandHint}
                onChange={(e) => setFormData({ ...formData, autoRaiseHandHint: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
              />
              <span className="text-sm text-white">Show raise hand hint</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.logToFile}
                onChange={(e) => setFormData({ ...formData, logToFile: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
              />
              <span className="text-sm text-white">Enable file logging</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.mockMode}
                onChange={(e) => setFormData({ ...formData, mockMode: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
              />
              <span className="text-sm text-white">Mock mode (offline demo)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <button onClick={handleSave} className="btn-primary flex-1">
              Save
            </button>
            <button onClick={handleReset} className="btn-secondary">
              Reset
            </button>
            <button onClick={() => setIsOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
