import { use } from 'react'
import { Link } from 'react-router-dom'
import { getBrands, getCatalog, getHome } from '../../api/shop.ts'
import { housePath, plural } from '../../lib/catalog.ts'
import { ChevronRight } from '../icons.tsx'

/** Phones show the first five featured houses, desktop all seven; the last tile opens every house */
const PHONE_COUNT = 5

const tileClass = 'flex h-28 flex-col items-center justify-center rounded-[14px] lg:h-[180px]'

/**
 * Desktop hover, mouse only: the tile grows to 105% on the same slow curve as the product photos. It scales in
 * place and rises above its neighbours, so no other tile moves.
 */
const growClass = 'transition-[scale,box-shadow] duration-[1100ms] ease-lux hover:z-10 motion-safe:fine:hover:scale-105'

/** "02 Discover houses": featured house logos with how many decants each has */
export function Houses() {
  const brands = use(getBrands())
  const catalog = use(getCatalog())
  const { featuredHouses } = use(getHome())

  const featured = featuredHouses.flatMap((slug) => brands.find((b) => b.slug === slug) ?? [])
  const others = brands.filter((b) => !featuredHouses.includes(b.slug)).map((b) => b.name)
  const decantsOf = (slug: string) => catalog.filter((l) => l.brandSlug === slug).length

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
      {featured.map((brand, i) => (
        <Link
          key={brand.slug}
          to={housePath(brand.slug)}
          className={`reveal relative bg-white hover:shadow-[0_10px_26px_rgb(109_31_51/0.12)] ${growClass} ${tileClass} ${i >= PHONE_COUNT ? 'hidden lg:flex' : ''}`}
        >
          <img
            src={brand.logo.src}
            alt={brand.name}
            width={brand.logo.width}
            height={brand.logo.height}
            loading="lazy"
            decoding="async"
            className="max-h-[50px] max-w-[130px] object-contain lg:max-h-[78px] lg:max-w-[210px]"
          />
          <small className="absolute bottom-[9px] text-xs text-muted lg:bottom-3.5 lg:text-[13px]">
            {plural(decantsOf(brand.slug), 'available option')}
          </small>
        </Link>
      ))}
      <Link
        to="/houses"
        className={`burgundy burgundy-mid reveal items-start! justify-between! p-4 lg:p-6 ${growClass} ${tileClass}`}
      >
        <b className="font-display text-[22px] leading-[1.1] font-normal lg:text-3xl">All {brands.length} houses</b>
        {others.length > 0 && <span className="hidden text-sm text-wine-soft lg:block">Plus {listAnd(others)}</span>}
        <em className="flex items-center gap-2 text-sm text-gold not-italic lg:text-[15px]">
          Browse <ChevronRight size={16} />
        </em>
      </Link>
    </div>
  )
}

const listAnd = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '')

export function HousesSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`bg-white/70 ${tileClass} ${i >= 6 ? 'hidden lg:flex' : ''}`} />
      ))}
    </div>
  )
}
