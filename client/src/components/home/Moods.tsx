import { use, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@shared/stock.ts'
import { getCatalog, getHome, type Mood } from '../../api/shop.ts'
import { productPath } from '../../lib/catalog.ts'
import type { ShopListing } from '@shared/types.ts'
import { fromOption } from '@shared/shop.ts'
import { ChevronRight } from '../icons.tsx'

/** Phones start with this many moods and a button for the rest */
const PHONE_COUNT = 3

/** "03 Shop by mood": the moods typeset like a wine list, three picks each, priced at the smallest size */
export function Moods() {
  const { moods } = use(getHome())
  const catalog = use(getCatalog())
  const [showAll, setShowAll] = useState(false)
  const hiddenCount = moods.length - PHONE_COUNT

  return (
    <div className="reveal grid gap-y-[26px] rounded-2xl bg-white px-4 pt-5 pb-[22px] lg:grid-cols-3 lg:gap-x-14 lg:gap-y-10 lg:px-12 lg:pt-11 lg:pb-10">
      {moods.map((mood, i) => (
        <MoodList
          key={mood.slug}
          mood={mood}
          catalog={catalog}
          className={i < PHONE_COUNT ? '' : showAll ? 'animate-rise' : 'hidden lg:block'}
          delay={showAll && i >= PHONE_COUNT ? (i - PHONE_COUNT) * 60 : 0}
        />
      ))}
      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-ink text-[15px] transition-transform duration-150 ease-out active:scale-[0.97] lg:hidden"
        >
          {hiddenCount} more moods <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}

function MoodList({
  mood,
  catalog,
  className,
  delay,
}: {
  mood: Mood
  catalog: ShopListing[]
  className: string
  delay: number
}) {
  const picks = mood.picks.flatMap((slug) => catalog.find((l) => l.slug === slug) ?? [])
  return (
    <section
      aria-labelledby={`mood-${mood.slug}`}
      className={`border-t border-ink pt-[18px] ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <h3 id={`mood-${mood.slug}`} className="font-display text-2xl leading-[1.1] lg:text-[28px]">
        {mood.name}
      </h3>
      <p className="mt-1.5 mb-3.5 text-sm text-muted lg:min-h-[42px]">{mood.line}</p>
      <ul>
        {picks.map((l) => {
          const { price, sizeMl } = fromOption(l)
          return (
            <li key={l.slug}>
              <Link to={productPath(l.slug)} className="group block py-[7px]">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-[17px] whitespace-nowrap transition-colors group-hover:text-wine lg:text-[19px]">
                    {l.name}
                  </span>
                  <i aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-[#aeb6be]" />
                  <b className="text-sm font-medium whitespace-nowrap lg:text-[15px]">{formatPrice(price)}</b>
                </span>
                <small className="block text-xs text-muted">
                  {l.house}, {sizeMl} ml
                </small>
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to={`/decants?mood=${mood.slug}`}
        className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 text-sm text-wine lg:min-h-0"
      >
        <span className="link-line pb-0.5">Shop the list</span>
        <ChevronRight size={14} />
      </Link>
    </section>
  )
}

export function MoodsSkeleton() {
  return <div aria-hidden="true" className="h-[640px] rounded-2xl bg-white/70 lg:h-[620px]" />
}
