import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import type { ShopListing } from '@shared/types.ts'
import { getOptions } from '@shared/shop.ts'
import { formatPrice } from '@shared/stock.ts'
import { addToBag, roomFor, useBagCount } from '../../lib/bag.ts'
import { firstSentence, housePath } from '../../lib/catalog.ts'
import { site } from '../../lib/content.ts'
import { useWishlisted } from '../../lib/wishlist.ts'
import { SavedHeart } from '../SavedHeart.tsx'
import { BagIcon, MinusIcon, PlusIcon } from '../icons.tsx'

const copy = site.product

/**
 * The white buy card ("R2"): the house (a link to its page), name, "Concentration · Gender · Year", the story's first line and the
 * accords, then size tiles with their cost per ml, the total with a quantity stepper, Add to bag and the heart.
 * Desktop: sticky beside the photos, Add to bag is an outline that fills on hover. Phone: buying comes first, the
 * button is filled, and once it scrolls away a bar at the bottom keeps the total and Add to bag in reach.
 */
export function BuyCard({ listing }: { listing: ShopListing }) {
  const options = getOptions(listing)
  const soldOut = !options.some((o) => o.available)
  // Start on the middle size the design shows selected, or the first one in stock
  const start = options.find((o) => o.sizeMl === 5 && o.available) ?? options.find((o) => o.available) ?? options[0]
  const [sizeMl, setSizeMl] = useState(start?.sizeMl ?? 0)
  const [qty, setQty] = useState(1)
  const [saved, toggleSaved] = useWishlisted(listing.slug)
  // The save moment plays when the visitor saves it here, not when the page opens with it already saved
  const [popped, setPopped] = useState(0)
  const addRef = useRef<HTMLButtonElement>(null)
  const barShown = useBarShown(addRef)

  // Re-render when the bag changes, so the stock left for this size stays right
  useBagCount()
  const room = roomFor(listing, sizeMl)
  const max = Math.max(1, room)
  const quantity = Math.min(qty, max)
  const price = options.find((o) => o.sizeMl === sizeMl)?.price ?? 0
  const total = formatPrice(price * quantity)
  const label = `${quantity > 1 ? `${quantity} × ` : ''}${sizeMl} ml decant`
  const canAdd = !soldOut && room > 0
  const add = () => addToBag(listing, sizeMl, quantity)
  const addText = soldOut ? copy.soldOut : room === 0 ? 'All in your bag' : 'Add to bag'

  const sub = [listing.concentration, listing.gender, listing.year].filter(Boolean).join(' · ')
  const story = firstSentence(listing.description)

  return (
    <aside className="flex flex-col rounded-2xl bg-white px-[18px] pt-[22px] pb-5 shadow-[0_20px_50px_rgb(60_30_20/0.08)] lg:sticky lg:top-6 lg:rounded-[18px] lg:px-8 lg:pt-[34px] lg:pb-7">
      <div>
        {/* The house, linking to its page. On a mouse the underline grows from nothing on hover; on touch it rests
            as the short stroke, since there is no hover to hint at the link. */}
        <Link
          to={housePath(listing.brandSlug)}
          className="inline-flex min-h-11 items-center text-[13px] tracking-[0.14em] text-wine-light uppercase transition-colors duration-200 hover:text-wine lg:min-h-0 lg:text-sm"
        >
          <span className="link-line pb-0.5 fine:[--link-line-from:0%]">{listing.house}</span>
        </Link>
        <h1 className="mt-2 mb-1.5 font-display text-[38px] leading-none tracking-[-0.02em] lg:mt-4 lg:mb-2.5 lg:text-[54px]">
          {listing.name}
        </h1>
        <p className="text-sm text-muted">{sub}</p>
      </div>

      {/* Phone: the story and accords close the card; desktop: they come before the sizes */}
      <div className="order-last mt-5 border-t border-[#eee5dc] pt-[18px] lg:order-none lg:border-0 lg:pt-0">
        {story && <p className="font-display text-lg leading-[1.45] text-[#3a2d30] italic lg:text-xl">“{story}”</p>}
        {listing.accords.length > 0 && (
          <div className="mt-3.5 lg:mt-5 lg:border-t lg:border-ink lg:pt-[18px]">
            <p className="mb-1.5 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
              Accords
              <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
            </p>
            <ul className="flex flex-wrap gap-x-2.5 gap-y-0.5 font-display text-lg lg:text-xl">
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
      </div>

      <div>
        <p id="size-label" className="mt-4 mb-2 text-[13px] font-medium tracking-[0.02em] lg:mt-[26px]">
          {copy.sizeLabel}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="size-label"
          className="grid gap-2"
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
                className={`flex h-[84px] flex-col items-center justify-center gap-0.5 rounded-[14px] border transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45 lg:h-[92px] ${on ? 'border-wine bg-wine text-white' : 'border-rose-line bg-white enabled:hover:border-wine/60'}`}
              >
                <b className="font-display text-[30px] leading-none font-normal lg:text-[34px]">
                  {o.sizeMl}
                  <small className={`ml-[3px] font-sans text-[13px] ${on ? 'text-[#e7cdd3]' : 'text-muted'}`}>ml</small>
                </b>
                <em className={`text-xs not-italic lg:text-[13px] ${on ? 'text-[#e7cdd3]' : 'text-muted'}`}>
                  {o.available ? `$${(o.price / o.sizeMl!).toFixed(2)} / ml` : copy.soldOut}
                </em>
              </button>
            )
          })}
        </div>

        <div className="mt-[22px] flex items-end justify-between border-t border-[#eee5dc] pt-4">
          <p>
            <small className="block text-[13px] text-muted">{label}</small>
            <b aria-live="polite" className="font-display text-[38px] leading-none font-normal lg:text-[44px]">
              {total}
            </b>
          </p>
          <div className="flex h-12 items-center rounded-full border border-rose-line bg-white lg:h-[52px]">
            <button
              type="button"
              aria-label="One fewer"
              disabled={quantity <= 1 || !canAdd}
              onClick={() => setQty(quantity - 1)}
              className="flex h-full w-11 items-center justify-center text-wine disabled:opacity-35"
            >
              <MinusIcon size={18} />
            </button>
            <output aria-label="Quantity" className="w-5 text-center font-medium tabular-nums">
              {quantity}
            </output>
            <button
              type="button"
              aria-label="One more"
              disabled={quantity >= max || !canAdd}
              onClick={() => setQty(quantity + 1)}
              className="flex h-full w-11 items-center justify-center text-wine disabled:opacity-35"
            >
              <PlusIcon size={18} />
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2.5">
          <button
            ref={addRef}
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-wine bg-wine px-[18px] text-base font-medium whitespace-nowrap text-white transition-[background-color,color,box-shadow,transform] duration-[250ms] ease-out active:scale-[0.98] disabled:cursor-default disabled:border-muted/60 disabled:bg-muted/60 disabled:text-white lg:bg-transparent lg:text-wine lg:enabled:hover:bg-wine lg:enabled:hover:text-white lg:enabled:hover:shadow-[0_8px_18px_rgb(109_31_51/0.22)]"
          >
            <BagIcon size={18} />
            {addText}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!saved) setPopped((n) => n + 1)
              toggleSaved()
            }}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${listing.name} from your wishlist` : `Save ${listing.name} to your wishlist`}
            className="flex size-[52px] flex-none items-center justify-center rounded-full border border-rose-line bg-white text-wine transition-transform duration-150 ease-out active:scale-90"
          >
            <SavedHeart saved={saved} burst={popped} />
          </button>
        </div>

        <p className={`mt-3.5 flex items-center gap-2 text-sm ${soldOut ? 'text-muted' : 'text-[#2f6b4f]'}`}>
          <i
            aria-hidden="true"
            className={`size-2 rounded-full ${soldOut ? 'bg-muted' : 'bg-[#2f6b4f] shadow-[0_0_0_4px_rgb(47_107_79/0.14)]'}`}
          />
          {soldOut ? copy.soldOut : copy.inStock}
        </p>
      </div>

      {/* Phone: once Add to bag scrolls away, the total and the button stay at the bottom (the price still shows once) */}
      <div
        inert={!barShown}
        className={`fixed inset-x-0 bottom-0 z-30 flex items-center gap-3.5 border-t border-[#e4ddd3] bg-[#fbf8f4]/97 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_rgb(40_20_20/0.08)] transition-transform duration-200 ease-out lg:hidden ${barShown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <p className="flex-none">
          <small className="block text-xs whitespace-nowrap text-muted">{label}</small>
          <b className="font-display text-[28px] leading-none font-normal">{total}</b>
        </p>
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="flex h-[50px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-wine px-2.5 text-[15px] font-medium whitespace-nowrap text-white active:scale-[0.98] disabled:bg-muted/60"
        >
          <BagIcon size={18} />
          {addText}
        </button>
      </div>
    </aside>
  )
}

/** True while the card's Add to bag has scrolled up out of view and the footer hasn't come into view yet */
function useBarShown(addRef: RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const button = addRef.current
      const footer = document.querySelector('footer')
      if (!button) return
      const past = button.getBoundingClientRect().bottom < 0
      const footerIn = footer ? footer.getBoundingClientRect().top < window.innerHeight : false
      setShown(past && !footerIn)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    check()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [addRef])
  return shown
}
