import { useState } from 'react'
import type { Answer } from '../types'
import { format } from 'date-fns'

interface AnswerCardProps {
  answer: Answer
  onDismiss?: () => void
  onCancel?: () => void
  isSpeaking?: boolean
}

export function AnswerCard({ answer, onDismiss, onCancel, isSpeaking }: AnswerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSourcePopover, setShowSourcePopover] = useState<string | null>(null)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(answer.text)
  }

  const isStale = answer.status === 'stale'

  return (
    <div className="glass rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Answer Ready</h3>
          {isStale && <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded">Stale</span>}
        </div>
        <div className="text-xs text-white/40">{format(answer.ts, 'HH:mm:ss')}</div>
      </div>

      {/* Answer text */}
      <div className="text-white text-sm">
        <div className={`${!expanded && 'line-clamp-8'}`}>{answer.text}</div>
        {answer.text.split('\n').length > 8 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            {expanded ? 'Show less' : 'Expand'}
          </button>
        )}
      </div>

      {/* Sources */}
      {answer.sources && answer.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.sources.map((source) => (
            <div key={source.id} className="relative">
              <button
                onMouseEnter={() => setShowSourcePopover(source.id)}
                onMouseLeave={() => setShowSourcePopover(null)}
                className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs hover:bg-blue-500/30 transition-colors"
              >
                {source.title || source.id}
              </button>

              {/* Popover */}
              {showSourcePopover === source.id && (source.snippet || source.url) && (
                <div className="absolute z-10 bottom-full left-0 mb-2 w-64 glass-darker rounded p-2 text-xs text-white shadow-lg">
                  {source.snippet && <p className="mb-1">{source.snippet}</p>}
                  {source.url && (
                    <a href={source.url} className="text-blue-400 hover:text-blue-300 text-xs underline">
                      Open
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {answer.metrics && (
        <div className="flex gap-3 text-xs text-white/40">
          {answer.metrics.latencyMs && <span>Latency: {answer.metrics.latencyMs}ms</span>}
          {answer.metrics.confidence && <span>Confidence: {(answer.metrics.confidence * 100).toFixed(0)}%</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isSpeaking ? (
          <button onClick={onCancel} className="btn-danger flex-1">
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
            Panic Stop
          </button>
        ) : (
          <>
            <button onClick={copyToClipboard} className="btn-secondary flex-1" title="Copy text">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </button>
            {onDismiss && (
              <button onClick={onDismiss} className="btn-secondary" title="Dismiss">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
