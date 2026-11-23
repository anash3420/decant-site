import { useRef, type PointerEvent as ReactPointerEvent, type RefObject, type SyntheticEvent } from 'react'

/** A flick faster than this (px per ms) dismisses, however short */
const FLICK = 0.11
/** Letting go past this share of the panel's size dismisses */
const DISTANCE = 0.3
/** Pulling the wrong way moves the panel this much per pixel, so it gives a little instead of stopping hard */
const RESIST = 0.2
/** Movement before a touch counts as a drag (so taps on buttons inside still work) */
const SLOP = 8

/** Sets inline styles on the panel or the dim while a drag is under way ('' hands a property back to the classes) */
function style(
  el: HTMLElement | null | undefined,
  styles: { translate?: string; transition?: string; opacity?: string },
) {
  if (el) Object.assign(el.style, styles)
}

interface Drag {
  id: number
  x: number
  y: number
  active: boolean
  /** Distance towards dismissing (down for a sheet, right for a drawer from the right) */
  d: number
  /** Recent speed, px per ms */
  v: number
  t: number
}

interface Options {
  /** 'y' for a sheet from the bottom (dismissed downwards), 'x' for a drawer from the right */
  axis: 'x' | 'y'
  onDismiss: () => void
  /** The dimmed page, which lightens as the panel is pulled away */
  dimRef?: RefObject<HTMLElement | null>
  /** Only below the desktop breakpoint (the filter sheet becomes a left drawer on desktop) */
  phoneOnly?: boolean
}

/**
 * Drag to dismiss for touch: the panel follows the finger 1:1 and, let go far enough or fast enough, closes;
 * otherwise it settles back with its own opening transition. Spread the returned handlers on the area that can be
 * dragged (a handle and header, or a list that only scrolls up and down); give that area `touch-action: none` or
 * `pan-y` so the browser leaves the drag to us. Mouse pointers are ignored.
 */
export function useDragDismiss(panelRef: RefObject<HTMLElement | null>, options: Options) {
  const { axis, onDismiss, dimRef, phoneOnly } = options
  const drag = useRef<Drag | null>(null)
  const justDragged = useRef(false)

  const paint = (d: number) => {
    const panel = panelRef.current
    if (!panel) return
    const shown = d > 0 ? d : d * RESIST
    style(panel, { translate: axis === 'y' ? `0 ${shown}px` : `${shown}px 0` })
    const size = axis === 'y' ? panel.offsetHeight : panel.offsetWidth
    style(dimRef?.current, { opacity: String(1 - Math.min(Math.max(d, 0) / size, 1)) })
  }

  /** Hands the panel back to its classes: back into place, or out if `dismiss` */
  const release = (dismiss: boolean) => {
    const panel = panelRef.current
    if (!panel) return
    style(panel, { transition: '' })
    style(dimRef?.current, { transition: '', opacity: '' })
    // With reduced motion the panel fades out where it was let go, rather than jumping back first
    const fadeInPlace = dismiss && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (fadeInPlace) setTimeout(() => style(panel, { translate: '' }), 260)
    else style(panel, { translate: '' })
    if (dismiss) onDismiss()
    // The tap that ends a drag shouldn't also press the button under the finger
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 100)
  }

  return {
    onPointerDown(e: ReactPointerEvent) {
      if (e.pointerType === 'mouse' || !e.isPrimary) return
      if (phoneOnly && matchMedia('(min-width: 1024px)').matches) return
      if ((e.target as Element).closest('select, input, textarea, [data-no-drag]')) return
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, active: false, d: 0, v: 0, t: e.timeStamp }
    },
    onPointerMove(e: ReactPointerEvent) {
      const s = drag.current
      if (!s || e.pointerId !== s.id) return
      const main = axis === 'y' ? e.clientY - s.y : e.clientX - s.x
      const cross = axis === 'y' ? e.clientX - s.x : e.clientY - s.y
      if (!s.active) {
        // A move along the other axis is a scroll, not a drag
        if (Math.abs(cross) > SLOP && Math.abs(cross) > Math.abs(main)) {
          drag.current = null
          return
        }
        if (Math.abs(main) < SLOP) return
        s.active = true
        style(panelRef.current, { transition: 'none' })
        style(dimRef?.current, { transition: 'none' })
      }
      const dt = e.timeStamp - s.t
      if (dt > 0) s.v = 0.8 * ((main - s.d) / dt) + 0.2 * s.v
      s.d = main
      s.t = e.timeStamp
      paint(main)
    },
    onPointerUp(e: ReactPointerEvent) {
      const s = drag.current
      drag.current = null
      if (!s?.active || e.pointerId !== s.id) return
      const panel = panelRef.current
      const size = panel ? (axis === 'y' ? panel.offsetHeight : panel.offsetWidth) : Infinity
      // A finger that stopped before letting go isn't a flick
      const speed = e.timeStamp - s.t < 100 ? s.v : 0
      release(s.d > size * DISTANCE || (speed > FLICK && s.d > SLOP))
    },
    onPointerCancel() {
      const s = drag.current
      drag.current = null
      if (s?.active) release(false)
    },
    onClickCapture(e: SyntheticEvent) {
      if (!justDragged.current) return
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
