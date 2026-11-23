import { Fragment, Suspense, use, useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { DecantListing } from '@shared/types.ts'
import { getCatalog, getHome } from '../api/shop.ts'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard.tsx'
import { FilterPanel, SortMenu, SortSheet } from '../components/catalogue/FilterPanel.tsx'
import { ArrowRight, ChevronDown, ChevronRight, CloseIcon, SlidersIcon } from '../components/icons.tsx'
import { numberWord, plural } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import {
  activeCount,
  applyFilters,
  buildGroups,
  choiceLabel,
  emptyFilters,
  GROUP_KEYS,
  readParams,
  SORTS,
  toggle,
  widenings,
  writeParams,
  type Filters,
  type Group,
  type GroupKey,
  type SortValue,
} from '../lib/filters.ts'

const copy = site.catalogue
/** The mood tile is the 8th item in the unfiltered grid */
const MOOD_TILE_AT = 7
/** Fewer results than this (with filters on) get the "widen your search" box */
const SHORT = 5

/** All decants: the page head, Filter & Sort, and the full grid */
export default function Decants() {
  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 lg:px-12 lg:pt-9">
      <Suspense fallback={<Fallback />}>
        <Catalogue />
      </Suspense>
    </div>
  )
}

function Catalogue() {
  const catalog = use(getCatalog())
  const { moods } = use(getHome())
  const [params, setParams] = useSearchParams()
  const { filters, sort } = useMemo(() => readParams(params), [params])
  const groups = useMemo(() => buildGroups(catalog, moods), [catalog, moods])
  const results = useMemo(() => applyFilters(catalog, filters, moods, sort), [catalog, filters, moods, sort])

  const [panel, setPanel] = useState(false)
  const [sortSheet, setSortSheet] = useState(false)
  const closePanel = useCallback(() => setPanel(false), [])
  const closeSort = useCallback(() => setSortSheet(false), [])
  // After the visitor changes something, newly shown cards ease in (not on first load)
  const [changed, setChanged] = useState(false)

  // The URL holds the state: menu links and shared links open the same results. Replace, so ticking boxes
  // doesn't fill the back button, and keep the scroll position.
  const update = useCallback(
    (next: Filters, nextSort: SortValue) => {
      setChanged(true)
      setParams(writeParams(next, nextSort), { replace: true, preventScrollReset: true })
    },
    [setParams],
  )

  const active = activeCount(filters)
  const houses = new Set(catalog.map((l) => l.brandSlug)).size
  const short = active > 0 && results.length < SHORT
  const widen = short ? widenings(catalog, filters, moods, groups, results.length) : []

  return (
    <>
      <PageHead count={catalog.length} smallest={smallestSize(catalog)} />

      {/* Phone: a scrolling row of accords, one at a time */}
      <AccordPills
        group={groups.accord}
        total={catalog.length}
        filters={filters}
        onPick={(accord) => update({ ...filters, accord: accord ? [accord] : [] }, sort)}
      />

      {/* Phone: Filter and Sort stay under the thumb as the grid scrolls */}
      <div className="sticky top-0 z-30 -mx-4 mb-3.5 flex gap-2.5 border-y border-line bg-[rgb(245_239_231/0.92)] px-4 py-2.5 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          onClick={() => setPanel(true)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-wine text-[15px] font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <SlidersIcon size={18} />
          Filter
          {active > 0 && <Badge n={active} />}
        </button>
        <button
          type="button"
          onClick={() => setSortSheet(true)}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-rose-line bg-white text-[15px] transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <small className="text-sm text-muted">Sort</small>
          {SORTS.find((s) => s.value === sort)!.short}
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Desktop: Filter & Sort, the count with the active filters, and the sort in words */}
      <div className="mb-5 hidden min-h-12 items-center gap-[18px] lg:flex">
        <button
          type="button"
          onClick={() => setPanel(true)}
          className="flex h-12 items-center gap-2.5 rounded-full bg-wine px-[22px] text-[15px] font-medium whitespace-nowrap text-white shadow-[0_6px_16px_rgb(109_31_51/0.18)] transition-transform duration-150 ease-out hover:-translate-y-px active:scale-[0.97]"
        >
          <SlidersIcon size={18} />
          Filter &amp; Sort
          {active > 0 && <Badge n={active} />}
        </button>
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <ResultCount shown={results.length} total={catalog.length} houses={houses} active={active} />
          <ActiveChips groups={groups} filters={filters} onChange={(f) => update(f, sort)} />
        </div>
        <SortMenu sort={sort} onSort={(s) => update(filters, s)} />
      </div>

      <div className="mb-3 lg:hidden">
        <PhoneCount shown={results.length} total={catalog.length} filters={filters} groups={groups} />
        {/* One accord alone is already shown by its pill and the count */}
        {active > 0 && !(active === 1 && filters.accord.length === 1) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <ActiveChips groups={groups} filters={filters} onChange={(f) => update(f, sort)} />
          </div>
        )}
      </div>

      <h2 className="sr-only">Results</h2>
      <div className="grid grid-cols-2 items-start gap-x-2.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
        {results.map((listing, i) => (
          <Fragment key={listing.slug}>
            {active === 0 && i === MOOD_TILE_AT && <MoodTile count={moods.length} />}
            <div className="reveal">
              <div
                className={changed ? 'animate-card-in' : undefined}
                style={changed ? { animationDelay: `${Math.min(i, 8) * 40}ms` } : undefined}
              >
                <ProductCard listing={listing} priority={i < 4} />
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      {short && (
        <Widen
          shown={results.length}
          options={widen}
          onPick={(f) => update(f, sort)}
          onClear={() => update(emptyFilters(), sort)}
        />
      )}

      <FilterPanel
        open={panel}
        onClose={closePanel}
        groups={groups}
        filters={filters}
        sort={sort}
        onChange={update}
        resultCount={results.length}
        catalog={catalog}
      />
      <SortSheet open={sortSheet} onClose={closeSort} sort={sort} onSort={(s) => update(filters, s)} />
    </>
  )
}

const smallestSize = (catalog: DecantListing[]) => Math.min(...catalog.flatMap((l) => l.prices.map((p) => p.sizeMl)))

/** Crumb, kicker, "All decants" over its count as a big outlined number, and the line to the right */
function PageHead({ count, smallest }: { count?: number; smallest?: number }) {
  return (
    <header className="relative isolate mb-5 lg:mb-10 lg:flex lg:items-end lg:justify-between">
      <div className="relative">
        <nav aria-label="Breadcrumb" className="mb-14 hidden text-[13px] text-muted lg:block">
          <Link to="/" className="hover:text-wine">
            Home
          </Link>
          <span aria-hidden="true" className="mx-1.5 text-[#c9b9b0]">
            /
          </span>
          <span aria-current="page">All decants</span>
        </nav>
        <div className="relative">
          <span
            aria-hidden="true"
            className="outline-num -top-[34px] -left-2 text-[120px] lg:-top-[58px] lg:-left-3.5 lg:text-[210px]"
          >
            {count === undefined ? '' : String(count).padStart(2, '0')}
          </span>
          <p className="mb-2.5 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
            Shop
            <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
            {copy.kicker}
          </p>
          <h1 className="font-display text-[40px] leading-none lg:text-[64px]">All decants</h1>
          <p className="mt-2.5 font-display text-base text-quiet italic lg:hidden">{copy.phoneLead}</p>
          <p className="mt-2.5 hidden min-h-[29px] font-display text-[19px] text-quiet italic lg:block">
            {count !== undefined && copy.lead.replace('{count}', numberWord(count))}
          </p>
        </div>
      </div>

      <div className="mb-3 ml-10 hidden min-w-0 flex-1 items-center gap-[18px] lg:flex">
        <i aria-hidden="true" className="trail-line flex-1" />
        <em className="font-display text-[19px] whitespace-nowrap text-quiet">
          {smallest !== undefined && copy.note.replace('{smallest}', String(smallest))}
        </em>
        <Link
          to={copy.link.to}
          className="flex items-center gap-1.5 border-b border-wine/50 pb-0.5 text-[15px] whitespace-nowrap text-wine"
        >
          {copy.link.label}
          <ArrowRight size={14} />
        </Link>
      </div>
    </header>
  )
}

function Badge({ n }: { n: number }) {
  return (
    <em className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 text-xs text-wine not-italic">
      {n}
    </em>
  )
}

function ResultCount({
  shown,
  total,
  houses,
  active,
}: {
  shown: number
  total: number
  houses: number
  active: number
}) {
  return (
    <p className="mr-1.5 text-[15px] text-muted">
      {active === 0 ? (
        <>
          <b className="font-medium text-ink">{total}</b> decants from {plural(houses, 'house')}
        </>
      ) : (
        <>
          <b className="font-medium text-ink">{shown}</b> of {total} decants
        </>
      )}
    </p>
  )
}

/** "10 woody decants" when one accord is picked, otherwise "4 of 13 decants" */
function PhoneCount({
  shown,
  total,
  filters,
  groups,
}: {
  shown: number
  total: number
  filters: Filters
  groups: Record<GroupKey, Group>
}) {
  const only = activeCount(filters) === 1 && filters.accord.length === 1
  return (
    <p className="text-sm text-muted">
      <b className="font-medium text-ink">{shown}</b>{' '}
      {only
        ? `${choiceLabel(groups, 'accord', filters.accord[0]).toLowerCase()} ${shown === 1 ? 'decant' : 'decants'}`
        : shown === total
          ? 'decants'
          : `of ${total} decants`}
    </p>
  )
}

/** The active filters as white chips with a burgundy outline; each removes itself */
function ActiveChips({
  groups,
  filters,
  onChange,
}: {
  groups: Record<GroupKey, Group>
  filters: Filters
  onChange: (filters: Filters) => void
}) {
  const chips = GROUP_KEYS.flatMap((key) => filters[key].map((value) => ({ key, value })))
  if (chips.length === 0) return null
  return (
    <>
      {chips.map(({ key, value }) => (
        <button
          key={`${key}-${value}`}
          type="button"
          onClick={() => onChange(toggle(filters, key, value))}
          aria-label={`Remove ${choiceLabel(groups, key, value)}`}
          className="flex h-11 animate-[tile-in_180ms_var(--ease-out)_both] items-center gap-2 rounded-full border border-wine/40 bg-white pr-3 pl-4 text-sm text-wine transition-colors duration-150 hover:border-wine lg:h-9"
        >
          {choiceLabel(groups, key, value)}
          <CloseIcon size={14} />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(emptyFilters())}
        className="ml-1 flex min-h-11 items-center text-sm text-wine underline decoration-wine/50 underline-offset-4 lg:min-h-0"
      >
        Clear all
      </button>
    </>
  )
}

/** Phone: "Everything 13", then each accord with its count; picking one shows just that accord */
function AccordPills({
  group,
  total,
  filters,
  onPick,
}: {
  group: Group
  total: number
  filters: Filters
  onPick: (accord: string | null) => void
}) {
  const current = filters.accord.length === 1 ? filters.accord[0].toLowerCase() : null
  const pills = [{ value: null, label: 'Everything', count: total }, ...group.options]
  return (
    <div className="scroll-row -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 lg:hidden">
      {pills.map((p) => {
        const on = p.value === null ? filters.accord.length === 0 : p.value.toLowerCase() === current
        return (
          <button
            key={p.label}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(p.value)}
            className={`flex h-11 flex-none items-center gap-1.5 rounded-full border px-4 font-display text-[17px] transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${on ? 'border-wine bg-wine text-white' : 'border-rose-line bg-white'}`}
          >
            {p.label}
            <small className={`font-sans text-xs ${on ? 'text-wine-soft' : 'text-muted'}`}>{p.count}</small>
          </button>
        )
      })}
    </div>
  )
}

/** The 8th card: a way in for anyone who doesn't know where to start */
function MoodTile({ count }: { count: number }) {
  const t = copy.moodTile
  return (
    <div className="burgundy burgundy-mid reveal flex flex-col self-stretch rounded-xl p-4 lg:rounded-[14px] lg:p-6">
      <h3 className="font-display text-xl leading-[1.15] lg:text-3xl lg:leading-[1.1]">{t.title}</h3>
      <p className="mt-auto pt-4 text-[13px] text-wine-soft lg:text-[15px]">
        {t.text.replace('{count}', numberWord(count))}
      </p>
      <Link
        to={t.to}
        className="mt-4 flex h-11 items-center self-start rounded-full border-2 border-gold bg-white px-4 text-sm font-medium text-ink transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.97] lg:mt-6 lg:px-5 lg:text-[15px]"
      >
        {t.button}
      </Link>
    </div>
  )
}

/** For a short result: "Only 4 match. Widen your search:" with one way to widen per filter group */
function Widen({
  shown,
  options,
  onPick,
  onClear,
}: {
  shown: number
  options: { key: GroupKey; label: string; gain: number; filters: Filters }[]
  onPick: (filters: Filters) => void
  onClear: () => void
}) {
  return (
    <div className="mt-7 flex animate-rise flex-col gap-2 rounded-xl border border-dashed border-wine/35 bg-white/50 p-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5 lg:rounded-[14px] lg:px-6 lg:py-[22px]">
      <div className="lg:mr-3.5">
        <b className="block font-display text-xl font-normal lg:text-[22px]">
          {shown === 0
            ? 'Nothing matches.'
            : `Only ${numberWord(shown).toLowerCase()} ${shown === 1 ? 'matches' : 'match'}.`}
        </b>
        <span className="text-sm text-muted">Widen your search:</span>
      </div>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.filters)}
          className="flex h-11 items-center justify-between gap-2 rounded-full border border-rose-line bg-white px-4 text-[15px] transition-colors duration-150 hover:border-wine lg:h-10 lg:text-sm"
        >
          {o.label}
          <small className="text-sm text-wine lg:text-xs">+{o.gain}</small>
        </button>
      ))}
      {options.length === 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-11 items-center justify-between gap-2 rounded-full border border-rose-line bg-white px-4 text-[15px] lg:h-10 lg:text-sm"
        >
          Clear all filters
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}

/** Same footprint while the catalogue loads, so nothing jumps */
function Fallback() {
  return (
    <div aria-hidden="true">
      <PageHead />
      <div className="mb-3 h-11 lg:hidden" />
      <div className="mb-5 h-12" />
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
