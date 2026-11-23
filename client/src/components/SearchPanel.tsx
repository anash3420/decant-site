import {
  Suspense,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import type { ShopListing } from '@shared/types.ts'
import { fromOption } from '@shared/shop.ts'
import { formatPrice } from '@shared/stock.ts'
import { getCatalog, recordSearch } from '../api/shop.ts'
import { housePath, isNew, plural, productPath } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { dimClass, slideClass } from '../lib/overlay.ts'
import { closeSearch, highlight, search, useSearchOpen, type Suggestion } from '../lib/search.ts'
import { useModal } from '../lib/useModal.ts'
import { Photo } from './Photo.tsx'
import { ArrowRight, ChevronLeft, ChevronRight, CloseIcon, SearchIcon } from './icons.tsx'

const copy = site.search
/** How long typing must pause before the search runs (ms) */
const SEARCH_DELAY = 500
const wide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

/**
 * The search panel, mounted once in the layout and opened from the header's search icon or the phone menu. Desktop:
 * a white panel drops from the top over the header and dims the page. Phone: it fills the screen from the top.
 * Before typing it shows popular searches and the newest decants; while typing, matching houses and accords, then
 * decants with the matched letters underlined. Enter or "See all results" opens All decants with the search.
 */
export function SearchPanel() {
  const open = useSearchOpen()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  useModal(open, closeSearch, inputRef)

  const q = query.trim()
  // The search runs 0.5 s after typing stops, so each keystroke doesn't hit the search API. Enter still submits
  // straight away, and a popular search (or clearing the field) shows at once.
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(q), SEARCH_DELAY)
    return () => window.clearTimeout(t)
  }, [q])
  const mode = q && settled ? 'results' : 'start'
  const pick = (term: string) => {
    setQuery(term)
    setSettled(term)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!q) return
    recordSearch(q)
    closeSearch()
    navigate(`/decants?q=${encodeURIComponent(q)}`)
  }
  // Any link inside (a decant, a suggestion, the catalogue) closes the panel as the page changes
  const closeOnLink = (e: MouseEvent) => (e.target as Element).closest('a') && closeSearch()

  return createPortal(
    <>
      <div aria-hidden="true" onClick={closeSearch} className={dimClass(open)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        inert={!open}
        onClick={closeOnLink}
        className={`fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-white lg:h-auto lg:max-h-[92dvh] lg:rounded-b-3xl lg:shadow-[0_30px_60px_-30px_rgb(42_13_22/0.45)] ${slideClass(open)} ${open ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <form
          role="search"
          onSubmit={submit}
          className="relative flex flex-none items-center gap-3 border-b border-line px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3.5 lg:h-24 lg:gap-[18px] lg:border-0 lg:px-12 lg:py-0"
        >
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-[#f3ece4] px-3.5 lg:h-auto lg:gap-[18px] lg:rounded-none lg:bg-transparent lg:px-0">
            <SearchIcon size={22} className="size-[18px] flex-none text-muted lg:size-6 lg:text-wine" />
            <span className="sr-only">Search the shop</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder={wide() ? copy.placeholder : copy.phonePlaceholder}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8a7d73] lg:font-display lg:text-[30px] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="-mr-2 flex size-11 flex-none items-center justify-center transition-transform duration-[120ms] ease-out active:scale-[0.96] lg:mr-0 lg:w-auto lg:text-[15px] lg:text-wine"
              >
                <span className="flex size-[22px] items-center justify-center rounded-full bg-[#c9b9b0] text-white lg:hidden">
                  <CloseIcon size={12} strokeWidth={3} />
                </span>
                <span className="hidden lg:inline">Clear</span>
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={closeSearch}
            className="flex min-h-11 flex-none items-center text-base text-wine transition-transform duration-[120ms] ease-out active:scale-[0.96] lg:hidden"
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="hidden size-11 flex-none items-center justify-center rounded-full border border-line transition-[border-color,transform] duration-[120ms] ease-out hover:border-wine active:scale-[0.96] lg:flex"
          >
            <CloseIcon size={20} />
          </button>
          {/* Desktop: the fine burgundy line under the field */}
          <i
            aria-hidden="true"
            className="absolute inset-x-12 bottom-0 hidden h-px bg-[linear-gradient(90deg,#6d1f33,rgb(109_31_51/0.12))] lg:block"
          />
        </form>

        <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-5 lg:px-12 lg:pt-[34px] lg:pb-10">
          {/* A new key per mode, so only switching between the start lists and results fades in (180 ms) */}
          <div key={mode} className="flex flex-1 animate-[fade-in_180ms_var(--ease-out)_both] flex-col">
            {/* While typing, the last results dim until the new search runs, so they don't read as the answer */}
            <div
              className={`flex flex-1 flex-col transition-opacity duration-150 ease-out ${mode === 'results' && settled !== q ? 'opacity-55' : ''}`}
            >
              <Suspense fallback={null}>
                {mode === 'results' ? <Results query={settled} /> : <Start onPick={pick} />}
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

/**
 * Nothing typed yet: popular searches, then recommended products.
 * shortcut: both lists are hardcoded in site.json `search`; fetch them from the API when the backend exists.
 */
function Start({ onPick }: { onPick: (q: string) => void }) {
  const catalog = use(getCatalog())
  // In the order listed; a decant no longer in the shop is left out
  const picks = copy.recommended.flatMap((slug) => catalog.find((l) => l.slug === slug) ?? []).slice(0, 4)
  return (
    <div className="pb-8 lg:grid lg:grid-cols-[250px_1fr] lg:gap-14 lg:pb-0">
      <section aria-labelledby="search-popular">
        <Kicker id="search-popular">{copy.popularTitle}</Kicker>
        <ul className="mt-3 mb-6 flex flex-wrap gap-2 lg:mb-0 lg:block">
          {copy.popular.map((term) => (
            <li key={term}>
              <button
                type="button"
                onClick={() => onPick(term)}
                className="flex h-11 items-center rounded-full border border-line px-[15px] text-[15px] transition-colors duration-150 active:bg-[#f3ece4] lg:h-auto lg:border-0 lg:px-0 lg:py-[7px] lg:font-display lg:text-xl lg:hover:text-wine"
              >
                {/* Desktop: the underline grows from 25% to the full word on hover, like the shop's other links */}
                <span className="lg:link-line lg:pb-0.5">{term}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="search-recommended">
        <div className="mb-1.5 flex items-center justify-between lg:mb-4">
          <Kicker id="search-recommended">{copy.recommendedTitle}</Kicker>
        </div>
        <div className="hidden grid-cols-4 gap-[18px] lg:grid">
          {picks.map((l) => (
            <Card key={l.slug} listing={l} />
          ))}
        </div>
        <div className="mt-[26px] hidden border-t border-line pt-[18px] lg:block">
          <Link to="/decants" className="inline-flex items-center gap-1.5 text-[15px] text-wine">
            <span className="link-line pb-0.5">Shop all {catalog.length} decants</span> <ArrowRight size={14} />
          </Link>
        </div>
        <div className="lg:hidden">
          {picks.map((l) => (
            <Row key={l.slug} listing={l} />
          ))}
          <Link
            to="/decants"
            className="mt-[18px] flex h-[52px] items-center justify-center gap-2 rounded-full border border-wine/35 text-[15px] font-medium text-wine transition-transform duration-[120ms] ease-out active:scale-[0.98]"
          >
            Shop all {catalog.length} decants <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}

/** While typing: houses and accords to jump to, then the matching decants */
function Results({ query }: { query: string }) {
  const catalog = use(getCatalog())
  const { suggestions, decants } = useMemo(() => search(catalog, query), [catalog, query])

  if (!suggestions.length && !decants.length) {
    return (
      <div
        className="animate-rise py-10 text-center motion-reduce:animate-[fade-in_200ms_var(--ease-out)_both] lg:py-14"
        role="status"
      >
        <p className="font-display text-2xl lg:text-3xl">
          {copy.empty.title} “{query}”
        </p>
        <p className="mt-2 text-muted">{copy.empty.text}</p>
        <Link to="/decants" className="mt-5 inline-flex items-center gap-1.5 text-[15px] text-wine">
          <span className="link-line pb-0.5">Shop all {catalog.length} decants</span> <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[250px_1fr] lg:gap-14">
      <section aria-labelledby="search-suggestions" className="mb-6 lg:mb-0">
        {suggestions.length > 0 && (
          <>
            <Kicker id="search-suggestions">{copy.suggestionsTitle}</Kicker>
            <ul className="mt-3 flex flex-wrap gap-2 lg:mt-1.5 lg:block">
              {suggestions.map((s) => (
                <li key={`${s.kind}-${s.value}`}>
                  <SuggestionLink suggestion={s} query={query} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="search-decants" className="min-w-0">
        {decants.length > 0 && (
          <>
            {/* A new query starts the row at the beginning */}
            <CardRow key={query} listings={decants} query={query} />
            <Kicker id="search-decants" className="mb-1.5 lg:hidden">
              {copy.decantsTitle}
            </Kicker>
            {/* Phone: every match as a row; the panel scrolls */}
            <div className="lg:hidden">
              {decants.map((l) => (
                <Row key={l.slug} listing={l} query={query} />
              ))}
            </div>
          </>
        )}
        <div className="mt-[26px] hidden items-center justify-between border-t border-line pt-[18px] text-sm lg:flex">
          <span className="text-muted" role="status">
            {plural(decants.length, 'decant')} {decants.length === 1 ? 'matches' : 'match'}
          </span>
          {decants.length > 0 && (
            <button type="button" onClick={submitParent} className="flex items-center gap-1.5 text-[15px] text-wine">
              <span className="link-line pb-0.5">See all results for “{query}”</span> <ArrowRight size={14} />
            </button>
          )}
        </div>
      </section>

      {/* Phone: stays at the bottom of the screen, above the keyboard */}
      {decants.length > 0 && (
        <div className="sticky bottom-0 -mx-4 mt-auto animate-[bar-up_260ms_var(--ease-out)_both] border-t border-line bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] motion-reduce:animate-[fade-in_200ms_var(--ease-out)_both] lg:hidden">
          <button
            type="button"
            onClick={submitParent}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-wine text-[15px] font-medium text-white active:scale-[0.98]"
          >
            {decants.length === 1 ? 'See the result' : `See all ${decants.length} results`} <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Desktop: the matching decants, four in view. With more than four the row scrolls sideways (trackpad, or the arrows
 * beside the heading, which move one view at a time and dim at each end).
 */
function CardRow({ listings, query }: { listings: ShopListing[]; query: string }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [ends, setEnds] = useState({ start: true, end: listings.length <= 4 })
  const onScroll = () => {
    const el = rowRef.current
    if (el) setEnds({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 })
  }
  const page = (dir: 1 | -1) => {
    const el = rowRef.current
    el?.scrollBy({
      left: dir * (el.clientWidth + 18),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }
  const arrow =
    'flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors duration-150 hover:border-wine hover:text-wine disabled:pointer-events-none disabled:opacity-35'

  return (
    <div className="hidden lg:block">
      <div className="mb-4 flex items-center justify-between">
        <Kicker id="search-decants-row">{copy.decantsTitle}</Kicker>
        {listings.length > 4 && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous decants"
              disabled={ends.start}
              onClick={() => page(-1)}
              className={arrow}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="More decants"
              disabled={ends.end}
              onClick={() => page(1)}
              className={arrow}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div
        ref={rowRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-[18px] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      >
        {listings.map((l) => (
          <div key={l.slug} className="w-[calc((100%-54px)/4)] flex-none snap-start">
            <Card listing={l} query={query} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** "See all results" submits the search form above, so it does exactly what Enter does */
function submitParent(e: MouseEvent<HTMLButtonElement>) {
  e.preventDefault()
  e.currentTarget.closest('[role="dialog"]')?.querySelector('form')?.requestSubmit()
}

function SuggestionLink({ suggestion: s, query }: { suggestion: Suggestion; query: string }) {
  const to = s.kind === 'house' ? housePath(s.value) : `/decants?accord=${encodeURIComponent(s.value)}`
  const kind = s.kind === 'house' ? 'House' : 'Accord'
  return (
    <Link
      to={to}
      className="flex h-11 items-center gap-1.5 rounded-full border border-line px-[15px] text-[15px] lg:block lg:h-auto lg:rounded-none lg:border-0 lg:border-b lg:border-[#efe6de] lg:px-0 lg:py-2.5"
    >
      <b className="font-normal lg:block lg:font-display lg:text-[22px]">
        <Marked text={s.label} query={query} />
      </b>
      <span className="text-xs text-muted lg:text-[13px]">
        {kind}
        <span className="hidden lg:inline"> · {plural(s.count, 'decant')}</span>
      </span>
    </Link>
  )
}

/** Desktop result: a small card, photo, house, name and price */
function Card({ listing, query = '' }: { listing: ShopListing; query?: string }) {
  const { price, sizeMl } = fromOption(listing)
  const photo = listing.photos?.[0]
  return (
    <Link to={productPath(listing.slug)} onClick={() => query && recordSearch(listing.name)} className="group block">
      <span className="relative block">
        <Photo
          src={photo?.src ?? ''}
          alt=""
          width={photo?.width}
          height={photo?.height}
          className="isolate aspect-[4/5] rounded-[14px]"
          imgClassName="motion-safe:fine:group-hover:scale-105"
        />
        {isNew(listing) && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-wine px-2 py-0.5 text-[11px] text-white">New</span>
        )}
      </span>
      <span className="mt-3 block text-[13px] text-muted">
        <Marked text={listing.house} query={query} />
      </span>
      <span className="mt-0.5 block font-display text-[19px] leading-tight transition-colors group-hover:text-wine">
        <Marked text={listing.name} query={query} />
      </span>
      <span className="mt-1.5 block text-sm">
        From {formatPrice(price)} <small className="text-[13px] text-muted">for {sizeMl} ml</small>
      </span>
    </Link>
  )
}

/** Phone result: a row with a small photo, house, name, price and an arrow */
function Row({ listing, query = '' }: { listing: ShopListing; query?: string }) {
  const { price, sizeMl } = fromOption(listing)
  const photo = listing.photos?.[0]
  return (
    <Link
      to={productPath(listing.slug)}
      onClick={() => query && recordSearch(listing.name)}
      className="grid grid-cols-[64px_1fr_40px] items-center gap-3.5 border-b border-[#f1e9e2] py-2.5 active:bg-[#faf6f1]"
    >
      <Photo
        src={photo?.src ?? ''}
        alt=""
        width={photo?.width}
        height={photo?.height}
        className="h-20 w-16 rounded-[10px]"
      />
      <span className="min-w-0">
        <span className="block text-xs text-muted">
          <Marked text={listing.house} query={query} />
        </span>
        <span className="mt-px mb-1 block truncate font-display text-[17px]">
          <Marked text={listing.name} query={query} />
        </span>
        <span className="block text-sm">
          From {formatPrice(price)} <small className="text-xs text-muted">for {sizeMl} ml</small>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full border border-line text-wine"
      >
        <ArrowRight size={16} />
      </span>
    </Link>
  )
}

/** The text with the query's letters underlined in burgundy */
function Marked({ text, query }: { text: string; query: string }) {
  if (!query) return text
  return highlight(text, query).map((p, i) =>
    p.match ? (
      <mark key={i} className="bg-transparent text-wine underline decoration-1 underline-offset-[3px]">
        {p.text}
      </mark>
    ) : (
      p.text
    ),
  )
}

function Kicker({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <h2 id={id} className={`flex items-center gap-2.5 text-xs tracking-[0.14em] text-wine uppercase ${className}`}>
      <i aria-hidden="true" className="block h-px w-8 bg-wine/60" />
      {children}
    </h2>
  )
}
