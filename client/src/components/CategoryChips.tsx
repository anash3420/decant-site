import { Link } from 'react-router-dom'
import type { FragranceCategory } from '@shared/types.ts'
import { CATEGORIES } from '../lib/catalog.ts'

/**
 * All · Niche · Designer · Private lines · Dupes. Swipeable on phones.
 * `hrefFor` decides where each chip goes: its own page (/niche) or a ?category= filter.
 */
export default function CategoryChips({
  active,
  hrefFor,
  counts,
}: {
  active: FragranceCategory | null
  hrefFor: (category: FragranceCategory | null) => string
  counts?: Partial<Record<FragranceCategory, number>>
}) {
  const chips = [
    { id: null, label: 'All' },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.id === 'designer-private' ? 'Private lines' : c.title })),
  ]
  return (
    <nav
      aria-label="Fragrance categories"
      className="-mx-5 no-scrollbar flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {chips.map((c) => {
        const isActive = c.id === active
        const count = c.id ? counts?.[c.id] : undefined
        if (c.id && count === 0) return null
        return (
          <Link
            key={c.id ?? 'all'}
            to={hrefFor(c.id)}
            aria-current={isActive ? 'page' : undefined}
            preventScrollReset
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors ${
              isActive ? 'border-text bg-text text-surface' : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            {c.label}
            {count !== undefined && <span className="text-xs tabular-nums opacity-70">{count}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
