import { useSearchParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext.tsx'
import { KINDS, byBrand, sortForDisplay } from '../lib/catalog.ts'
import BrandSidebar from '../components/BrandSidebar.tsx'
import CategoryRow from '../components/CategoryRow.tsx'
import { CardSkeletons, CatalogError } from '../components/CatalogState.tsx'

export default function Home() {
  const { listings, settings, status } = useShop()
  const [params] = useSearchParams()
  const brand = params.get('brand')
  const filtered = byBrand(listings, brand)
  const brandName = filtered[0]?.house
  const query = brand ? `?brand=${brand}` : ''

  const rows = KINDS.map((k) => ({ ...k, items: sortForDisplay(filtered.filter((f) => f.kind === k.id)) })).filter(
    (r) => r.items.length > 0,
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block lg:pt-2">
        <BrandSidebar list={listings} />
      </aside>

      <div className="min-w-0">
        <h1 className="text-4xl sm:text-5xl">{brandName && brand ? brandName : 'Fragrances'}</h1>
        <p className="mt-3 max-w-prose text-muted">
          {settings?.siteTagline ? `${settings.siteTagline}. ` : ''}Add what you like to your inquiry and I'll reach out on
          Facebook to sort out payment and pickup.
        </p>

        <div className="mt-6 lg:hidden">
          <BrandSidebar list={listings} />
        </div>

        <div className="mt-10 space-y-14">
          {status === 'loading' ? (
            KINDS.map((k) => (
              <section key={k.id} aria-busy="true">
                <h2 className="text-3xl">{k.title}</h2>
                <p className="mt-1 mb-5 text-sm text-muted">{k.blurb}</p>
                <CardSkeletons row />
              </section>
            ))
          ) : status === 'error' ? (
            <CatalogError />
          ) : rows.length === 0 ? (
            <p className="text-muted">{brand ? 'Nothing from this brand right now.' : 'New listings are on the way. Check back soon.'}</p>
          ) : (
            rows.map((r) => (
              <CategoryRow key={r.id} title={r.title} blurb={r.blurb} items={r.items} viewAllHref={`${r.path}${query}`} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
