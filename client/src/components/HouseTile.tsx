import { Link } from 'react-router-dom'
import { formatPrice } from '@shared/stock.ts'
import { housePath, plural } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { TYPE_LABELS } from '../lib/filters.ts'
import type { House } from '../lib/houses.ts'
import { ArrowRight } from './icons.tsx'

const copy = site.houses

/**
 * A white tile: the logo large, then the name, type and decants, small bottles, "from $X" and Shop. `compact` (and
 * every phone) shows just the name and "1 decant · from $X", as in a house page's "Other houses" row.
 */
export function HouseTile({ house, compact }: { house: House; compact?: boolean }) {
  const { brand, listings, type } = house
  const decants = plural(listings.length, 'decant')
  const from = `from ${formatPrice(house.from)}`
  return (
    <Link
      to={housePath(brand.slug)}
      className="flex flex-col overflow-hidden rounded-2xl bg-white transition-[translate,box-shadow] duration-300 ease-out fine:hover:-translate-y-1 fine:hover:shadow-[0_18px_40px_rgb(109_31_51/0.16)]"
    >
      <span className="flex h-[90px] items-center justify-center border-b border-[#efe8e1] px-3 lg:h-[150px]">
        <img
          src={brand.logo.src}
          alt={brand.name}
          width={brand.logo.width}
          height={brand.logo.height}
          loading="lazy"
          className="h-auto max-h-[52px] w-auto max-w-[120px] object-contain mix-blend-multiply lg:max-h-[88px] lg:max-w-[200px]"
        />
      </span>
      <span
        className={`flex items-center justify-between gap-3 px-3 pt-2.5 pb-3 lg:px-[18px] lg:pt-3.5 ${compact ? 'lg:pb-4' : 'lg:pb-1.5'}`}
      >
        <span className="min-w-0">
          <b className="block font-display text-[17px] leading-tight font-normal lg:text-[22px]">{brand.name}</b>
          <small className="mt-0.5 block text-xs tracking-[0.02em] text-muted">
            <span className={compact ? '' : 'lg:hidden'}>
              {decants} · {from}
            </span>
            <span className={compact ? 'hidden' : 'hidden lg:inline'}>
              {TYPE_LABELS[type]} · {decants}
            </span>
          </small>
        </span>
        <span aria-hidden="true" className={`hidden flex-none pl-2.5 ${compact ? '' : 'lg:flex'}`}>
          {listings.slice(0, 3).map((l) => (
            <span
              key={l.slug}
              className="-ml-2.5 size-11 overflow-hidden rounded-full border-2 border-white bg-[#f8f5f0]"
            >
              {l.photos?.[0]?.src && (
                <img src={l.photos[0].src} alt="" loading="lazy" className="size-full object-cover" />
              )}
            </span>
          ))}
        </span>
      </span>
      <span
        className={`hidden items-center justify-between px-[18px] pt-1.5 pb-4 text-[15px] font-medium ${compact ? '' : 'lg:flex'}`}
      >
        {from}
        <span className="flex items-center gap-1.5 text-wine">
          <span className="link-line pb-0.5">{copy.shop}</span>
          <ArrowRight size={14} />
        </span>
      </span>
    </Link>
  )
}
