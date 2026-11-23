import { Suspense, use, type ReactNode } from 'react'
import { Spotlight, SpotlightSkeleton } from '../components/Spotlight.tsx'
import { SectionHeading } from '../components/SectionHeading.tsx'
import { Shelf, ShelfSkeleton } from '../components/home/Shelf.tsx'
import { Houses, HousesSkeleton } from '../components/home/Houses.tsx'
import { Moods, MoodsSkeleton } from '../components/home/Moods.tsx'
import { OwnerNote } from '../components/home/OwnerNote.tsx'
import { numberWord } from '../lib/catalog.ts'
import { getBrands, getCatalog, getHome } from '../api/shop.ts'

/** Each section's number is its count: decants on the shelf, houses, moods (two digits, like 06) */
const asIndex = (n: number) => String(n).padStart(2, '0')

export default function Home() {
  return (
    <>
      <h1 className="sr-only">Anash’s Fragrances: fragrance decants poured to order</h1>

      <Suspense fallback={<SpotlightSkeleton />}>
        <Spotlight />
      </Suspense>

      <HomeSection labelledBy="shelf-title">
        <Suspense fallback={<HeadingFallback kicker="The collection" title="The shelf" />}>
          <ShelfHeading />
        </Suspense>
        <Suspense fallback={<ShelfSkeleton />}>
          <Shelf />
        </Suspense>
      </HomeSection>

      <HomeSection labelledBy="houses-title">
        <Suspense fallback={<HeadingFallback kicker="The houses" title="Discover houses" />}>
          <HousesHeading />
        </Suspense>
        <Suspense fallback={<HousesSkeleton />}>
          <Houses />
        </Suspense>
      </HomeSection>

      <HomeSection labelledBy="moods-title">
        <Suspense fallback={<HeadingFallback kicker="By occasion" title="Shop by mood" />}>
          <MoodsHeading />
        </Suspense>
        <Suspense fallback={<MoodsSkeleton />}>
          <Moods />
        </Suspense>
      </HomeSection>

      <OwnerNote />
    </>
  )
}

function HomeSection({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative z-10 mx-auto max-w-[1440px] px-4 pt-14 lg:px-12 lg:pt-[72px]"
    >
      {children}
    </section>
  )
}

function ShelfHeading() {
  const count = use(getCatalog()).length
  return (
    <SectionHeading
      id="shelf-title"
      index={asIndex(count)}
      kicker="The collection"
      title="The shelf"
      note="Poured to order from full bottles"
      link={{ label: 'All decants', to: '/decants' }}
    />
  )
}

function HousesHeading() {
  const brands = use(getBrands())
  const names = brands.map((b) => b.name)
  return (
    <SectionHeading
      id="houses-title"
      index={asIndex(brands.length)}
      kicker="The houses"
      title="Discover houses"
      note={`From ${names[0]} to ${names.at(-1)}`}
      link={{ label: 'All houses', to: '/houses' }}
    />
  )
}

function MoodsHeading() {
  const { moods } = use(getHome())
  const picks = Math.max(...moods.map((m) => m.picks.length))
  return (
    <SectionHeading
      id="moods-title"
      index={asIndex(moods.length)}
      kicker="By occasion"
      title="Shop by mood"
      description="A few favourites for each moment. Prices are for the smallest size."
      note={`${numberWord(picks)} picks in each`}
      link={{ label: 'All moods', to: '/moods' }}
    />
  )
}

/** The heading's shape before its counts arrive, so the section doesn't jump */
function HeadingFallback(props: { kicker: string; title: string }) {
  return <SectionHeading {...props} index="" note=" " link={{ label: 'View all', to: '/decants' }} />
}
