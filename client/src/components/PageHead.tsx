import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeadProps {
  /** The page's name in the breadcrumb (desktop) */
  crumb: string
  kicker: string
  title: string
  /** Shown once, as the big outlined number behind the title; leave out while loading */
  count?: number
  /** The italic line under the title */
  lead?: string
  /** A shorter line for phones (defaults to `lead`) */
  phoneLead?: string
  /** Desktop, right of the title after the fine line: an italic note, then a link or chips */
  children?: ReactNode
}

/** A shop page's head: crumb, kicker, title over its count as a big outlined number, and the line to the right */
export function PageHead({ crumb, kicker, title, count, lead, phoneLead = lead, children }: PageHeadProps) {
  return (
    <header className="relative isolate mb-5 lg:mb-10 lg:flex lg:items-end lg:justify-between">
      <div className="relative">
        <nav aria-label="Breadcrumb" className="mb-14 hidden text-[13px] text-muted lg:block">
          <Link to="/" className="hover:text-wine">
            Home
          </Link>
          <span aria-hidden="true" className="mx-1.5 text-[#c9b9b0]">
            /
          </span>
          <span aria-current="page">{crumb}</span>
        </nav>
        <div className="relative">
          <span
            aria-hidden="true"
            className="outline-num -top-[34px] -left-2 text-[120px] lg:-top-[58px] lg:-left-3.5 lg:text-[210px]"
          >
            {count === undefined ? '' : String(count).padStart(2, '0')}
          </span>
          <p className="mb-2.5 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
            Shop
            <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
            {kicker}
          </p>
          <h1 className="font-display text-[40px] leading-none lg:text-[64px]">{title}</h1>
          <p className="mt-2.5 min-h-6 font-display text-base text-quiet italic lg:hidden">{phoneLead}</p>
          <p className="mt-2.5 hidden min-h-[29px] font-display text-[19px] text-quiet italic lg:block">{lead}</p>
        </div>
      </div>

      {children && (
        <div className="mb-3 ml-10 hidden min-w-0 flex-1 items-center gap-[18px] lg:flex">
          <i aria-hidden="true" className="trail-line flex-1" />
          {children}
        </div>
      )}
    </header>
  )
}
