import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DecantListing } from '@shared/types.ts'
import { formatPrice } from '@shared/stock.ts'
import { fromPrice, isNew, productPath } from '../lib/catalog.ts'
import { useWishlisted } from '../lib/wishlist.ts'
import { Photo } from './Photo.tsx'
import { ArrowRight, BagIcon, HeartIcon } from './icons.tsx'

interface ProductCardProps {
  listing: DecantListing
  /** Load the photo right away (cards in the first screenful) */
  priority?: boolean
}

/**
 * The product card used everywhere decants are listed. No card box: the photo fills a 4:5 frame and the details
 * sit on the page. The whole card links to the fragrance page; the heart sits above that link.
 */
export const ProductCard = memo(function ProductCard({ listing, priority }: ProductCardProps) {
  const { price, sizeMl } = fromPrice(listing)
  const photo = listing.photos?.[0]
  const second = listing.photos?.[1]
  const href = productPath(listing.slug)
  return (
    <article className="group relative flex min-w-0 flex-col">
      <div className="relative">
        <Photo
          src={photo?.src ?? ''}
          alt={`${listing.house} ${listing.name}`}
          width={photo?.width}
          height={photo?.height}
          priority={priority}
          className="isolate aspect-[4/5] rounded-xl lg:rounded-[14px]"
          imgClassName="motion-safe:fine:group-hover:scale-110"
        />
        {/* Desktop hover, mouse only: a second view of the decant fades in over the first (when there is one) */}
        {second?.src && (
          <Photo
            src={second.src}
            alt=""
            width={second.width}
            height={second.height}
            imgClassName="motion-safe:fine:group-hover:scale-110"
            className="absolute! inset-0 isolate aspect-[4/5] rounded-[14px] opacity-0 transition-opacity duration-[250ms] ease-out fine:group-hover:opacity-100"
          />
        )}
        {/* Desktop hover, mouse only: the photo zooms slowly to 110% and soft light falls on the bottle */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[14px] bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgb(255_255_255/0.12),transparent_70%)] opacity-0 transition-opacity duration-200 ease-out motion-reduce:hidden fine:group-hover:opacity-100 fine:group-hover:duration-300"
        />
        {isNew(listing) && (
          <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-wine px-2 py-0.5 text-[11px] text-white lg:top-3 lg:left-3 lg:px-2.5 lg:text-xs">
            New
          </span>
        )}
        <WishButton slug={listing.slug} name={listing.name} />
        <QuickBuyButton href={href} name={listing.name} />
      </div>

      <p className="mt-2.5 text-xs leading-snug text-muted lg:mt-3.5 lg:text-[13px]">{listing.house}</p>
      <h3 className="mt-px line-clamp-2 font-display text-[17px] leading-tight lg:mt-0.5 lg:mb-2 lg:text-[22px] lg:leading-[1.15]">
        {/* Stretched link: makes the whole card tappable while keeping one link in the tab order */}
        <Link to={href} className="after:absolute after:inset-0 after:content-['']">
          {listing.name}
        </Link>
      </h3>

      <div className="mt-1 flex items-center justify-between gap-1.5 lg:mt-0">
        <p className="flex flex-col text-sm leading-[1.3] font-medium lg:text-base">
          From {formatPrice(price)}
          <small className="text-xs font-normal text-muted">for {sizeMl} ml</small>
        </p>
        <span
          aria-hidden="true"
          className="flex size-10 flex-none items-center justify-center rounded-full border border-rose-line text-wine lg:hidden"
        >
          <ArrowRight size={18} />
        </span>
        <span className="hidden items-center gap-1.5 border-b border-wine/40 pb-px font-display text-[17px] text-wine italic lg:inline-flex">
          Make it yours{' '}
          <ArrowRight size={16} className="transition-transform duration-200 ease-out group-hover:translate-x-[3px]" />
        </span>
      </div>
    </article>
  )
})

/**
 * Desktop only (mouse and trackpad): a round burgundy bag on the photo's corner appears on hover, or when the card
 * has keyboard focus. It will open the quick-buy drawer; until that is built it opens the fragrance page.
 */
function QuickBuyButton({ href, name }: { href: string; name: string }) {
  return (
    <Link
      to={href}
      aria-label={`Quick buy ${name}`}
      className="group/qb absolute right-3 bottom-3 z-10 hidden size-11 scale-90 items-center justify-center rounded-full bg-wine text-white opacity-0 shadow-[0_6px_16px_rgb(109_31_51/0.3)] transition-[opacity,transform] duration-200 ease-out group-focus-within:scale-100 group-focus-within:opacity-100 motion-reduce:scale-100 fine:flex fine:group-hover:scale-100 fine:group-hover:opacity-100"
    >
      <BagIcon size={20} />
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full mr-2 rounded-full bg-ink px-2.5 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover/qb:opacity-100"
      >
        Quick buy
      </span>
    </Link>
  )
}

/** Its own component so hearting re-renders only the button, not the card */
function WishButton({ slug, name }: { slug: string; name: string }) {
  const [saved, toggle] = useWishlisted(slug)
  // Pop only when the visitor saves it here, not when the page loads with it already saved
  const [popped, setPopped] = useState(0)
  return (
    <button
      type="button"
      onClick={() => {
        if (!saved) setPopped((n) => n + 1)
        toggle()
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`}
      className="absolute top-1.5 right-1.5 z-10 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink transition-transform duration-150 ease-out active:scale-[0.9] lg:top-2.5 lg:right-2.5"
    >
      <HeartIcon
        key={popped}
        size={20}
        fill={saved ? 'currentColor' : 'none'}
        className={`${saved ? 'text-wine' : ''} ${saved && popped ? 'animate-heart-pop' : ''}`}
      />
    </button>
  )
}

/** Same footprint as a card, shown while the catalog loads so nothing shifts */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <span className="photo aspect-[4/5] rounded-xl lg:rounded-[14px]" />
      <span className="mt-3 block h-3 w-1/3 rounded bg-sand lg:mt-4" />
      <span className="mt-2 block h-5 w-3/4 rounded bg-sand lg:h-6" />
      <span className="mt-2 block h-9 w-1/2 rounded bg-sand" />
    </div>
  )
}
