import { Suspense, use, useEffect, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getBrands, getCatalog } from '../api/shop.ts'
import { HouseTile } from '../components/HouseTile.tsx'
import { housesOf } from '../lib/houses.ts'
import { PageHead } from '../components/PageHead.tsx'
import { numberWord, plural } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { TYPE_LABELS } from '../lib/filters.ts'

const copy = site.houses

/**
 * All houses ("Z3"): A to Z letter sections of house tiles. Desktop: a sticky letter rail on the left and type chips
 * (All, Niche, Designer, Dupe) in the head; phones: round letter buttons above the sections. Only houses with decants
 * appear, and only letters that have houses.
 */
export default function AllHouses() {
  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 pb-16 lg:px-12 lg:pt-9 lg:pb-24">
      <Suspense fallback={<PageHead crumb={copy.title} kicker={copy.kicker} title={copy.title} lead=" " />}>
        <Houses />
      </Suspense>
    </div>
  )
}

function Houses() {
  const brands = use(getBrands())
  const catalog = use(getCatalog())
  const [params] = useSearchParams()

  const all = housesOf(brands, catalog)
  const types = Object.keys(TYPE_LABELS).filter((t) => all.some((h) => h.type === t))
  const type = types.includes(params.get('type') ?? '') ? params.get('type') : null
  const houses = type ? all.filter((h) => h.type === type) : all
  const letters = [...new Set(houses.map((h) => h.letter))]
  const current = useCurrentLetter(letters)

  const lead =
    all.length === 1
      ? copy.leadOne.replace('{first}', all[0].brand.name)
      : copy.lead
          .replace('{count}', numberWord(all.length))
          .replace('{first}', all[0]?.brand.name ?? '')
          .replace('{last}', all.at(-1)?.brand.name ?? '')

  return (
    <>
      <PageHead crumb={copy.title} kicker={copy.kicker} title={copy.title} count={all.length} lead={lead}>
        <em className="font-display text-[19px] whitespace-nowrap text-quiet">{copy.browse}</em>
        <div className="flex gap-2">
          {[null, ...types].map((t) => {
            const on = t === type
            const n = t ? all.filter((h) => h.type === t).length : all.length
            return (
              <Link
                key={t ?? 'all'}
                to={t ? `?type=${t}` : '.'}
                replace
                preventScrollReset
                aria-current={on ? 'true' : undefined}
                className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors duration-200 ${on ? 'border-wine bg-wine text-white' : 'border-rose-line bg-white hover:border-wine/60'}`}
              >
                {t ? TYPE_LABELS[t] : copy.all}
                <small className={`text-xs ${on ? 'text-[#e7cdd3]' : 'text-muted'}`}>{n}</small>
              </Link>
            )
          })}
        </div>
      </PageHead>

      {/* Phone: round letter buttons */}
      <Letters letters={letters} current={current} className="mb-3.5 flex flex-wrap gap-1.5 lg:hidden" />

      <div className="lg:grid lg:grid-cols-[56px_1fr] lg:items-start lg:gap-7">
        <Letters
          letters={letters}
          current={current}
          className="sticky top-6 hidden flex-col gap-1.5 rounded-full bg-white px-2 py-2.5 lg:flex"
        />
        <div>
          {letters.map((letter) => {
            const inLetter = houses.filter((h) => h.letter === letter)
            return (
              <section
                key={letter}
                id={`letter-${letter}`}
                aria-labelledby={`letter-${letter}-title`}
                className="mb-[22px] scroll-mt-4 lg:mb-9 lg:scroll-mt-6"
              >
                <div className="mb-3.5 flex items-baseline gap-4">
                  <h2
                    id={`letter-${letter}-title`}
                    className="font-display text-[36px] leading-none text-wine lg:text-[52px]"
                  >
                    {letter}
                  </h2>
                  <i
                    aria-hidden="true"
                    className="h-px flex-1 bg-[linear-gradient(90deg,rgb(109_31_51/0.45),rgb(109_31_51/0.05))]"
                  />
                  <small className="hidden text-[13px] text-muted lg:block">{plural(inLetter.length, 'house')}</small>
                </div>
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-[18px]">
                  {inLetter.map((h) => (
                    <HouseTile key={h.brand.slug} house={h} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}

/** Letter links that scroll to their section; the section in view is filled burgundy */
function Letters({ letters, current, className }: { letters: string[]; current: string; className: string }) {
  const go = (e: MouseEvent, letter: string) => {
    e.preventDefault()
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }
  return (
    <nav aria-label={copy.browse} className={className}>
      {letters.map((letter) => (
        <a
          key={letter}
          href={`#letter-${letter}`}
          onClick={(e) => go(e, letter)}
          aria-current={letter === current ? 'true' : undefined}
          className={`flex size-11 items-center justify-center rounded-full font-display text-lg transition-colors duration-200 lg:size-10 lg:text-[19px] ${letter === current ? 'bg-wine text-white' : 'bg-white text-wine lg:bg-transparent lg:hover:bg-sand'}`}
        >
          {letter}
        </a>
      ))}
    </nav>
  )
}

/** The letter whose section is at the top of the screen (the first one until the sections are reached) */
function useCurrentLetter(letters: string[]) {
  const [current, setCurrent] = useState(letters[0] ?? '')
  const key = letters.join('')
  useEffect(() => {
    // Letters are single characters, so the key splits back into them
    const list = key.split('')
    let frame = 0
    const check = () => {
      frame = 0
      const passed = list.filter(
        (l) => (document.getElementById(`letter-${l}`)?.getBoundingClientRect().top ?? 1) < 140,
      )
      setCurrent(passed.at(-1) ?? list[0] ?? '')
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    check()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [key])
  return current
}
