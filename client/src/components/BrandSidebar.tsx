import { useSearchParams } from 'react-router-dom'
import type { Fragrance } from '@shared/types.ts'
import { brandsOf } from '../lib/catalog.ts'

/**
 * Filters by house via ?brand=. A vertical list on desktop, a swipeable chip row on mobile.
 */
export default function BrandSidebar({ list }: { list: Fragrance[] }) {
  const [params, setParams] = useSearchParams()
  const active = params.get('brand')
  const brands = brandsOf(list)

  const select = (slug: string | null) => {
    const next = new URLSearchParams(params)
    if (slug) next.set('brand', slug)
    else next.delete('brand')
    setParams(next, { preventScrollReset: true })
  }

  const all = [{ slug: null, name: 'All brands', count: list.length }, ...brands]

  return (
    <nav aria-label="Brands" className="lg:sticky lg:top-6">
      <h2 className="hidden text-xs font-medium tracking-wide text-muted uppercase lg:block">Brands</h2>

      {/* Mobile / tablet: chips */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:hidden">
        {all.map((b) => {
          const isActive = b.slug === active
          return (
            <button
              key={b.slug ?? 'all'}
              type="button"
              onClick={() => select(b.slug)}
              aria-pressed={isActive}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors ${
                isActive ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-muted hover:text-text'
              }`}
            >
              {b.name}
            </button>
          )
        })}
      </div>

      {/* Desktop: list */}
      <ul className="mt-3 hidden space-y-0.5 lg:block">
        {all.map((b) => {
          const isActive = b.slug === active
          return (
            <li key={b.slug ?? 'all'}>
              <button
                type="button"
                onClick={() => select(b.slug)}
                aria-pressed={isActive}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                  isActive ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-surface hover:text-text'
                }`}
              >
                <span>{b.name}</span>
                <span className="text-xs tabular-nums">{b.count}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
