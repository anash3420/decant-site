import { Link, NavLink } from 'react-router-dom'
import { site } from '../lib/content.ts'
import { LogoMark } from './LogoMark.tsx'
import { AccountIcon, BagIcon, HeartIcon, MenuIcon, SearchIcon } from './icons.tsx'

const NAV = [
  { label: 'New in', to: '/new' },
  { label: 'All decants', to: '/decants' },
  { label: 'Fragrances', to: '/fragrances' },
  { label: 'Houses', to: '/houses' },
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
      {/* Phone: menu, name, bag */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-2 py-1.5 lg:hidden">
        <button type="button" aria-label="Menu" className="flex size-11 items-center justify-center">
          <MenuIcon />
        </button>
        <Wordmark className="min-h-11 justify-center" />
        <Link to="/bag" aria-label="Bag" className="flex size-11 items-center justify-center">
          <BagIcon />
        </Link>
      </div>

      {/* Desktop: one row. Name on the left, the menu in the middle, search and account tools on the right */}
      <div className="hidden h-[84px] grid-cols-[1fr_auto_1fr] items-stretch border-b border-line px-12 lg:grid">
        <Wordmark className="self-center justify-self-start" />
        <nav aria-label="Shop" className="flex gap-9 text-[15px]">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center transition-colors hover:text-wine ${isActive ? 'text-wine shadow-[inset_0_-2px_0_var(--color-wine)]' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-[22px] self-center text-sm">
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
    </header>
  )
}
