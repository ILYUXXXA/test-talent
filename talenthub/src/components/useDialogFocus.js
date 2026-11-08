import { useEffect, useRef } from 'react'

const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

// Preserve the existing dialog markup while keeping its keyboard focus inside.
export function useDialogFocus(open, onClose) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const controls = () => [...panel.querySelectorAll(focusable)].filter(node => node.getClientRects().length)
    const initialFocus = controls()[0] || panel
    initialFocus.focus({ preventScroll: true })
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0] || panel
      const last = items.at(-1) || panel
      if (!items.length || !panel.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault()
        const next = event.shiftKey ? last : first
        next.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])
  return panelRef
}
