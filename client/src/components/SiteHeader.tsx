import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../lib/content.ts'
import { LogoMark } from './LogoMark.tsx'
import { MegaMenu, type MenuKey } from './MegaMenu.tsx'
import { PhoneMenu } from './PhoneMenu.tsx'
import { AccountIcon, BagIcon, HeartIcon, MenuIcon, SearchIcon } from './icons.tsx'

const NAV: { label: string; to: string; menu?: MenuKey }[] = [
  { label: 'New in', to: '/new', menu: 'new' },
  { label: 'All decants', to: '/decants', menu: 'decants' },
  { label: 'Fragrances', to: '/fragrances', menu: 'fragrances' },
  { label: 'Houses', to: '/houses', menu: 'houses' },
]

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 text-wine lg:gap-3 ${className}`}>
      <LogoMark size={30} />
      <span className="font-display text-xl whitespace-nowrap text-ink lg:text-2xl">{site.shopName}</span>
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="relative z-20 bg-white">
      <PhoneBar />
      <DesktopBar />
    </header>
  )
}

/**
 * Desktop: one row. Name on the left, the menu in the middle, search and account tools on the right. Hovering (or
 * focusing) All decants, Fragrances or Houses opens its full-width panel under the header and dims the page.
 * Its own component, so opening a menu doesn't re-render the phone header.
 */
function DesktopBar() {
  const [open, setOpenState] = useState<MenuKey | null>(null)
  // The last menu shown: it stays on screen while the panel fades out after closing
  const [shown, setShown] = useState<MenuKey | null>(null)
  const setOpen = (menu: MenuKey | null) => {
    setOpenState(menu)
    if (menu) setShown(menu)
  }
  const navRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const { pathname } = useLocation()
  const timer = useRef<number | undefined>(undefined)
  const cancel = () => window.clearTimeout(timer.current)
  // A short delay before the first open, so sweeping the mouse across the nav doesn't flash menus; switching
  // between menus once one is open is immediate. Leaving closes after a beat, so a diagonal move into the panel
  // doesn't close it.
  const hoverItem = (menu: MenuKey | null) => {
    cancel()
    timer.current = window.setTimeout(() => setOpen(menu), open ? 0 : 90)
  }
  const leave = () => {
    cancel()
    timer.current = window.setTimeout(() => setOpen(null), 160)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpenState(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  useEffect(() => cancel, [])

  // One underline that slides between nav items: under the open menu's item, or else the current page's item.
  // Moved directly on the element (no re-render). It fades in where it first appears instead of sliding there.
  useLayoutEffect(() => {
    const bar = barRef.current
    const nav = navRef.current
    if (!bar || !nav) return
    const target = NAV.find((n) => (open ? n.menu === open : pathname.startsWith(n.to)))
    const link = target && nav.querySelector<HTMLElement>(`a[href="${target.to}"]`)
    if (!link) {
      bar.style.opacity = '0'
      return
    }
    // Appearing: only fade in where it is. Already showing: slide (the stylesheet transition)
    const wasHidden = bar.style.opacity !== '1'
    bar.style.transition = wasHidden ? 'opacity 150ms var(--ease-out)' : ''
    bar.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth})`
    bar.style.opacity = '1'
  }, [open, pathname])

  return (
    <div
      className="relative hidden lg:block"
      onMouseEnter={cancel}
      onMouseLeave={leave}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(null)
      }}
    >
      <div className="grid h-[84px] grid-cols-[1fr_auto_1fr] items-stretch border-b border-line px-12">
        <Wordmark className="self-center justify-self-start" />
        <nav ref={navRef} aria-label="Shop" className="relative flex gap-9 text-[15px]">
          <span
            ref={barRef}
            aria-hidden="true"
            className="nav-bar pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-wine opacity-0"
          />
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-expanded={item.menu ? open === item.menu : undefined}
              onMouseEnter={() => hoverItem(item.menu ?? null)}
              onFocus={() => setOpen(item.menu ?? null)}
              onClick={() => setOpen(null)}
              className={({ isActive }) =>
                `flex items-center transition-colors hover:text-wine ${isActive || (item.menu && open === item.menu) ? 'text-wine' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div
          className="flex items-center justify-end gap-[22px] self-center text-sm"
          onMouseEnter={() => hoverItem(null)}
        >
          {/* Opens a search panel from the top; the panel is designed later */}
          <button type="button" aria-label="Search" className="transition-colors hover:text-wine">
            <SearchIcon />
          </button>
          <Link to="/account" aria-label="Account" className="transition-colors hover:text-wine">
            <AccountIcon />
          </Link>
          <Link to="/wishlist" aria-label="Wishlist" className="transition-colors hover:text-wine">
            <HeartIcon />
          </Link>
          <Link to="/bag" className="flex items-center gap-1.5 transition-colors hover:text-wine">
            <BagIcon />
            Bag
          </Link>
        </div>
      </div>

      {shown && (
        <>
          {/* Dims the page below; lets the pointer through, so moving onto the page closes the menu */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-full h-screen bg-[rgb(20_8_12/0.42)] ${open ? 'animate-[fade-in_200ms_ease-out_both]' : 'animate-[fade-out_150ms_ease-out_forwards]'}`}
          />
          <div
            className={`absolute inset-x-0 top-full ${open ? '' : 'pointer-events-none animate-menu-out'}`}
            // Closing: once the fade-out ends, take the panel away
            onAnimationEnd={(e) => {
              if (e.animationName === 'menu-out') setShown(null)
            }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a')) setOpen(null)
            }}
          >
            <MegaMenu menu={open ?? shown} />
          </div>
        </>
      )}
    </div>
  )
}

/** Phone: menu, name, bag. The menu button opens the drawer; closing it puts focus back on the button. */
function PhoneBar() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])
  return (
    <>
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-2 py-1.5 lg:hidden">
        <button
          ref={buttonRef}
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
        >
          <MenuIcon />
        </button>
        <Wordmark className="min-h-11 justify-center" />
        <Link
          to="/bag"
          aria-label="Bag"
          className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
        >
          <BagIcon />
        </Link>
      </div>
      <PhoneMenu open={open} onClose={close} />
    </>
  )
}
