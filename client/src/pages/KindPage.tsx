import { Link, useSearchParams } from 'react-router-dom'
import { FRAGRANCE_CATEGORIES, type FragranceCategory, type ListingKind } from '@shared/types.ts'
import { useShop } from '../context/ShopContext.tsx'
import { CardSkeletons, CatalogError } from '../components/CatalogState.tsx'
import { byBrand, byCategory, kindMeta, sortForDisplay } from '../lib/catalog.ts'
import BrandSidebar from '../components/BrandSidebar.tsx'
import CategoryChips from '../components/CategoryChips.tsx'
import FragranceCard from '../components/FragranceCard.tsx'

const asCategory = (v: string | null) =>
  FRAGRANCE_CATEGORIES.includes(v as FragranceCategory) ? (v as FragranceCategory) : null

/** One listing type (/decants, /catch-release, /full-bottles), filterable by ?category= and ?brand= */
export default function KindPage({ kind }: { kind: ListingKind }) {
  const meta = kindMeta(kind)
  const [params] = useSearchParams()
  const { listings, status } = useShop()
  const category = asCategory(params.get('category'))
  const ofKind = listings.filter((f) => f.kind === kind)
  const inCategory = byCategory(ofKind, category)
  const items = sortForDisplay(byBrand(inCategory, params.get('brand')))

  const hrefFor = (c: FragranceCategory | null) => {
    const next = new URLSearchParams(params)
    if (c) next.set('category', c)
    else next.delete('category')
    // A brand chosen under another category may have nothing here
    next.delete('brand')
    const q = next.toString()
    return q ? `?${q}` : meta.path
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block lg:pt-2">
        <BrandSidebar list={inCategory} />
      </aside>

      <div className="min-w-0">
        <Link to="/" className="-my-3 inline-block py-3 text-sm text-muted hover:text-text">
          ← All fragrances
        </Link>
        <h1 className="mt-3 text-4xl sm:text-5xl">{meta.title}</h1>
        <p className="mt-3 max-w-prose text-muted">{meta.blurb}</p>

        <div className="mt-6">
          <CategoryChips
            active={category}
            hrefFor={hrefFor}
            counts={status === 'ready' ? countByCategory(ofKind) : undefined}
          />
        </div>

        <div className="mt-4 lg:hidden">
          <BrandSidebar list={inCategory} />
        </div>

        {status === 'loading' ? (
          <div className="mt-10" aria-busy="true">
            <CardSkeletons count={6} />
          </div>
        ) : status === 'error' ? (
          <div className="mt-10">
            <CatalogError />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-10 text-muted">Nothing here with these filters right now.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((f) => (
              <FragranceCard key={f.slug} fragrance={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const countByCategory = (list: { category: FragranceCategory }[]) =>
  Object.fromEntries(FRAGRANCE_CATEGORIES.map((c) => [c, list.filter((f) => f.category === c).length]))
