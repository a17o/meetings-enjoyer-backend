import { useEffect } from 'react'

export function useKeyboard(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + K: Force Command
      if (modKey && e.key === 'k') {
        e.preventDefault()
        handlers.forceCommand?.()
      }

      // Escape: Collapse
      if (e.key === 'Escape') {
        e.preventDefault()
        handlers.collapse?.()
      }

      // Cmd/Ctrl + ,: Settings
      if (modKey && e.key === ',') {
        e.preventDefault()
        handlers.settings?.()
      }

      // Cmd/Ctrl + L: Toggle transcript filter
      if (modKey && e.key === 'l') {
        e.preventDefault()
        handlers.toggleFilter?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
