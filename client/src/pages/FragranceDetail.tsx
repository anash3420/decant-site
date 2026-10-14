import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Fragrance, Photo } from '@shared/types.ts'
import { fetchListing, ShopApiError } from '../api/shop.ts'
import { useShop } from '../context/ShopContext.tsx'
import { CatalogError } from '../components/CatalogState.tsx'
import { kindMeta, slugify } from '../lib/catalog.ts'
import { formatPrice, getOptions, maxQty, remainingMl } from '@shared/stock.ts'
import { useInquiry } from '../context/InquiryContext.tsx'
import { useToast } from '../context/ToastContext.tsx'
import PhotoCarousel from '../components/PhotoCarousel.tsx'
import QtyStepper from '../components/QtyStepper.tsx'
import StockBadge from '../components/StockBadge.tsx'
import NotFound from './NotFound.tsx'

export default function FragranceDetail() {
  const { slug = '' } = useParams()
  const { getListing, upsertListing, status } = useShop()
  const [missing, setMissing] = useState(false)

  // Show the catalog copy straight away, then refresh this one listing so stock is current
  useEffect(() => {
    let live = true
    setMissing(false)
    fetchListing(slug)
      .then((l) => live && upsertListing(l))
      .catch((e) => live && e instanceof ShopApiError && e.status === 404 && setMissing(true))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const listing = getListing(slug)
  if (missing) return <NotFound />
  // key resets option/qty state when navigating between fragrances
  if (listing) return <FragranceView key={slug} fragrance={listing} />
  if (status === 'error') return <CatalogError />
  return <DetailSkeleton />
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 md:grid-cols-2">
      <div className="aspect-[4/3] animate-pulse rounded-xl bg-accent-soft/60 md:aspect-square" />
      <div className="space-y-4">
        <div className="h-4 w-1/4 animate-pulse rounded bg-border" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-border" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-border" />
        <div className="h-24 animate-pulse rounded bg-border" />
      </div>
    </div>
  )
}

const defaultPhotos = (f: Fragrance): Photo[] =>
  f.kind === 'full-bottle'
    ? [{ label: 'Front', variant: 'bottle', fill: f.fillPercent / 100 }]
    : [{ label: 'Vial', variant: 'vial' }]

function FragranceView({ fragrance }: { fragrance: Fragrance }) {
  const { items, add } = useInquiry()
  const toast = useToast()

  const options = getOptions(fragrance)
  const firstAvailable = options.find((o) => o.available)
  const [optionId, setOptionId] = useState(firstAvailable?.id ?? '')
  const [qty, setQty] = useState(1)

  const f = fragrance
  const meta = kindMeta(f.kind)

  const selected = options.find((o) => o.id === optionId)
  const inInquiry = items.find((i) => i.slug === f.slug && i.optionId === optionId)?.qty ?? 0
  const canAddUpTo = selected ? maxQty(f, optionId, items) - inInquiry : 0
  const soldOut = !firstAvailable
  const isBottle = f.kind === 'full-bottle'

  const pick = (id: string) => {
    setOptionId(id)
    setQty(1)
  }

  const handleAdd = () => {
    add(f.slug, optionId, qty)
    toast({
      title: 'Added to your inquiry',
      detail: `${qty > 1 ? `${qty} × ` : ''}${f.name} · ${selected?.label}`,
      action: { label: 'View inquiry', to: '/inquiry' },
    })
    setQty(1)
  }

  return (
    <article>
      <nav className="flex gap-2 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="-my-3 py-3 hover:text-text">
          Fragrances
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={meta.path} className="-my-3 py-3 hover:text-text">
          {meta.title}
        </Link>
      </nav>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-10 md:grid-cols-2">
        <div className="min-w-0">
          <PhotoCarousel photos={f.photos ?? defaultPhotos(f)} tint={f.tint} alt={`${f.house} ${f.name}`} dimmed={soldOut} />
        </div>

        <div>
          <Link
            to={`/?brand=${slugify(f.house)}`}
            className="-my-3 inline-block py-3 text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            {f.house}
          </Link>
          <h1 className="mt-1 text-4xl sm:text-5xl">{f.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {[f.concentration, f.year, f.gender].filter(Boolean).join(' · ')}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs text-accent">{meta.short}</span>
            {f.accords.map((a) => (
              <span key={a} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                {a}
              </span>
            ))}
          </div>

          <p className="mt-6 max-w-prose">{f.description}</p>

          {/* Notes pyramid */}
          <section className="mt-6 border-y border-border py-5">
            <h2 className="text-xl">Notes</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['Top', f.notes.top],
                  ['Heart', f.notes.heart],
                  ['Base', f.notes.base],
                ] as const
              ).map(([label, notes]) => (
                <Detail key={label} term={label}>
                  {notes.join(', ')}
                </Detail>
              ))}
            </dl>
          </section>

          {/* Full bottle: condition details + single price */}
          {isBottle && (
            <section className="mt-8 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-3xl font-medium tabular-nums">{formatPrice(f.price)}</p>
                <StockBadge inStock={!f.sold} label={f.sold ? 'Sold' : 'Available'} />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Detail term="Bottle size">{f.bottleSizeMl}ml</Detail>
                <Detail term="Fill level">
                  <span className="flex items-center gap-2">
                    ~{f.fillPercent}%
                    <span className="h-1.5 w-14 overflow-hidden rounded-full bg-border" aria-hidden="true">
                      <span className="block h-full bg-accent" style={{ width: `${f.fillPercent}%` }} />
                    </span>
                  </span>
                </Detail>
                <Detail term="Presentation">{f.hasBox ? 'With box' : 'No box'}</Detail>
              </dl>
              <p className="mt-4 border-t border-border pt-4 text-sm">
                <span className="text-muted">Condition: </span>
                {f.condition}
              </p>
            </section>
          )}

          {/* Decants and Catch & Release: pick an option */}
          {!isBottle && (
            <fieldset className="mt-8">
              <legend className="text-sm font-medium">{f.kind === 'decant' ? 'Decant size' : 'Available vials'}</legend>
              <div className={`mt-3 grid gap-3 ${f.kind === 'decant' ? 'grid-cols-3' : 'sm:grid-cols-2'}`}>
                {options.map((o) => {
                  const active = o.id === optionId
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!o.available}
                      onClick={() => pick(o.id)}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed ${
                        active
                          ? 'border-accent bg-accent-soft'
                          : 'border-border bg-surface hover:border-muted disabled:hover:border-border'
                      }`}
                    >
                      <span className={`block text-sm ${o.available ? 'text-muted' : 'text-soldout'}`}>{o.label}</span>
                      <span className={`block text-lg font-medium ${o.available ? '' : 'text-soldout line-through'}`}>
                        {formatPrice(o.price)}
                      </span>
                      {o.detail && <span className="block text-xs text-muted">{o.detail}</span>}
                      {!o.available && <span className="text-xs text-soldout">Sold out</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {soldOut ? (
            <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              {isBottle
                ? 'This bottle has found a new home.'
                : 'All gone for now. It may come back, so keep an eye on the CFE group.'}
            </div>
          ) : (
            // Phones: sticks to the bottom of the screen so the add button is reachable without scrolling
            <div
              data-sticky-cta
              className="z-20 mt-6 flex items-center gap-3 max-md:sticky max-md:bottom-0 max-md:-mx-5 max-md:border-t max-md:border-border max-md:bg-surface/95 max-md:px-5 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:backdrop-blur sm:gap-4"
            >
              {!isBottle && (
                <QtyStepper
                  label="Quantity"
                  value={qty}
                  max={Math.max(1, canAddUpTo)}
                  onChange={setQty}
                />
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={canAddUpTo < qty}
                className="min-h-12 min-w-0 flex-1 rounded-md bg-accent px-4 py-2 text-sm leading-tight font-medium text-balance text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11 md:flex-none"
              >
                {isBottle && inInquiry
                  ? 'In your inquiry'
                  : `Add ${isBottle ? 'to inquiry' : selected?.label} · ${selected ? formatPrice(selected.price * qty) : ''}`}
              </button>
            </div>
          )}

          <div className="mt-3 min-h-6 text-sm" aria-live="polite">
            {!soldOut && !isBottle && canAddUpTo < 1 && (
              <span className="text-muted">
                {f.kind === 'decant'
                  ? "Not enough left for this size after what's already in your inquiry."
                  : 'All of these are already in your inquiry.'}
              </span>
            )}
          </div>


          {f.kind === 'decant' && (
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="text-2xl">From my bottles</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {f.bottles.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-4">
                    <span>{b.sizeMl}ml bottle</span>
                    <StockBadge inStock={b.remainingMl > 0} label={b.remainingMl > 0 ? `~${b.remainingMl}ml left` : 'Empty'} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                {remainingMl(f)}ml left in total. Decanted with clean tools into glass atomizers.
              </p>
            </section>
          )}

          {f.kind === 'catch-release' && (
            <p className="mt-8 border-t border-border pt-6 text-sm text-muted">
              Catch & Release: these came from other members and are passed along as-is. Fill levels are my best estimate.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted uppercase">{term}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  )
}
