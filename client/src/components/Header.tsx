import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SITE_NAME } from '../config.ts'
import { useInquiry } from '../context/InquiryContext.tsx'
import { KINDS } from '../lib/catalog.ts'
import SearchBox, { SearchIcon } from './SearchBox.tsx'

const LINKS = [...KINDS.map((k) => ({ to: k.path, label: k.title })), { to: '/history', label: 'History' }]

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `hidden min-h-11 items-center text-sm transition-colors md:inline-flex ${isActive ? 'text-text' : 'text-muted hover:text-text'}`

// Mobile tabs: full 44px height, active one underlined so the current section is obvious
const mobileTab = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 shrink-0 items-center border-b-2 px-1 text-sm whitespace-nowrap transition-colors ${
    isActive ? 'border-accent font-medium text-text' : 'border-transparent text-muted'
  }`

export default function Header() {
  const { count } = useInquiry()
  // Phones and tablets: the search box opens in its own row under the logo
  const [searching, setSearching] = useState(false)
  return (
    <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2 sm:px-8 md:py-3">
        <Link to="/" className="inline-flex min-h-11 min-w-0 items-center gap-2 font-display text-text sm:gap-2.5">
          <img src="/logo-mark.svg" alt="" width="40" height="40" className="size-8 shrink-0 sm:size-10" />
          {/* Phones: the name sits on two short lines beside the seal; under 360px only the seal shows */}
          <span className="max-w-[6.5em] text-[15px] leading-tight max-[359px]:sr-only sm:max-w-none sm:text-2xl sm:leading-normal sm:whitespace-nowrap">
            {SITE_NAME}
          </span>
        </Link>
        <div className="hidden max-w-xs flex-1 lg:block">
          <SearchBox />
        </div>
        <nav aria-label="Main" className="flex items-center gap-2 whitespace-nowrap sm:gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => setSearching((v) => !v)}
            aria-expanded={searching}
            aria-label={searching ? 'Close search' : 'Search fragrances'}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-text lg:hidden"
          >
            <SearchIcon className="size-5" />
          </button>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={desktopLink}>
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/inquiry"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover sm:px-4"
          >
            My inquiry
            {count > 0 && (
              <span className="ml-2 rounded-full bg-on-accent px-1.5 py-0.5 text-xs text-accent tabular-nums">
                <span className="sr-only">, </span>
                {count}
                <span className="sr-only"> items</span>
              </span>
            )}
          </Link>
        </nav>
      </div>

      {searching && (
        <div className="mx-auto max-w-6xl px-5 pb-3 sm:px-8 lg:hidden">
          <SearchBox autoFocus onDone={() => setSearching(false)} />
        </div>
      )}

      {/* Phones and small tablets: section tabs on their own swipeable row */}
      <nav aria-label="Sections" className="md:hidden">
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 sm:px-8">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={mobileTab}>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}
