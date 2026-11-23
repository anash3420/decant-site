import { useEffect, type RefObject } from 'react'

/**
 * For a drawer or sheet that stays mounted: while open, Escape closes it, the page behind doesn't scroll and focus
 * moves into it; when it closes, focus goes back to whatever opened it.
 */
export function useModal(open: boolean, onClose: () => void, focusRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    focusRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = before
      window.removeEventListener('keydown', onKey)
      opener?.focus({ preventScroll: true })
    }
  }, [open, onClose, focusRef])
}
