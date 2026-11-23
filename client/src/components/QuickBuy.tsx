import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ShopListing } from '@shared/types.ts'
import { getOptions } from '@shared/shop.ts'
import { formatPrice } from '@shared/stock.ts'
import { addToBag, roomFor, useBagCount } from '../lib/bag.ts'
import { firstSentence } from '../lib/catalog.ts'
import { dimClass, slideClass } from '../lib/overlay.ts'
import { closeQuickBuy, handOffQuickBuy, useQuickBuy } from '../lib/quickBuy.ts'
import { useModal } from '../lib/useModal.ts'
import { Photo } from './Photo.tsx'
import { BagIcon, CloseIcon, MinusIcon, PlusIcon } from './icons.tsx'

/**
 * Quick buy, desktop only: a 500 px drawer from the right, opened by the bag button on a card's photo. A photo
 * mosaic, house, name, concentration and gender, one line of the story, the accords, a segmented size picker, then a
 * quantity stepper and Add to bag. The price shows only in the size picker. Mounted once in the layout.
 */
export function QuickBuy() {
  const { open, listing, opened, handoff } = useQuickBuy()
  const closeRef = useRef<HTMLButtonElement>(null)
  useModal(open, closeQuickBuy, closeRef)

  return createPortal(
    <>
      <div aria-hidden="true" onClick={closeQuickBuy} className={dimClass(open, handoff)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-buy-name"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col bg-[#fbf8f4] shadow-[-16px_0_48px_rgb(20_8_12/0.28)] ${slideClass(open)} ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between pt-3.5 pr-4 pb-2.5 pl-7">
          <p className="text-[13px] tracking-[0.14em] text-wine uppercase">Quick buy</p>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close quick buy"
            onClick={closeQuickBuy}
            className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
          >
            <CloseIcon />
          </button>
        </div>
        {/* Keyed per opening so the size and quantity start fresh */}
        {listing && <Details key={opened} listing={listing} />}
      </div>
    </>,
    document.body,
  )
}

function Details({ listing }: { listing: ShopListing }) {
  const options = getOptions(listing)
  const firstInStock = options.find((o) => o.available) ?? options[0]
  const [sizeMl, setSizeMl] = useState(firstInStock?.sizeMl ?? 0)
  const [qty, setQty] = useState(1)

  // Re-render when the bag changes, so the stock left for this size stays right
  useBagCount()
  const room = roomFor(listing, sizeMl)
  const soldOut = !options.some((o) => o.available)
  const max = Math.max(1, room)
  const quantity = Math.min(qty, max)

  // Adding closes quick buy and opens the bag in its place, with this line marked "Just added"
  const add = () => {
    handOffQuickBuy()
    addToBag(listing, sizeMl, quantity, true)
  }

  const story = firstSentence(listing.description)
  const sub = [listing.concentration, listing.gender].filter(Boolean).join(' · ')

  return (
    <>
      <div className="flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(180deg,#000_calc(100%-40px),transparent)] px-7 pb-10">
        <Mosaic listing={listing} />

        <p className="mt-[18px] text-[13px] font-medium tracking-[0.02em] text-wine">{listing.house}</p>
        <h2 id="quick-buy-name" className="mt-0.5 mb-1 font-display text-[34px] leading-[1.05]">
          {listing.name}
        </h2>
        <p className="text-[13px] text-muted">{sub}</p>

        {story && <p className="mt-3.5 font-display text-lg leading-[1.4] text-[#3a2d30] italic">“{story}”</p>}

        {listing.accords.length > 0 && (
          <div className="mt-4 border-t border-ink pt-3">
            <p className="mb-1.5 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
              Accords
              <span aria-hidden="true" className="block h-px w-11 bg-wine/60" />
            </p>
            <ul className="flex flex-wrap gap-x-2.5 gap-y-1 font-display text-[19px]">
              {listing.accords.map((a, i) => (
                <li key={a} className="flex items-center gap-2.5">
                  {a}
                  {i < listing.accords.length - 1 && (
                    <span aria-hidden="true" className="text-[#c3a4ac]">
                      ·
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p id="quick-buy-size" className="mt-5 mb-2 text-[13px] font-medium">
          Size
        </p>
        <div
          role="radiogroup"
          aria-labelledby="quick-buy-size"
          className="grid rounded-full border border-rose-line bg-white p-1"
          style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
          {options.map((o) => {
            const on = o.sizeMl === sizeMl
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!o.available}
                onClick={() => setSizeMl(o.sizeMl!)}
                className={`flex h-[46px] items-center justify-center gap-2 rounded-full text-[15px] transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${on ? 'bg-wine text-wine-soft' : 'text-muted enabled:hover:bg-sand/60'}`}
              >
                <b className={`font-medium ${on ? 'text-white' : 'text-ink'}`}>{o.sizeMl} ml</b>
                {o.available ? formatPrice(o.price) : 'Sold out'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line bg-[#fbf8f4] px-7 pt-3.5 pb-[18px]">
        <div className="flex h-[52px] items-center rounded-full border border-rose-line bg-white">
          <button
            type="button"
            aria-label="One fewer"
            disabled={quantity <= 1 || soldOut}
            onClick={() => setQty(quantity - 1)}
            className="flex h-full w-11 items-center justify-center text-wine disabled:opacity-35"
          >
            <MinusIcon size={18} />
          </button>
          <output aria-live="polite" aria-label="Quantity" className="w-5 text-center font-medium">
            {quantity}
          </output>
          <button
            type="button"
            aria-label="One more"
            disabled={quantity >= max || soldOut}
            onClick={() => setQty(quantity + 1)}
            className="flex h-full w-11 items-center justify-center text-wine disabled:opacity-35"
          >
            <PlusIcon size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={soldOut || room === 0}
          className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-wine px-[18px] text-base font-medium whitespace-nowrap text-white shadow-[0_8px_18px_rgb(109_31_51/0.22)] transition-[background-color,transform] duration-200 ease-out hover:bg-[#5a1829] active:scale-[0.98] disabled:cursor-default disabled:bg-muted/60 disabled:shadow-none`}
        >
          <BagIcon size={18} />
          <span aria-live="polite">{soldOut ? 'Sold out' : room === 0 ? 'All in your bag' : 'Add to bag'}</span>
        </button>
      </div>
    </>
  )
}

/** One large photo and two small ones; fewer photos fill the space instead of leaving gaps */
function Mosaic({ listing }: { listing: ShopListing }) {
  const photos = (listing.photos ?? []).filter((p) => p.src).slice(0, 3)
  const alt = `${listing.house} ${listing.name}`
  const frame = 'isolate size-full rounded-[14px]'
  const layout =
    photos.length >= 3
      ? 'grid-cols-[1.6fr_1fr] grid-rows-2'
      : photos.length === 2
        ? 'grid-cols-[1.6fr_1fr] grid-rows-1'
        : 'grid-cols-1 grid-rows-1'
  if (photos.length === 0) return <span className="photo block h-[330px] rounded-[14px]" aria-hidden="true" />
  return (
    <div className={`grid h-[330px] gap-2 ${layout}`}>
      {photos.map((p, i) => (
        <Photo
          key={p.src}
          src={p.src!}
          alt={i === 0 ? alt : ''}
          width={p.width}
          height={p.height}
          priority
          className={`${frame} ${i === 0 && photos.length >= 3 ? 'row-span-2' : ''}`}
          imgClassName="size-full object-cover"
        />
      ))}
    </div>
  )
}
