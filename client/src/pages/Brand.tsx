import { Suspense, use, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBrands, getCatalog } from '../api/shop.ts'
import { HouseTile } from '../components/HouseTile.tsx'
import { housesOf } from '../lib/houses.ts'
import { ArrowRight } from '../components/icons.tsx'
import { firstSentence, plural } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { TYPE_LABELS } from '../lib/filters.ts'
import { Listings } from './Decants.tsx'

const copy = site.brand

/** A house's page, at /houses/:slug */
export default function Brand() {
  const { slug = '' } = useParams()
  return (
    <Suspense fallback={<div className="h-[300px] bg-[#3b2418] lg:h-[480px]" />}>
      <House key={slug} slug={slug} />
    </Suspense>
  )
}

/**
 * A full-width photo banner with the house's name and one line about it, then Filter & Sort (without a House
 * filter) and its decants, a "Want another…" note, and other houses.
 */
function House({ slug }: { slug: string }) {
  const brands = use(getBrands())
  const catalog = use(getCatalog())
  const houses = housesOf(brands, catalog)
  const at = houses.findIndex((h) => h.brand.slug === slug)
  const house = houses[at]

  useEffect(() => {
    if (!house) return
    document.title = `${house.brand.name} decants | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [house])

  if (!house) return <NotFound />

  const { brand, listings, type } = house
  const line = firstSentence(brand.description)
  // The owner's banner when there is one; until then, the house's first decant photo
  const photo = brand.banner?.src ?? listings.find((l) => l.photos?.[0]?.src)?.photos?.[0]?.src
  // The houses after this one, A to Z, coming round to the start
  const others = [...houses.slice(at + 1), ...houses.slice(0, at)].slice(0, 4)

  return (
    <>
      <section className="relative h-[300px] overflow-hidden bg-[#3b2418] lg:h-[480px]">
        {photo && (
          <>
            <span
              aria-hidden="true"
              style={{ backgroundImage: `url(${photo})` }}
              className="absolute -inset-[60px] scale-110 bg-cover bg-center blur-[40px] brightness-[0.8] saturate-[1.2]"
            />
            <span
              aria-hidden="true"
              style={{ backgroundImage: `url(${photo})` }}
              className="absolute inset-0 bg-cover bg-[center_60%] lg:left-auto lg:w-[62%] lg:[mask-image:linear-gradient(90deg,transparent_0,#000_34%)]"
            />
          </>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(0deg,rgb(20_10_6/0.7)_0%,rgb(20_10_6/0.2)_60%,transparent)] lg:bg-[linear-gradient(90deg,rgb(20_10_6/0.62)_0%,rgb(20_10_6/0.35)_40%,transparent_70%)]"
        />
        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col px-4 lg:px-12 lg:pt-7">
          <nav aria-label="Breadcrumb" className="hidden text-[13px] text-[#efdcd3] lg:block">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-[#b99586]">
              /
            </span>
            <Link to="/houses" className="hover:text-white">
              Houses
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-[#b99586]">
              /
            </span>
            <span aria-current="page">{brand.name}</span>
          </nav>
          <div className="mt-auto mb-[22px] max-w-[640px] lg:mb-16">
            <p className="flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-[#e7cdd3] uppercase">
              {copy.kicker}
              <i aria-hidden="true" className="block h-px w-11 bg-[#e7cdd3]" />
              {TYPE_LABELS[type]}
              <span className="hidden lg:inline">· {plural(listings.length, 'decant')}</span>
            </p>
            <h1 className="mt-2 font-display text-[46px] leading-[0.95] tracking-[-0.02em] text-white [text-shadow:0_2px_30px_rgb(0_0_0/0.25)] lg:mt-3.5 lg:mb-4 lg:text-[92px]">
              {brand.name}
            </h1>
            {line && (
              <p className="hidden max-w-[560px] font-display text-[21px] leading-[1.4] text-[#f6e9e2] italic lg:block">
                {line}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-[18px] pb-16 lg:px-12 lg:pt-7 lg:pb-24">
        {line && <p className="mb-4 font-display text-lg leading-[1.4] text-[#3a2d30] italic lg:hidden">{line}</p>}
        <Listings catalog={listings} house tile={<NoteTile house={brand.name} />} />

        {others.length > 0 && (
          <section aria-labelledby="other-houses" className="mt-14 lg:mt-20">
            <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-4 lg:mb-[18px]">
              <h2
                id="other-houses"
                className="flex items-center gap-2.5 text-[13px] tracking-[0.14em] whitespace-nowrap text-wine uppercase"
              >
                {copy.others.more}
                <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
                {copy.others.kicker}
              </h2>
              <Link
                to={copy.others.to}
                className="flex min-h-11 items-center gap-1.5 text-[15px] whitespace-nowrap text-wine lg:min-h-0"
              >
                <span className="link-line pb-0.5">{copy.others.link.replace('{count}', String(houses.length))}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-[18px]">
              {others.map((h) => (
                <HouseTile key={h.brand.slug} house={h} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

/** "Want another <house>?": the tile after the house's decants */
function NoteTile({ house }: { house: string }) {
  const n = copy.note
  return (
    <div className="col-span-2 flex flex-col self-stretch rounded-[14px] border border-wine/12 bg-white/60 p-5 lg:p-7">
      <p className="flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
        {n.kicker}
        <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
      </p>
      <h3 className="mt-3 max-w-[16ch] font-display text-[26px] leading-[1.1] lg:mt-5 lg:text-[34px]">
        {n.title.replace('{house}', house)}
      </h3>
      <p className="mt-2 text-[15px] text-muted lg:mt-3 lg:text-base">{n.text}</p>
      <a
        href={`mailto:${site.email}?subject=${encodeURIComponent(`Another ${house}`)}`}
        className="mt-4 flex min-h-11 items-center gap-1.5 self-start text-[15px] text-wine lg:mt-auto"
      >
        <span className="link-line pb-0.5">{n.link}</span>
        <ArrowRight size={14} />
      </a>
    </div>
  )
}

function NotFound() {
  const e = copy.notFound
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-24 text-center">
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
