import { Link, NavLink } from 'react-router-dom'
import { SITE_NAME } from '../config.ts'
import { useInquiry } from '../context/InquiryContext.tsx'
import { KINDS } from '../lib/catalog.ts'

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
  return (
    <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 sm:px-8 md:py-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center font-display text-xl whitespace-nowrap text-text sm:text-2xl"
        >
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 whitespace-nowrap">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={desktopLink}>
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/inquiry"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
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
