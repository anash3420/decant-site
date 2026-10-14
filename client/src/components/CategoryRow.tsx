import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Fragrance } from '@shared/types.ts'
import FragranceCard from './FragranceCard.tsx'
import { scrollBehavior } from '../lib/motion.ts'

interface Props {
  title: string
  blurb: string
  items: Fragrance[]
  viewAllHref: string
}

const arrow =
  'flex size-11 items-center justify-center rounded-full border border-border bg-surface text-lg transition-colors hover:border-muted disabled:opacity-35 disabled:hover:border-border'

/** One category as a horizontally scrolling row: arrow buttons on desktop, swipe on touch */
export default function CategoryRow({ title, blurb, items, viewAllHref }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const update = () => {
      setAtStart(el.scrollLeft <= 4)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [items])

  const page = (dir: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: scrollBehavior() })
  }

  return (
    <section aria-labelledby={`row-${viewAllHref}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={`row-${viewAllHref}`} className="text-3xl">
            {title} <span className="font-sans text-base text-muted">({items.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted">{blurb}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={viewAllHref}
            className="inline-flex min-h-11 items-center text-sm font-medium whitespace-nowrap text-accent underline-offset-4 hover:underline sm:mr-2"
          >
            View all →
          </Link>
          {/* Arrows only where there's a pointer; touch users swipe */}
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              className={arrow}
              onClick={() => page(-1)}
              disabled={atStart}
              aria-label={`Scroll ${title} left`}
            >
              ‹
            </button>
            <button
              type="button"
              className={arrow}
              onClick={() => page(1)}
              disabled={atEnd}
              aria-label={`Scroll ${title} right`}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div
        ref={track}
        className="-mx-5 mt-5 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {items.map((f) => (
          <div key={f.slug} className="w-[78%] shrink-0 snap-start sm:w-64">
            <FragranceCard fragrance={f} />
          </div>
        ))}
      </div>
    </section>
  )
}
