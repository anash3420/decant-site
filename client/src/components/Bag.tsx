import { Suspense, use, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { ShopListing } from '@shared/types.ts'
import { fromOption, getOptions } from '@shared/shop.ts'
import { formatPrice } from '@shared/stock.ts'
import { getCatalog } from '../api/shop.ts'
import {
  closeBag,
  handOffBag,
  lineKey,
  reconcile,
  removeLine,
  setQty,
  setSize,
  limitFor,
  useBagCount,
  useBagHandoff,
  useBagLines,
  useBagOpen,
  useJustAdded,
  type BagLine,
} from '../lib/bag.ts'
import { productPath, similar } from '../lib/catalog.ts'
import { fill, site } from '../lib/content.ts'
import { openQuickBuy } from '../lib/quickBuy.ts'
import { useDragDismiss } from '../lib/useDragDismiss.ts'
import { useModal } from '../lib/useModal.ts'
import { dimClass, slideClass } from '../lib/overlay.ts'
import { Dropdown } from './Dropdown.tsx'
import { Photo } from './Photo.tsx'
import { ArrowRight, BagIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from './icons.tsx'

const copy = site.bag

/** How long a removed line takes to fold away before it leaves the bag */
const EXIT_MS = 220

type Drag = ReturnType<typeof useDragDismiss>

interface Line extends BagLine {
  listing: ShopListing
  unitPrice: number
}

/**
 * The bag: a side panel, not a page. On desktop a 480 px panel from the right, and about 350 ms later "You may also
 * like" slides out to its left. On phones a sheet from the right covering 90% of the width, with compact rows and
 * the picks as a swipe row above the subtotal. Free-shipping bar at the top, Checkout at the bottom.
 */
export function BagPanel() {
  const open = useBagOpen()
  const handoff = useBagHandoff()
  const count = useBagCount()
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  useModal(open, closeBag, closeRef)
  // Touch: swipe the bag back out to the right, from its header or its list of lines
  const drag = useDragDismiss(panelRef, { axis: 'x', onDismiss: closeBag, dimRef })

  return createPortal(
    <>
      <div aria-hidden="true" onClick={closeBag} ref={dimRef} className={dimClass(open, handoff)} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[90%] flex-col bg-[#fbf8f4] shadow-[-12px_0_30px_rgb(20_8_12/0.25)] lg:w-[480px] lg:shadow-[-16px_0_48px_rgb(20_8_12/0.25)] ${slideClass(open)} ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div
          {...drag}
          className="flex touch-none items-center justify-between pt-2.5 pr-2 pb-2 pl-4 lg:pt-5 lg:pr-[18px] lg:pb-3.5 lg:pl-7"
        >
          <h2 id="bag-title" className="font-display text-[26px] lg:text-[30px]">
            {copy.title}{' '}
            {count > 0 && <small className="font-sans text-[15px] text-muted tabular-nums">({count})</small>}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close bag"
            onClick={closeBag}
            className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
          >
            <CloseIcon />
          </button>
        </div>
        <Suspense fallback={<div className="flex-1" />}>
          <Contents open={open} drag={drag} />
        </Suspense>
      </div>
    </>,
    document.body,
  )
}

function Contents({ open, drag }: { open: boolean; drag: Drag }) {
  const catalog = use(getCatalog())
  // A bag saved before a restock can hold decants or quantities the shop no longer has
  useEffect(() => reconcile(catalog), [catalog])
  const bagLines = useBagLines()
  const justAdded = useJustAdded()
  // Lines folding away, and the size a line is moving to while the line it joins folds away
  const [leaving, setLeaving] = useState<string[]>([])
  const [moving, setMoving] = useState<Record<string, number>>({})
  const busy = useRef(new Set<string>())

  const lines: Line[] = bagLines.flatMap((l) => {
    const listing = catalog.find((c) => c.slug === l.slug)
    const unitPrice = listing?.prices.find((p) => p.sizeMl === l.sizeMl)?.price
    return listing && unitPrice !== undefined ? [{ ...l, listing, unitPrice }] : []
  })

  if (lines.length === 0) return <Empty />

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
  // "You may also like": in-stock decants not in the bag, sharing the most accords with what is in it
  const picks = similar(
    catalog,
    lines.flatMap((l) => l.listing.accords),
    new Set(lines.map((l) => l.slug)),
    4,
  )

  /** Folds a line away, then runs `done` (which takes it out of the bag) */
  const exit = (key: string, done: () => void) => {
    if (busy.current.has(key)) return
    busy.current.add(key)
    setLeaving((l) => [...l, key])
    setTimeout(() => {
      done()
      busy.current.delete(key)
      setLeaving((l) => l.filter((k) => k !== key))
    }, EXIT_MS)
  }
  const remove = (l: Line) => exit(lineKey(l), () => removeLine(l.slug, l.sizeMl))
  /** A new size; if that size is already in the bag, its line folds away and joins this one */
  const resize = (l: Line, toMl: number) => {
    const target = lineKey({ slug: l.slug, sizeMl: toMl })
    if (!lines.some((x) => lineKey(x) === target)) return setSize(l.listing, l.sizeMl, toMl)
    const from = lineKey(l)
    setMoving((m) => ({ ...m, [from]: toMl }))
    exit(target, () => {
      setSize(l.listing, l.sizeMl, toMl)
      setMoving(({ [from]: _done, ...rest }) => rest)
    })
  }

  return (
    <>
      <FreeShipping subtotal={subtotal} />

      {/* Desktop: "You may also like" slides out to the bag's left a moment after it opens */}
      {picks.length > 0 && (
        // Clipped at the bag's edge so it slides out from behind the bag; the extra width on the left keeps its shadow
        <div className="pointer-events-none absolute inset-y-0 right-full hidden w-[330px] overflow-hidden pl-10 lg:block">
          <aside
            aria-labelledby="bag-picks-title"
            className={`flex h-full flex-col gap-[18px] overflow-y-auto overscroll-contain border-r border-[#eee5dc] bg-white px-6 py-[26px] shadow-[-12px_0_30px_rgb(20_8_12/0.12)] transition-transform duration-[400ms] ease-lux motion-reduce:translate-none motion-reduce:transition-opacity motion-reduce:delay-0 ${open ? 'pointer-events-auto translate-x-0 delay-[350ms]' : 'translate-x-full motion-reduce:opacity-0'}`}
          >
            <h3 id="bag-picks-title" className="font-display text-2xl">
              {copy.alsoLike}
            </h3>
            {picks.slice(0, 2).map((p) => (
              <PickCard key={p.slug} listing={p} />
            ))}
            <Link
              to="/decants"
              onClick={closeBag}
              className="mt-auto flex h-12 flex-none items-center justify-center gap-2 rounded-full bg-[radial-gradient(ellipse_85%_120%_at_50%_50%,#93374f_0%,#7a2640_40%,#62192e_75%,#4c1222_100%)] text-sm text-white transition-[filter] duration-200 hover:brightness-110"
            >
              {fill(copy.shopAll).replace('{count}', String(catalog.length))} <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      )}

      <ul {...drag} className="flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 lg:px-7 lg:pt-1">
        {lines.map((l) => (
          <BagRow
            key={lineKey(l)}
            line={l}
            isNew={justAdded === lineKey(l)}
            leaving={leaving.includes(lineKey(l))}
            shownSize={moving[lineKey(l)] ?? l.sizeMl}
            onRemove={() => remove(l)}
            onResize={(toMl) => resize(l, toMl)}
          />
        ))}
      </ul>

      {/* Phone: the picks as a swipe row just above the subtotal */}
      {picks.length > 0 && (
        <div className="border-t border-line bg-white px-4 py-3 lg:hidden">
          <p className="mb-2 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
            {copy.alsoLike}
            <span aria-hidden="true" className="block h-px w-11 bg-wine/60" />
          </p>
          <ul className="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2.5 overflow-x-auto overscroll-x-contain px-4">
            {picks.map((p) => (
              <li key={p.slug} className="flex-none snap-start">
                <Link
                  to={productPath(p.slug)}
                  onClick={closeBag}
                  className="grid min-h-[72px] w-[210px] grid-cols-[52px_1fr] items-center gap-x-2.5 rounded-xl border border-[#eee5dc] p-1.5"
                >
                  <Photo
                    src={p.photos?.[0]?.src ?? ''}
                    alt=""
                    className="row-span-3 h-[60px] w-[52px] rounded-lg"
                    imgClassName="size-full object-cover"
                  />
                  <small className="block truncate text-[11px] text-muted">{p.house}</small>
                  <b className="block truncate font-display text-base leading-[1.2] font-normal">{p.name}</b>
                  <span className="text-[13px] font-medium">From {formatPrice(fromOption(p).price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-line bg-[#fbf8f4] px-4 pt-3 pb-5 shadow-[0_-10px_24px_rgb(40_20_20/0.04)] lg:px-7 lg:pt-4 lg:pb-6">
        <p className="flex items-baseline justify-between">
          <span className="text-[15px]">Subtotal</span>
          <b className="text-xl font-medium tabular-nums">{formatPrice(subtotal)}</b>
        </p>
        <p className="mt-1 mb-3.5 text-[13px] text-muted">{copy.note}</p>
        <Link
          to="/checkout"
          onClick={closeBag}
          className="flex h-[52px] w-full items-center justify-center rounded-full bg-wine text-base font-medium text-white shadow-[0_8px_18px_rgb(109_31_51/0.22)] transition-[background-color,transform] duration-200 ease-out hover:bg-[#5a1829] active:scale-[0.98]"
        >
          {copy.checkout}
        </Link>
      </div>
    </>
  )
}

/**
 * One bar running to free tracked shipping, with a stop at free lettermail. The line above it says what's left.
 * Levels and costs come from site.json, so they change without touching this.
 */
function FreeShipping({ subtotal }: { subtotal: number }) {
  const { lettermail, tracked } = site.shipping
  const end = tracked.freeFrom
  const stop = (lettermail.freeFrom / end) * 100
  const filled = Math.min(subtotal / end, 1) * 100
  const message =
    subtotal >= tracked.freeFrom
      ? copy.allFree
      : subtotal >= lettermail.freeFrom
        ? copy.toTracked.replace('{amount}', formatPrice(tracked.freeFrom - subtotal))
        : copy.toLettermail.replace('{amount}', formatPrice(lettermail.freeFrom - subtotal))
  const stops = [
    { at: stop, price: lettermail.freeFrom, label: lettermail.label },
    { at: 100, price: tracked.freeFrom, label: tracked.label },
  ]
  const tier = stops.filter((s) => subtotal >= s.price).length
  // Only a change while the bag is in use animates, not the bag's first showing
  const changed = useHasChanged(tier)

  return (
    <div className="border-b border-line px-4 pb-3.5 lg:px-7 lg:pb-[18px]">
      <p aria-live="polite" className="mb-2 text-sm text-[#3a2d30]">
        <span key={tier} className={`block ${changed ? 'animate-rise' : ''}`}>
          {emphasise(message)}
        </span>
      </p>
      <div
        role="meter"
        aria-label="Towards free shipping"
        aria-valuemin={0}
        aria-valuemax={end}
        aria-valuenow={Math.min(subtotal, end)}
        aria-valuetext={`${formatPrice(subtotal)} of ${formatPrice(end)}`}
        className="relative mr-1.5 h-1.5 rounded-[3px] bg-[#eadfd8]"
      >
        <i
          className="absolute inset-y-0 left-0 rounded-[3px] bg-[linear-gradient(90deg,#93374f,#6d1f33)] transition-[width] duration-500 ease-out"
          style={{ width: `${filled}%` }}
        />
        {stops.map((s) => {
          const reached = subtotal >= s.price
          return (
            <span
              key={`${s.price}-${reached}`}
              aria-hidden="true"
              style={{ left: `${s.at}%` }}
              className={`absolute top-1/2 -mt-[7px] -ml-[7px] size-3.5 rounded-full border-2 transition-colors duration-300 ${reached ? 'border-[#fbf8f4] bg-wine shadow-[0_0_0_1px_#6d1f33]' : 'border-[#d9c6c0] bg-[#fbf8f4]'} ${reached && changed ? 'animate-stop-pop' : ''}`}
            />
          )
        })}
      </div>
      <div aria-hidden="true" className="relative mt-2 h-[18px] text-[11px] text-muted lg:text-xs">
        {stops.map((s) => (
          <span
            key={s.price}
            style={s.at < 100 ? { left: `${s.at}%` } : undefined}
            className={`absolute whitespace-nowrap ${s.at < 100 ? '-translate-x-1/2' : '-right-0.5'}`}
          >
            <b className="font-medium text-ink lg:mr-[3px]">{formatPrice(s.price)}</b>
            <span className="hidden lg:inline">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** True once `value` has changed since the component first showed it */
function useHasChanged<T>(value: T) {
  const [last, setLast] = useState(value)
  const [changed, setChanged] = useState(false)
  if (last !== value) {
    setLast(value)
    setChanged(true)
  }
  return changed || last !== value
}

/** Text in [brackets] is set in burgundy ("You’re [$8] away from free lettermail") */
function emphasise(text: string): ReactNode[] {
  return text.split(/\[(.+?)\]/).map((part, i) =>
    i % 2 ? (
      <b key={i} className="font-medium text-wine">
        {part}
      </b>
    ) : (
      part
    ),
  )
}

interface BagRowProps {
  line: Line
  isNew: boolean
  /** Folding away before it leaves the bag */
  leaving: boolean
  /** The size the menu shows (a size change waits for the line it joins to fold away) */
  shownSize: number
  onRemove: () => void
  onResize: (toMl: number) => void
}

function BagRow({ line, isNew, leaving, shownSize, onRemove, onResize }: BagRowProps) {
  const { listing, sizeMl, qty } = line
  const photo = listing.photos?.[0]
  const max = limitFor(listing, sizeMl)
  const sizes = getOptions(listing)
  const remove = onRemove
  const stepClass =
    'flex size-11 items-center justify-center text-wine transition-transform duration-[120ms] ease-out active:scale-90 disabled:opacity-35 disabled:active:scale-100 lg:size-10'

  return (
    // Removing folds the row's height away as it fades (with reduced motion it only fades), so the rows below close up
    <li
      inert={leaving}
      className={`grid transition-[grid-template-rows,opacity] duration-[220ms] ease-out ${leaving ? 'grid-rows-[0fr] opacity-0 motion-reduce:grid-rows-[1fr]' : 'grid-rows-[1fr]'}`}
    >
      <div className={`min-h-0 ${leaving ? 'overflow-hidden' : ''}`}>
        <div className="relative grid grid-cols-[64px_1fr] gap-3 border-b border-[#eee5dc] py-4 lg:grid-cols-[88px_1fr_auto] lg:items-start lg:gap-4 lg:py-5">
          <Link to={productPath(listing.slug)} onClick={closeBag} tabIndex={-1} aria-hidden="true">
            <Photo
              src={photo?.src ?? ''}
              alt=""
              className="h-20 w-16 rounded-[10px] lg:h-[110px] lg:w-[88px]"
              imgClassName="size-full object-cover"
            />
          </Link>

          <div className="min-w-0">
            {isNew && (
              <em className="mb-1.5 inline-block rounded-full bg-[#f6e9ec] px-[9px] py-[3px] text-[11px] tracking-[0.12em] text-wine uppercase not-italic">
                Just added
              </em>
            )}
            <small className="block pr-[58px] text-xs tracking-[0.02em] text-muted lg:pr-0">{listing.house}</small>
            <Link
              to={productPath(listing.slug)}
              onClick={closeBag}
              className="relative mb-2.5 block pr-[58px] font-display text-lg leading-[1.2] before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] hover:text-wine lg:pr-0 lg:text-[21px] lg:before:hidden"
            >
              {listing.name}
            </Link>

            <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap lg:gap-2">
              <Dropdown
                value={shownSize}
                options={sizes.map((o) => ({
                  value: o.sizeMl,
                  label: `${o.sizeMl} ml`,
                  detail: o.available ? formatPrice(o.price) : 'Sold out',
                  disabled: !o.available,
                }))}
                onChange={onResize}
                label={`Size of ${listing.name}`}
                buttonClassName="flex h-11 items-center gap-1 rounded-full border bg-white pr-2.5 pl-3 text-sm whitespace-nowrap lg:h-10"
                menuClassName="left-0 w-48 origin-top-left"
                chevronSize={14}
              >
                {shownSize} ml
              </Dropdown>

              <div className="flex items-center rounded-full border border-rose-line bg-white">
                {/* Phone: at one, the minus becomes a bin (phones have no Remove link) */}
                <button
                  type="button"
                  aria-label={qty > 1 ? `One fewer ${listing.name}` : `Remove ${listing.name}`}
                  onClick={() => (qty > 1 ? setQty(listing, sizeMl, qty - 1) : remove())}
                  className={`${stepClass} lg:hidden`}
                >
                  {qty > 1 ? <MinusIcon size={16} /> : <TrashIcon size={16} />}
                </button>
                <button
                  type="button"
                  aria-label={`One fewer ${listing.name}`}
                  disabled={qty <= 1}
                  onClick={() => setQty(listing, sizeMl, qty - 1)}
                  className={`${stepClass} hidden lg:flex`}
                >
                  <MinusIcon size={16} />
                </button>
                <output
                  aria-live="polite"
                  aria-label={`Quantity of ${listing.name}`}
                  className="w-4 text-center text-sm font-medium tabular-nums"
                >
                  {qty}
                </output>
                <button
                  type="button"
                  aria-label={`One more ${listing.name}`}
                  disabled={qty >= max}
                  onClick={() => setQty(listing, sizeMl, qty + 1)}
                  className={stepClass}
                >
                  <PlusIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-0 flex flex-col items-end lg:static lg:justify-between lg:self-stretch">
            <strong className="font-display text-[22px] font-normal tabular-nums">
              {formatPrice(line.unitPrice * qty)}
            </strong>
            <button
              type="button"
              onClick={remove}
              className="hidden min-h-10 items-center text-[13px] text-muted transition-colors hover:text-wine lg:inline-flex"
            >
              <span className="link-line pb-0.5">Remove</span>
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

/** Desktop pick: a tall cover photo with a quick-buy bag on it, then the card details */
function PickCard({ listing }: { listing: ShopListing }) {
  const { price, sizeMl } = fromOption(listing)
  const photo = listing.photos?.[0]
  const href = productPath(listing.slug)
  return (
    <article className="group relative flex-none">
      <div className="relative">
        <Photo
          src={photo?.src ?? ''}
          alt={`${listing.house} ${listing.name}`}
          className="isolate h-[250px] rounded-xl"
          imgClassName="size-full object-cover motion-safe:fine:group-hover:scale-[1.06]"
        />
        <button
          type="button"
          aria-label={`Quick buy ${listing.name}`}
          aria-haspopup="dialog"
          onClick={() => {
            handOffBag()
            openQuickBuy(listing, true)
          }}
          className="absolute right-2.5 bottom-2.5 z-10 flex size-10 items-center justify-center rounded-full bg-wine text-white shadow-[0_6px_16px_rgb(109_31_51/0.3)] transition-transform duration-150 ease-out active:scale-95"
        >
          <BagIcon size={18} />
        </button>
      </div>
      <small className="mt-2.5 block text-xs text-muted">{listing.house}</small>
      <h4 className="font-display text-xl leading-[1.2]">
        <Link to={href} onClick={closeBag} className="after:absolute after:inset-0 after:content-['']">
          {listing.name}
        </Link>
      </h4>
      <p className="mt-0.5 text-sm font-medium">
        From {formatPrice(price)} <span className="text-xs font-normal text-muted">for {sizeMl} ml</span>
      </p>
      <span className="mt-1.5 inline-flex items-center gap-1.5 link-line font-display text-base text-wine italic">
        Make it yours{' '}
        <ArrowRight size={15} className="transition-transform duration-200 ease-out group-hover:translate-x-[3px]" />
      </span>
    </article>
  )
}

function Empty() {
  const e = copy.empty
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 border-t border-line px-8 pb-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-rose-line text-wine">
        <BagIcon />
      </span>
      <p className="font-display text-2xl">{e.title}</p>
      <p className="max-w-[30ch] text-sm text-muted">{e.text}</p>
      <Link
        to={e.to}
        onClick={closeBag}
        className="mt-2 flex h-12 items-center gap-2 rounded-full bg-wine px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#5a1829]"
      >
        {e.button} <ArrowRight size={16} />
      </Link>
    </div>
  )
}
