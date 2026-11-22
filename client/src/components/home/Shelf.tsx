import { use, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCatalog } from '../../api/shop.ts'
import { byNewest, hasSize, isNew, numberWord } from '../../lib/catalog.ts'
import { ProductCard, ProductCardSkeleton } from '../ProductCard.tsx'

const SHOWN = 6

type Filter = { kind: 'all' } | { kind: 'new' } | { kind: 'size'; sizeMl: number }

const filterLabel = (f: Filter) => (f.kind === 'all' ? 'All' : f.kind === 'new' ? 'New in' : `${f.sizeMl} ml`)
const sameFilter = (a: Filter, b: Filter) => filterLabel(a) === filterLabel(b)

/** "01 The shelf": the newest decants with quick filters, then a tile to the full catalogue */
export function Shelf() {
  const catalog = use(getCatalog())
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })
  // After the visitor changes the filter, newly shown cards ease in (not on first load)
  const [changed, setChanged] = useState(false)

  const filters = useMemo<Filter[]>(() => {
    const sizes = [...new Set(catalog.flatMap((l) => l.prices.map((p) => p.sizeMl)))].sort((a, b) => a - b)
    return [{ kind: 'all' }, { kind: 'new' }, ...sizes.map((sizeMl) => ({ kind: 'size' as const, sizeMl }))]
  }, [catalog])

  const shown = useMemo(() => {
    const matches = catalog.filter((l) =>
      filter.kind === 'all' ? true : filter.kind === 'new' ? isNew(l) : hasSize(l, filter.sizeMl),
    )
    return matches.sort(byNewest).slice(0, SHOWN)
  }, [catalog, filter])

  const sizes = filters.flatMap((f) => (f.kind === 'size' ? [f.sizeMl] : []))

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4 lg:mb-6">
        <div className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:[mask-image:none] lg:px-0">
          {filters.map((f) => {
            const on = sameFilter(f, filter)
            return (
              <button
                key={filterLabel(f)}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFilter(f)
                  setChanged(true)
                }}
                className={`flex h-10 flex-none items-center rounded-full border px-4 text-[15px] transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] lg:h-auto lg:px-[18px] lg:py-[9px] lg:text-sm ${
                  on ? 'border-wine bg-wine text-white' : 'border-rose-line bg-white hover:border-wine'
                }`}
              >
                {filterLabel(f)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-x-2.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
        {shown.map((listing, i) => (
          <div key={listing.slug} className="reveal">
            <div
              className={changed ? 'animate-card-in' : undefined}
              style={changed ? { animationDelay: `${i * 40}ms` } : undefined}
            >
              <ProductCard listing={listing} priority={i < 2} />
            </div>
          </div>
        ))}
        <MoreTile count={catalog.length} sizes={sizes} />
      </div>
    </>
  )
}

function MoreTile({ count, sizes }: { count: number; sizes: number[] }) {
  const sizeList = sizes.length > 1 ? `${sizes.slice(0, -1).join(', ')} and ${sizes.at(-1)}` : `${sizes[0] ?? ''}`
  return (
    <div className="burgundy burgundy-mid reveal col-span-full flex flex-col gap-2.5 self-stretch rounded-[14px] px-5 py-[22px] lg:col-span-2 lg:justify-between lg:p-7">
      <h3 className="font-display text-2xl leading-[1.15] lg:text-[34px] lg:leading-[1.1]">
        {numberWord(count)} fragrances, all poured from my own bottles.
      </h3>
      <p className="text-sm text-wine-soft lg:text-base">Decants in {sizeList} ml.</p>
      <Link
        to="/decants"
        className="mt-1.5 flex h-11 items-center self-start rounded-full border-2 border-gold bg-white px-5 font-medium text-ink transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.97] lg:h-auto lg:px-[22px] lg:py-3"
      >
        See all decants
      </Link>
    </div>
  )
}

export function ShelfSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-4 h-10 lg:mb-6" />
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
        {Array.from({ length: SHOWN }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
