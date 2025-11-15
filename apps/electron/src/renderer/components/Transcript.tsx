import { useEffect, useRef, useState } from 'react'
import { useStore, selectTranscriptLines } from '../store'
import { format } from 'date-fns'

export function Transcript() {
  const lines = useStore(selectTranscriptLines)
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const settings = useStore((s) => s.settings)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filterExpanded, setFilterExpanded] = useState(false)

  // Auto-scroll to bottom
  useEffect(() => {
    if (settings.autoScrollTranscript && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, settings.autoScrollTranscript])

  const highlightWakePhrase = (text: string, isWake?: boolean) => {
    if (!isWake) return text

    const wakePhrase = settings.wakePhrase.toLowerCase()
    const index = text.toLowerCase().indexOf(wakePhrase)

    if (index === -1) return text

    const before = text.slice(0, index)
    const wake = text.slice(index, index + wakePhrase.length)
    const after = text.slice(index + wakePhrase.length)

    return (
      <>
        {before}
        <span className="font-bold text-blue-400">{wake}</span>
        {after}
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter toggle - Collapsible */}
      {filterExpanded ? (
        <div className="flex items-center gap-2 p-2 border-b border-white/5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('commands')}
            className={`px-2 py-1 text-xs rounded ${filter === 'commands' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            Commands
          </button>
          <div className="ml-auto text-xs text-white/40">{lines.length} lines</div>
          <button
            onClick={() => setFilterExpanded(false)}
            className="text-white/40 hover:text-white/60 text-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 border-b border-white/5">
          <button
            onClick={() => setFilterExpanded(true)}
            className="text-xs text-white/60 hover:text-white flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{filter === 'all' ? 'All' : 'Commands'}</span>
          </button>
          <div className="ml-auto text-xs text-white/40">{lines.length} lines</div>
        </div>
      )}

      {/* Transcript lines */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {lines.length === 0 ? (
          <div className="text-white/40 text-sm text-center py-8">Waiting for transcript...</div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={`text-sm ${line.partial ? 'italic opacity-50' : ''}`}>
              <span className="text-white/40 text-xs mr-2">[{format(line.ts, 'HH:mm:ss')}]</span>
              {line.speaker && <span className="text-blue-300 font-medium mr-1">{line.speaker}:</span>}
              <span className={`text-white ${line.wake ? 'font-medium' : ''}`}>
                {highlightWakePhrase(line.text, line.wake)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
