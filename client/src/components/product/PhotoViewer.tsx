import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Photo } from '@shared/types.ts'
import { useModal } from '../../lib/useModal.ts'
import { ChevronLeft, ChevronRight, CloseIcon, MinusIcon, PlusIcon } from '../icons.tsx'

const ZOOMS = [1, 1.5, 2]

interface PhotoViewerProps {
  photos: Photo[]
  start: number
  house: string
  name: string
  onClose: () => void
}

/**
 * The full-screen photo viewer on warm ivory. Desktop: house and name, "2 / 4 · Box", zoom − / Fit / + up to 2× with
 * drag to look closer, arrows (and the arrow keys) and thumbnails. Phone: swipe between photos, dots, and the
 * browser's own pinch to zoom. Esc fits a zoomed photo first, then closes.
 */
export function PhotoViewer({ photos, start, house, name, onClose }: PhotoViewerProps) {
  const [index, setIndex] = useState(start)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const closeRef = useRef<HTMLButtonElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const photo = photos[index]

  const fit = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  const go = (i: number) => {
    setIndex((i + photos.length) % photos.length)
    fit()
  }
  const zoomTo = (z: number) => {
    setZoom(z)
    if (z === 1) setPan({ x: 0, y: 0 })
  }

  // Esc fits a zoomed photo first. useModal needs a steady callback, so it reads the current action from a ref.
  const escape = useRef(onClose)
  useEffect(() => {
    escape.current = zoom > 1 ? fit : onClose
  })
  useModal(
    true,
    useCallback(() => escape.current(), []),
    closeRef,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Phone: open on the photo that was tapped
  useEffect(() => {
    const strip = stripRef.current
    if (strip) strip.scrollLeft = start * strip.clientWidth
  }, [start])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (zoom === 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    // Keep the photo's edges from coming further in than the middle of the screen
    const box = e.currentTarget.getBoundingClientRect()
    const limX = (box.width * (zoom - 1)) / 2
    const limY = (box.height * (zoom - 1)) / 2
    const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v))
    setPan({ x: clamp(d.px + e.clientX - d.x, limX), y: clamp(d.py + e.clientY - d.y, limY) })
  }

  const count = `${index + 1} / ${photos.length}${photo.label ? ` · ${photo.label}` : ''}`
  const round = 'flex size-11 items-center justify-center rounded-full'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${house} ${name}`}
      className="fixed inset-0 z-[60] flex animate-[fade-in_200ms_var(--ease-out)] flex-col bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,#f8efe4,#f1e6dc)]"
    >
      <div className="relative z-10 flex items-center gap-4 px-4 pt-4 lg:px-9 lg:pt-5">
        <p className="hidden min-w-0 flex-1 lg:block">
          <small className="block text-[13px] tracking-[0.1em] text-wine uppercase">{house}</small>
          <b className="block truncate font-display text-2xl font-normal">{name}</b>
        </p>
        <p aria-live="polite" className="flex-1 text-sm tracking-[0.14em] text-muted uppercase lg:flex-none">
          {count}
        </p>
        <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom === ZOOMS[0]}
            onClick={() => zoomTo(ZOOMS[ZOOMS.indexOf(zoom) - 1])}
            className={`${round} bg-white disabled:opacity-40`}
          >
            <MinusIcon size={18} />
          </button>
          <button type="button" onClick={fit} className="min-h-11 w-12 text-[15px] tabular-nums">
            {zoom === 1 ? 'Fit' : `${zoom}×`}
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom === ZOOMS.at(-1)}
            onClick={() => zoomTo(ZOOMS[ZOOMS.indexOf(zoom) + 1])}
            className={`${round} mr-4 bg-white disabled:opacity-40`}
          >
            <PlusIcon size={18} />
          </button>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close photos"
          onClick={onClose}
          className={`${round} bg-wine text-white transition-transform duration-150 ease-out active:scale-95`}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Desktop: one photo, zoomable */}
      <div className="relative hidden min-h-0 flex-1 lg:block">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            drag.current = null
            setDragging(false)
          }}
          onDoubleClick={() => (zoom === 1 ? zoomTo(2) : fit())}
          className={`absolute inset-x-28 inset-y-6 flex touch-none items-center justify-center overflow-hidden ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        >
          <img
            src={photo.src}
            alt={photo.label ? `${name}, ${photo.label}` : name}
            draggable={false}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            className={`max-h-full max-w-full rounded-lg object-contain shadow-[0_30px_60px_-24px_rgb(60_30_20/0.4)] select-none ${dragging ? '' : 'transition-transform duration-300 ease-out'}`}
          />
        </div>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(index - 1)}
              className={`${round} absolute top-1/2 left-9 size-12 -translate-y-1/2 bg-white shadow-[0_6px_18px_rgb(40_20_20/0.12)]`}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(index + 1)}
              className={`${round} absolute top-1/2 right-9 size-12 -translate-y-1/2 bg-white shadow-[0_6px_18px_rgb(40_20_20/0.12)]`}
            >
              <ChevronRight />
            </button>
          </>
        )}
        {zoom > 1 && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3.5 py-1 text-sm whitespace-nowrap">
            Drag to look closer · Double-click or press Esc to fit
          </p>
        )}
      </div>
      {photos.length > 1 && (
        <div className="hidden justify-center gap-2.5 pt-2 pb-6 lg:flex">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              aria-label={`Photo ${i + 1}${p.label ? `, ${p.label}` : ''}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`size-16 overflow-hidden rounded-lg border-2 transition-[border-color,opacity] duration-200 ${i === index ? 'border-wine' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={p.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Phone: swipe between photos; pinch zooms with the browser */}
      <div
        ref={stripRef}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-contain lg:hidden"
      >
        {photos.map((p) => (
          <div key={p.src} className="flex w-full flex-none snap-center items-center justify-center px-4">
            <img
              src={p.src}
              alt={p.label ? `${name}, ${p.label}` : name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {photos.length > 1 && <Dots count={photos.length} active={index} />}
        <p className="rounded-full bg-white px-3.5 py-1 text-sm">
          {photos.length > 1 ? 'Swipe for more · pinch to zoom' : 'Pinch to zoom'}
        </p>
      </div>
    </div>,
    document.body,
  )
}

/** Burgundy pill on the current photo, small dots for the rest */
export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <span aria-hidden="true" className="flex justify-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className={`block h-2 rounded-full transition-[width,background-color] duration-300 ease-out ${i === active ? 'w-[22px] bg-wine' : 'w-2 bg-[#d8c7bf]'}`}
        />
      ))}
    </span>
  )
}
