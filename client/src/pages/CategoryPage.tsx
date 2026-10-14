import { Link, useSearchParams } from 'react-router-dom'
import type { ListingKind } from '@shared/types.ts'
import { useShop } from '../context/ShopContext.tsx'
import { CardSkeletons, CatalogError } from '../components/CatalogState.tsx'
import { byBrand, kindMeta, sortForDisplay } from '../lib/catalog.ts'
import BrandSidebar from '../components/BrandSidebar.tsx'
import FragranceCard from '../components/FragranceCard.tsx'

export default function CategoryPage({ kind }: { kind: ListingKind }) {
  const meta = kindMeta(kind)
  const [params] = useSearchParams()
  const { listings, status } = useShop()
  const inCategory = listings.filter((f) => f.kind === kind)
  const items = sortForDisplay(byBrand(inCategory, params.get('brand')))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block lg:pt-2">
        <BrandSidebar list={inCategory} />
      </aside>

      <div className="min-w-0">
        <Link to="/" className="-my-3 inline-block py-3 text-sm text-muted hover:text-text">
          ← All categories
        </Link>
        <h1 className="mt-3 text-4xl sm:text-5xl">{meta.title}</h1>
        <p className="mt-3 max-w-prose text-muted">{meta.blurb}</p>

        <div className="mt-6 lg:hidden">
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
          <p className="mt-10 text-muted">Nothing here from this brand right now.</p>
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
