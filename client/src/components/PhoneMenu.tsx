import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link } from 'react-router-dom'
// Hardcoded for now (generated from the mock catalogue); fetched from the API later
import menus from '../data/mock/menus.json'
import { formatPrice } from '@shared/stock.ts'
import { housePath, productPath } from '../lib/catalog.ts'
import { site } from '../lib/content.ts'
import { Photo } from './Photo.tsx'
import { AccountIcon, ArrowRight, BagIcon, CloseIcon, HeartIcon, MailIcon, SearchIcon } from './icons.tsx'

type Section = 'new' | 'decants' | 'fragrances' | 'houses'
type Chip = { label: string; count?: number; to: string }

/** How many house logo tiles show before a letter is picked */
const HOUSE_TILES = 8

/**
 * The phone menu: a drawer from the left over a dimmed page. Close, name and bag at the top, then search, New in,
 * and three accordions (one open at a time): All decants, Fragrances, Houses. Account, wishlist and the
 * customer-service email at the bottom. It stays mounted (inert while closed), so it slides both ways.
 */
export function PhoneMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [section, setSection] = useState<Section | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const swipe = useSwipeToClose(drawerRef, scrimRef, onClose)
  const { decants, fragrances, houses, newIn, totalDecants } = menus
  const columns = Object.fromEntries(decants.columns.map((c) => [c.title, c.items as Chip[]]))

  // While open: Escape closes, the page behind doesn't scroll, and focus starts on the close button
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = before
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const toggle = (s: Section) => setSection((cur) => (cur === s ? null : s))

  return (
    <div className="lg:hidden">
      <div
        ref={scrimRef}
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgb(20_8_12/0.45)] transition-opacity duration-300 ease-out ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        {...swipe}
        // Any link inside closes the menu as it navigates
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) onClose()
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(345px,92vw)] touch-pan-y flex-col bg-[#fbf8f4] shadow-[16px_0_40px_rgb(20_8_12/0.3)] transition-transform duration-[400ms] ease-lux ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="grid grid-cols-[44px_1fr_44px] items-center px-2 pt-2.5 pb-1.5">
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
          >
            <CloseIcon />
          </button>
          <Link to="/" className="flex min-h-11 items-center justify-center font-display text-[19px]">
            {site.shopName}
          </Link>
          <Link
            to="/bag"
            aria-label="Bag"
            className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
          >
            <BagIcon />
          </Link>
        </div>

        {/* Opens the search panel; designed later */}
        <button
          type="button"
          className="mx-4 mt-1 mb-2 flex h-11 items-center gap-2 rounded-full bg-[#f0e8df] px-3.5 text-left text-base text-muted"
        >
          <SearchIcon size={18} />
          Search {totalDecants} decants
        </button>

        <nav aria-label="Shop" className="flex-1 overflow-y-auto overscroll-contain px-4">
          <Accordion
            title="New in"
            meta={`${newIn.count} this month`}
            open={section === 'new'}
            onToggle={() => toggle('new')}
          >
            <NewInSection />
          </Accordion>

          <Accordion
            title="All decants"
            meta={String(totalDecants)}
            open={section === 'decants'}
            onToggle={() => toggle('decants')}
          >
            <Link
              to="/decants"
              className="mb-3 flex min-h-[52px] items-center justify-between rounded-xl border border-rose-line bg-white px-4 text-[15px] font-medium text-wine"
            >
              Shop all {totalDecants} decants <ArrowRight size={16} />
            </Link>
            <Chips title="Accord" items={columns['Accord'] ?? []} />
            <Chips title="Size" items={columns['Size'] ?? []} />
            <Chips title="Type" items={columns['Type'] ?? []} />
          </Accordion>

          <Accordion
            title="Fragrances"
            meta={`${fragrances.families.length} families`}
            open={section === 'fragrances'}
            onToggle={() => toggle('fragrances')}
          >
            <div className="grid grid-cols-2 gap-2">
              {fragrances.families.map((f) => (
                <Link
                  key={f.slug}
                  to={f.to}
                  className="relative block h-[150px] overflow-hidden rounded-xl active:scale-[0.98]"
                >
                  <Photo
                    src={f.photo.src}
                    alt=""
                    width={f.photo.width}
                    height={f.photo.height}
                    className="absolute! inset-0"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0)_38%,rgb(10_4_6/0.55)_62%,rgb(10_4_6/0.85)_100%)]"
                  />
                  <span className="absolute inset-x-2.5 bottom-2.5 text-white">
                    <b className="block font-display text-lg leading-[1.1] font-normal">{f.name}</b>
                    <em className="text-[10px] tracking-[0.14em] text-[#f3d9b0] uppercase not-italic">
                      {f.count} decants
                    </em>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to="/decants"
              className="burgundy mt-2 flex min-h-[52px] items-center justify-between gap-2 rounded-xl px-4 text-sm text-wine-soft"
            >
              <span>
                Not sure yet? <b className="ml-1 text-[15px] font-medium text-gold">Shop all {totalDecants} decants</b>
              </span>
              <ArrowRight size={16} className="text-gold" />
            </Link>
            <Chips title="Worn by" items={fragrances.wornBy} />
          </Accordion>

          <Accordion
            title="Houses"
            meta={String(houses.total)}
            open={section === 'houses'}
            onToggle={() => toggle('houses')}
          >
            <HousesByLetter />
          </Accordion>

          <div className="flex flex-col pt-2.5 pb-5 text-[15px] text-[#3a2d30]">
            <FootLink to="/account" icon={<AccountIcon size={20} />}>
              Account
            </FootLink>
            <FootLink to="/wishlist" icon={<HeartIcon size={20} />}>
              Wishlist
            </FootLink>
            <a href={`mailto:${site.email}`} className="flex min-h-11 items-center gap-3 break-all">
              <MailIcon size={20} />
              {site.email}
            </a>
          </div>
        </nav>
      </div>
    </div>
  )
}

/** New in on phones: the newest arrival as a wide photo, the next two as small cards, then the burgundy button */
function NewInSection() {
  const { newIn } = menus
  const [first, ...rest] = newIn.items
  return (
    <>
      {first && (
        <Link
          to={productPath(first.slug)}
          className="relative mb-2 block h-[170px] overflow-hidden rounded-xl active:scale-[0.98]"
        >
          <Photo
            src={first.art.wide.src}
            alt=""
            width={first.art.wide.width}
            height={first.art.wide.height}
            className="absolute! inset-0"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0)_38%,rgb(10_4_6/0.55)_62%,rgb(10_4_6/0.85)_100%)]"
          />
          <span className="absolute inset-x-3 bottom-2.5 text-white">
            <small className="text-[10px] tracking-[0.14em] text-gold uppercase">Newest arrival</small>
            <b className="block font-display text-[22px] leading-[1.1] font-normal">
              {first.house} {first.name}
            </b>
          </span>
        </Link>
      )}
      <div className="grid grid-cols-2 gap-2">
        {rest.slice(0, 2).map((item) => (
          <Link key={item.slug} to={productPath(item.slug)} className="block active:scale-[0.98]">
            <span className="relative block aspect-square overflow-hidden rounded-xl">
              <Photo
                src={item.art.tall.src}
                alt=""
                width={item.art.tall.width}
                height={item.art.tall.height}
                className="absolute! inset-0"
              />
              <span className="absolute top-1.5 left-1.5 rounded-full bg-wine px-2 py-0.5 text-[10px] text-white">
                New
              </span>
            </span>
            <span className="mt-1.5 block font-display text-base leading-[1.15]">{item.name}</span>
            <span className="block text-[13px] font-medium">From {formatPrice(item.price)}</span>
          </Link>
        ))}
      </div>
      <Link
        to="/new"
        className="burgundy mt-3 flex min-h-[52px] items-center justify-between gap-2 rounded-xl px-4 text-sm text-wine-soft"
      >
        <span>
          This month{' '}
          <b className="ml-1 text-[15px] font-medium text-gold">
            Shop all {newIn.count} new {newIn.count === 1 ? 'decant' : 'decants'}
          </b>
        </span>
        <ArrowRight size={16} className="text-gold" />
      </Link>
    </>
  )
}

/** One accordion section; its body grows open smoothly (grid-rows from 0fr to 1fr) */
function Accordion({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string
  meta: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex min-h-[58px] w-full items-center gap-2.5 border-b text-left font-display text-2xl transition-colors duration-300 ${open ? 'border-wine text-wine italic' : 'border-wine/14'}`}
      >
        <span className="flex-1">{title}</span>
        <small className="font-sans text-xs text-muted not-italic">{meta}</small>
        {/* Plus that turns into a minus */}
        <span aria-hidden="true" className="relative size-4">
          <i className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-current" />
          <i
            className={`absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 bg-current transition-transform duration-300 ease-out ${open ? 'scale-y-0' : ''}`}
          />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-[400ms] ease-lux ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="border-b border-wine/14 pt-3.5 pb-[18px]">{children}</div>
        </div>
      </div>
    </section>
  )
}

function Chips({ title, items }: { title: string; items: Chip[] }) {
  return (
    <div className="mt-3.5">
      <span className="mb-2 block text-xs tracking-[0.2em] text-wine uppercase">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="flex h-10 items-center gap-1.5 rounded-full border border-rose-line bg-white px-3.5 text-[15px] active:scale-[0.97]"
          >
            {c.label}
            {c.count !== undefined && <small className="text-xs text-muted">{c.count}</small>}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** Round A to Z letters (only letters that have houses); picking one shows that letter's houses */
function HousesByLetter() {
  const { houses } = menus
  const [letter, setLetter] = useState<string | null>(null)
  const letters = [...new Set(houses.all.map((h) => h.name[0].toUpperCase()))]
  const shown = letter ? houses.all.filter((h) => h.name[0].toUpperCase() === letter) : houses.all.slice(0, HOUSE_TILES)
  const boxRef = useRef<HTMLDivElement>(null)
  const lastHeight = useRef<number | null>(null)
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const next = box.scrollHeight
    const prev = lastHeight.current
    lastHeight.current = next
    if (prev === null || prev === next || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    box.style.height = `${prev}px`
    box.getBoundingClientRect() // apply the old height before animating to the new one
    box.style.transition = 'height 250ms var(--ease-out)'
    box.style.height = `${next}px`
    const done = () => {
      box.style.height = ''
      box.style.transition = ''
    }
    box.addEventListener('transitionend', done, { once: true })
    return () => box.removeEventListener('transitionend', done)
  }, [letter])
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {letters.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={letter === l}
            onClick={() => setLetter((cur) => (cur === l ? null : l))}
            className={`flex size-11 items-center justify-center rounded-full border font-display text-[17px] transition-colors duration-200 ${letter === l ? 'border-wine bg-wine text-white' : 'border-rose-line bg-white text-wine'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div ref={boxRef} className="grid grid-cols-2 gap-2 overflow-hidden">
        {shown.map((h) => (
          <Link
            key={`${letter}-${h.slug}`}
            to={housePath(h.slug)}
            className="flex animate-[tile-in_180ms_var(--ease-out)_both] flex-col items-center gap-1.5 rounded-[10px] bg-white px-2.5 pt-2.5 pb-2"
          >
            <span className="flex h-[38px] items-center">
              <img
                src={h.logo.src}
                alt=""
                loading="lazy"
                className="max-h-[38px] max-w-[110px] object-contain mix-blend-multiply"
              />
            </span>
            <small className="text-xs text-muted">{h.name}</small>
          </Link>
        ))}
      </div>
      <Link to="/houses" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] text-wine">
        View all {houses.total} houses <ArrowRight size={14} />
      </Link>
    </>
  )
}

function FootLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} className="flex min-h-11 items-center gap-3">
      {icon}
      {children}
    </Link>
  )
}

/**
 * Swipe the drawer left to close it. It follows the finger 1:1 (never past open) and the page's dimming fades with
 * it. On release it closes if dragged past 40% of its width or flicked; otherwise it eases back open. It moves the
 * elements directly, so dragging causes no re-renders, and a drag never also counts as a tap on a link.
 */
function useSwipeToClose(
  drawerRef: RefObject<HTMLDivElement | null>,
  scrimRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const lastDx = useRef(0)
  // The last moment of movement, to tell a flick from a slow drag
  const recent = useRef<{ dx: number; t: number }[]>([])

  const settle = (closing: boolean) => {
    const drawer = drawerRef.current
    const scrim = scrimRef.current
    if (!drawer || !scrim) return
    const ease = '300ms var(--ease-lux)'
    drawer.style.transition = `translate ${ease}`
    drawer.style.translate = closing ? '-100% 0' : '0 0'
    scrim.style.transition = `opacity ${ease}`
    scrim.style.opacity = closing ? '0' : ''
    const clear = () => {
      drawer.style.translate = ''
      drawer.style.transition = ''
      scrim.style.opacity = ''
      scrim.style.transition = ''
    }
    drawer.addEventListener('transitionend', clear, { once: true })
    if (closing) onClose()
  }

  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') return
      start.current = { x: e.clientX, y: e.clientY }
      dragging.current = false
      lastDx.current = 0
      recent.current = []
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const s = start.current
      const drawer = drawerRef.current
      const scrim = scrimRef.current
      if (!s || !drawer || !scrim) return
      const moved = e.clientX - s.x
      // Only a mostly sideways move becomes a drag; a vertical one stays a scroll
      if (!dragging.current) {
        if (Math.abs(moved) < 8 || Math.abs(e.clientY - s.y) > Math.abs(moved)) return
        dragging.current = true
      }
      const dx = Math.min(0, moved)
      lastDx.current = dx
      const now = performance.now()
      recent.current = [...recent.current.filter((p) => now - p.t < 100), { dx, t: now }]
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      drawer.style.transition = 'none'
      drawer.style.translate = `${dx}px 0`
      scrim.style.transition = 'none'
      scrim.style.opacity = String(Math.max(0, 1 + dx / drawer.offsetWidth))
    },
    onPointerUp: () => {
      const s = start.current
      const drawer = drawerRef.current
      start.current = null
      if (!s || !drawer || !dragging.current) return
      const dx = lastDx.current
      // Speed over the final 100 ms of the gesture (px per ms); a pause before letting go means no flick
      const now = performance.now()
      const last = recent.current.filter((p) => now - p.t < 100)
      const velocity = last.length > 1 ? (last[0].dx - last[last.length - 1].dx) / Math.max(1, now - last[0].t) : 0
      settle(-dx > drawer.offsetWidth * 0.4 || (dx < -20 && velocity > 0.11))
    },
    onPointerCancel: () => {
      start.current = null
      if (dragging.current) settle(false)
      dragging.current = false
    },
    // After a drag, swallow the click that would otherwise open a link
    onClickCapture: (e: MouseEvent) => {
      if (dragging.current) {
        e.preventDefault()
        e.stopPropagation()
        dragging.current = false
      }
    },
  }
}
