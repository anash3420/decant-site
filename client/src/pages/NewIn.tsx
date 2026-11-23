import { Suspense, use, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCatalog } from '../api/shop.ts'
import { PageHead } from '../components/PageHead.tsx'
import { ProductCard } from '../components/ProductCard.tsx'
import { SectionHeading } from '../components/SectionHeading.tsx'
import { ArrowRight } from '../components/icons.tsx'
import { byNewest, isNew, NEW_FOR_DAYS } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { Listings } from './Decants.tsx'

const copy = site.newIn

/**
 * New in: the decants added in the last 30 days, with the same Filter & Sort and grid as All decants, then "Our
 * catalogue": every other decant, newest first.
 */
export default function NewIn() {
  useEffect(() => {
    document.title = `${copy.title} | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 pb-16 lg:px-12 lg:pt-9 lg:pb-24">
      <Suspense fallback={<PageHead crumb={copy.title} kicker={copy.kicker} title={copy.title} lead=" " />}>
        <Arrivals />
      </Suspense>
    </div>
  )
}

function Arrivals() {
  const catalog = use(getCatalog())
  const arrivals = catalog.filter((l) => isNew(l))
  const rest = catalog.filter((l) => !isNew(l)).sort(byNewest)

  return (
    <>
      <PageHead
        crumb={copy.title}
        kicker={copy.kicker}
        title={copy.title}
        count={arrivals.length || undefined}
        lead={copy.lead}
      >
        <em className="font-display text-[19px] whitespace-nowrap text-quiet">
          {copy.note.replace('{days}', String(NEW_FOR_DAYS))}
        </em>
        <Link to={copy.link.to} className="flex items-center gap-1.5 text-[15px] whitespace-nowrap text-wine">
          <span className="link-line pb-0.5">{copy.link.label}</span>
          <ArrowRight size={14} />
        </Link>
      </PageHead>
      {/* Its own box, so the phone's sticky Filter bar (which filters only the new decants) ends with it */}
      <div>{arrivals.length ? <Listings catalog={arrivals} /> : <Empty />}</div>

      {rest.length > 0 && (
        <section aria-labelledby="new-catalogue" className="mt-20 lg:mt-32">
          <SectionHeading
            id="new-catalogue"
            index={String(rest.length).padStart(2, '0')}
            kicker={copy.catalogue.kicker}
            title={copy.catalogue.title}
            note={copy.catalogue.note}
            link={copy.catalogue.link}
          />
          <div className="grid grid-cols-2 items-start gap-x-2.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4 lg:gap-[18px]">
            {rest.map((listing) => (
              <ProductCard key={listing.slug} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function Empty() {
  const e = copy.empty
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/60 px-6 py-16 text-center lg:py-24">
      <p className="font-display text-2xl lg:text-3xl">{e.title}</p>
      <p className="max-w-[34ch] text-sm text-muted lg:text-base">{e.text}</p>
    </div>
  )
}
