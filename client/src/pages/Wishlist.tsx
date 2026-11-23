import { Suspense, use, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCatalog } from '../api/shop.ts'
import { PageHead } from '../components/PageHead.tsx'
import { ProductCard } from '../components/ProductCard.tsx'
import { ArrowRight, HeartIcon } from '../components/icons.tsx'
import { site } from '../lib/content.ts'
import { useWishlist } from '../lib/wishlist.ts'

const copy = site.wishlist

/**
 * The wishlist: every decant hearted in this browser, newest first, as standard cards. Unhearting a card takes it
 * off the list. Kept in the browser only until accounts exist.
 */
export default function Wishlist() {
  useEffect(() => {
    document.title = `${copy.title} | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 pb-16 lg:px-12 lg:pt-9 lg:pb-24">
      <Suspense fallback={<PageHead crumb={copy.title} kicker={copy.kicker} title={copy.title} lead=" " />}>
        <Saved />
      </Suspense>
    </div>
  )
}

function Saved() {
  const catalog = use(getCatalog())
  const saved = useWishlist()
  // Newest first; a decant no longer in the shop (after a restock) is left out
  const listings = [...saved].reverse().flatMap((slug) => catalog.find((l) => l.slug === slug) ?? [])

  return (
    <>
      <PageHead
        crumb={copy.title}
        kicker={copy.kicker}
        title={copy.title}
        count={listings.length || undefined}
        lead={copy.lead}
      >
        <Link to={copy.link.to} className="flex items-center gap-1.5 text-[15px] whitespace-nowrap text-wine">
          <span className="link-line pb-0.5">{copy.link.label}</span>
          <ArrowRight size={14} />
        </Link>
      </PageHead>

      {listings.length === 0 ? (
        <Empty />
      ) : (
        <>
          <h2 className="sr-only">Saved decants</h2>
          <div className="grid grid-cols-2 items-start gap-x-2.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
            {listings.map((listing, i) => (
              <ProductCard key={listing.slug} listing={listing} priority={i < 4} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function Empty() {
  const e = copy.empty
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/60 px-6 py-16 text-center lg:py-24">
      <span className="flex size-14 items-center justify-center rounded-full border border-rose-line text-wine">
        <HeartIcon />
      </span>
      <p className="font-display text-2xl lg:text-3xl">{e.title}</p>
      <p className="max-w-[34ch] text-sm text-muted lg:text-base">{e.text}</p>
      <Link
        to={e.to}
        className="mt-2 flex h-12 items-center gap-2 rounded-full bg-wine px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#5a1829]"
      >
        {e.button} <ArrowRight size={16} />
      </Link>
    </div>
  )
}
