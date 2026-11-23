import { Suspense, use, useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ShopListing } from '@shared/types.ts'
import { getBrands, getCatalog } from '../api/shop.ts'
import { ProductCard } from '../components/ProductCard.tsx'
import { SectionHeading } from '../components/SectionHeading.tsx'
import { ArrowRight } from '../components/icons.tsx'
import { BuyCard } from '../components/product/BuyCard.tsx'
import { Gallery } from '../components/product/Gallery.tsx'
import { firstSentence, housePath, similar } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { clearViewed, markViewed, useRecentlyViewed } from '../lib/recent.ts'

const copy = site.product

/** The fragrance page, at /fragrance/:slug */
export default function Product() {
  const { slug = '' } = useParams()
  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-3.5 pb-10 lg:px-12 lg:pt-[22px]">
      <Suspense fallback={<Skeleton />}>
        {/* Keyed so the size and quantity start fresh when a "You may also like" card opens another decant */}
        <Fragrance key={slug} slug={slug} />
      </Suspense>
    </div>
  )
}

function Fragrance({ slug }: { slug: string }) {
  const catalog = use(getCatalog())
  const brands = use(getBrands())
  const listing = catalog.find((l) => l.slug === slug)
  const recent = useRecentlyViewed()

  useEffect(() => {
    if (!listing) return
    markViewed(listing.slug)
    document.title = `${listing.house} ${listing.name} decant | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [listing])

  if (!listing) return <NotFound />

  const brand = brands.find((b) => b.slug === listing.brandSlug)
  const picks = similar(catalog, listing.accords, new Set([listing.slug]), 4)
  const viewed = recent
    .filter((s) => s !== listing.slug)
    .flatMap((s) => catalog.find((l) => l.slug === s) ?? [])
    .slice(0, 4)

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-[22px] hidden text-[13px] text-muted lg:block">
        <Link to="/" className="hover:text-wine">
          Home
        </Link>
        <span aria-hidden="true" className="mx-1.5 text-[#c9b9b0]">
          /
        </span>
        <Link to="/decants" className="hover:text-wine">
          All decants
        </Link>
        <span aria-hidden="true" className="mx-1.5 text-[#c9b9b0]">
          /
        </span>
        <span aria-current="page">{listing.name}</span>
      </nav>

      <div className="flex flex-col gap-[18px] lg:grid lg:grid-cols-[1fr_470px] lg:items-start lg:gap-16">
        <Gallery photos={listing.photos ?? []} house={listing.house} name={listing.name} />
        <BuyCard listing={listing} brand={brand} />
      </div>

      <Notes listing={listing} />

      <section className="mt-9 grid gap-5 lg:mt-14 lg:grid-cols-[420px_1fr] lg:items-center lg:gap-12">
        <p className="max-w-[520px] text-base leading-[1.7] text-[#3a2d30] lg:text-[17px]">{listing.description}</p>
        {brand && (
          <div className="grid gap-3 rounded-2xl bg-white p-5 lg:grid-cols-[260px_1fr] lg:items-center lg:gap-8 lg:px-8 lg:py-7">
            <span className="flex items-center justify-center border-b border-[#eee5dc] pb-3.5 lg:h-24 lg:border-r lg:border-b-0 lg:pr-7 lg:pb-0">
              <img
                src={brand.logo.src}
                alt={brand.name}
                className="max-h-14 max-w-[200px] object-contain mix-blend-multiply lg:max-h-20"
              />
            </span>
            <div>
              <p className="font-display text-lg leading-[1.45] text-[#3a2d30] lg:text-[21px]">
                {firstSentence(brand.description)}
              </p>
              <Link
                to={housePath(brand.slug)}
                className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 font-display text-lg text-wine italic"
              >
                <span className="link-line pb-0.5">{copy.house.link}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {picks.length > 0 && (
        <Row>
          <SectionHeading
            index="02"
            kicker={copy.alsoLike.kicker}
            title={accordTitle(listing)}
            note={copy.alsoLike.note}
            link={copy.alsoLike.link}
          />
          <Cards listings={picks} />
        </Row>
      )}

      {viewed.length > 0 && (
        <Row>
          <SectionHeading
            index="03"
            kicker={copy.recent.kicker}
            title={copy.recent.title}
            note={copy.recent.note}
            action={
              <button
                type="button"
                onClick={clearViewed}
                className="mt-1 flex min-h-11 items-center text-[15px] text-wine lg:order-3 lg:mt-0 lg:min-h-0"
              >
                <span className="link-line pb-0.5">{copy.recent.clear}</span>
              </button>
            }
          />
          <Cards listings={viewed} />
        </Row>
      )}
    </>
  )
}

/** 01 The notes: a burgundy trail with Top, Heart and Base, across on desktop and down on phones */
function Notes({ listing }: { listing: ShopListing }) {
  const steps = copy.notes.steps
    .map((s) => ({ ...s, notes: listing.notes[s.key as keyof ShopListing['notes']] ?? [] }))
    .filter((s) => s.notes.length > 0)
  if (steps.length === 0) return null
  return (
    <Row>
      <SectionHeading index="01" kicker={copy.notes.kicker} title={copy.notes.title} note={copy.notes.note} />
      <ol className="relative grid gap-7 pl-7 lg:grid-cols-3 lg:gap-10 lg:pt-[30px] lg:pl-0">
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-3 left-1.5 w-px bg-[linear-gradient(180deg,#6d1f33,rgb(109_31_51/0.15))] lg:inset-x-0 lg:top-9 lg:bottom-auto lg:h-px lg:w-auto lg:bg-[linear-gradient(90deg,#6d1f33,rgb(109_31_51/0.15))]"
        />
        {steps.map((s, i) => (
          <li key={s.key} className="relative lg:pt-[34px]">
            <span
              aria-hidden="true"
              className="outline-num -top-[34px] right-2 hidden text-[120px] [-webkit-text-stroke:1px_rgb(109_31_51/0.2)] lg:block"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              aria-hidden="true"
              className="absolute top-1 -left-7 size-[13px] rounded-full bg-wine shadow-[0_0_0_6px_rgb(109_31_51/0.12)] lg:top-0 lg:left-0"
            />
            <span className="block text-xs font-medium tracking-[0.18em] text-wine uppercase">{s.name}</span>
            <small className="mt-0.5 mb-2 block font-display text-[15px] text-muted italic">{s.line}</small>
            <b className="block font-display text-xl leading-[1.35] font-normal lg:text-[26px]">{s.notes.join(', ')}</b>
          </li>
        ))}
      </ol>
    </Row>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <section className="relative isolate pt-14 lg:pt-[88px]">{children}</section>
}

/** Standard cards: a swipe row on phones, four across on desktop */
function Cards({ listings }: { listings: ShopListing[] }) {
  return (
    <div className="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-[18px] lg:overflow-visible lg:px-0">
      {listings.map((l) => (
        <div key={l.slug} className="w-[150px] flex-none snap-start lg:w-auto">
          <ProductCard listing={l} />
        </div>
      ))}
    </div>
  )
}

/** "Woody, incensy and smoky": the first three accords, for "You may also like" */
function accordTitle(listing: ShopListing) {
  const words = listing.accords.slice(0, 3).map((a, i) => (i === 0 ? a : a.toLowerCase()))
  if (words.length < 2) return copy.alsoLike.kicker
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

function NotFound() {
  const e = copy.notFound
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="font-display text-4xl">{e.title}</h1>
      <p className="max-w-[36ch] text-muted">{e.text}</p>
      <Link
        to={e.to}
        className="mt-2 flex h-12 items-center gap-2 rounded-full bg-wine px-6 text-[15px] font-medium text-white"
      >
        {e.button} <ArrowRight size={16} />
      </Link>
    </div>
  )
}

/** Same footprint as the top of the page while the catalogue loads */
function Skeleton() {
  return (
    <div className="flex flex-col gap-[18px] lg:mt-[42px] lg:grid lg:grid-cols-[1fr_470px] lg:items-start lg:gap-16">
      <span className="photo block h-[300px] rounded-2xl lg:h-[780px] lg:rounded-[18px]" />
      <span className="block h-[560px] rounded-2xl bg-white lg:h-[640px] lg:rounded-[18px]" />
    </div>
  )
}
