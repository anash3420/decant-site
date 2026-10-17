import { useSearchParams } from 'react-router-dom'
import type { FragranceCategory } from '@shared/types.ts'
import { useShop } from '../context/ShopContext.tsx'
import { CATEGORIES, KINDS, byBrand, byCategory, categoryMeta, sortForDisplay } from '../lib/catalog.ts'
import BrandBanner from '../components/BrandBanner.tsx'
import BrandSidebar from '../components/BrandSidebar.tsx'
import CategoryChips from '../components/CategoryChips.tsx'
import CategoryRow from '../components/CategoryRow.tsx'
import { CardSkeletons, CatalogError } from '../components/CatalogState.tsx'

/** The homepage, and with `category` set, that category's page (/niche, /designer, …) */
export default function Home({ category }: { category?: FragranceCategory }) {
  const { listings, settings, status } = useShop()
  const [params] = useSearchParams()
  const brand = params.get('brand')
  const meta = category ? categoryMeta(category) : null

  const inCategory = byCategory(listings, category)
  const filtered = byBrand(inCategory, brand)
  const brandName = filtered[0]?.house
  // "View all" keeps both filters, e.g. /decants?category=niche&brand=creed
  const keep = new URLSearchParams({ ...(category && { category }), ...(brand && { brand }) }).toString()
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, byCategory(listings, c.id).length]))

  const rows = KINDS.map((k) => ({ ...k, items: sortForDisplay(filtered.filter((f) => f.kind === k.id)) })).filter(
    (r) => r.items.length > 0,
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block lg:pt-2">
        <BrandSidebar list={inCategory} />
      </aside>

      <div className="min-w-0">
        {brand || meta ? (
          <h1 className="text-4xl sm:text-5xl">{brandName && brand ? brandName : (meta?.title ?? 'Fragrances')}</h1>
        ) : (
          // The front page: the seal beside the shop's name
          <h1 className="flex items-center gap-3 text-4xl sm:gap-4 sm:text-5xl">
            <img src="/logo-mark.svg" alt="" width="64" height="64" className="size-12 shrink-0 sm:size-16" />
            Anash Decants
          </h1>
        )}
        {brand ? (
          // Browsing one brand: its logo and story instead of the shop's tagline
          <BrandBanner slug={brand} className="mt-6" />
        ) : (
          <p className="mt-3 max-w-prose text-muted">
            {meta
              ? meta.blurb
              : `${settings?.siteTagline ? `${settings.siteTagline}. ` : ''}Add what you like to your inquiry and I'll reach out on Facebook to sort out payment and pickup.`}
          </p>
        )}

        <div className="mt-6">
          <CategoryChips
            active={category ?? null}
            hrefFor={(c) => (c ? categoryMeta(c).path : '/')}
            counts={status === 'ready' ? counts : undefined}
          />
        </div>

        <div className="mt-4 lg:hidden">
          <BrandSidebar list={inCategory} />
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
            <p className="text-muted">
              {brand
                ? 'Nothing from this brand right now.'
                : meta
                  ? `No ${meta.title.toLowerCase()} listed right now. Check back soon.`
                  : 'New listings are on the way. Check back soon.'}
            </p>
          ) : (
            rows.map((r) => (
              <CategoryRow
                key={r.id}
                title={r.title}
                blurb={r.blurb}
                items={r.items}
                viewAllHref={keep ? `${r.path}?${keep}` : r.path}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
