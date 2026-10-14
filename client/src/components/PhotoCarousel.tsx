import { useEffect, useRef, useState } from 'react'
import type { Photo } from '@shared/types.ts'
import BottleArt from './BottleArt.tsx'
import { scrollBehavior } from '../lib/motion.ts'

interface Props {
  photos: Photo[]
  tint: string
  alt: string
  dimmed?: boolean
}

const arrow =
  'absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-lg shadow-sm transition-opacity hover:bg-surface disabled:pointer-events-none disabled:opacity-0'

/** Swipeable scroll-snap gallery with arrows and dots */
export default function PhotoCarousel({ photos, tint, alt, dimmed }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  // where a smooth scroll is heading, so rapid arrow clicks advance from the target, not the mid-scroll position
  const target = useRef<number | null>(null)

  // Track the slide nearest the viewport while scrolling (scroll + rAF works in every browser,
  // unlike scrollsnapchanging which is Chromium-only).
  useEffect(() => {
    const el = track.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const i = Math.round(el.scrollLeft / el.clientWidth)
        if (i === target.current) target.current = null
        setIndex(i)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const current = () => target.current ?? index

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    const clamped = Math.max(0, Math.min(i, photos.length - 1))
    target.current = clamped
    el.scrollTo({ left: clamped * el.clientWidth, behavior: scrollBehavior() })
  }

  const many = photos.length > 1

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault() // replace the native nudge with a whole-slide step
        goTo(current() + (e.key === 'ArrowRight' ? 1 : -1))
      }}
    >
      <div
        ref={track}
        tabIndex={many ? 0 : -1}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl border border-border"
      >
        {photos.map((p, i) => (
          <figure
            key={i}
            className="relative w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${photos.length}: ${p.label}`}
          >
            {p.src ? (
              <img
                src={p.src}
                alt={`${alt}: ${p.label}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="aspect-[4/3] w-full object-cover md:aspect-square"
              />
            ) : (
              <BottleArt
                tint={tint}
                variant={p.variant}
                fill={p.fill}
                className={`aspect-[4/3] md:aspect-square ${dimmed ? 'opacity-60 grayscale' : ''}`}
              />
            )}
            {many && (
              <figcaption className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2.5 py-0.5 text-xs text-muted">
                {p.label}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {many && (
        <>
          <button
            type="button"
            className={`${arrow} left-3`}
            onClick={() => goTo(current() - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${arrow} right-3`}
            onClick={() => goTo(current() + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
          >
            ›
          </button>
          <div className="mt-1 flex justify-center">
            {photos.map((p, i) => (
              // 24px+ tap area around a small visual dot
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}: ${p.label}`}
                aria-current={i === index ? 'true' : undefined}
                className="group flex h-8 min-w-7 items-center justify-center px-1"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${
                    i === index ? 'w-6 bg-accent' : 'w-2 bg-border group-hover:bg-muted'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
