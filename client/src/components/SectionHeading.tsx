import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from './icons.tsx'

interface SectionHeadingProps {
  /** The big outlined number behind the title (the only place the number shows) */
  index: string
  kicker: string
  title: string
  /** Desktop only, under the title */
  description?: string
  /** The italic line in the space to the right (under the title on phones). Don't repeat the title's information. */
  note: string
  link?: { label: string; to: string }
  /** In place of the link, e.g. a button */
  action?: ReactNode
  id?: string
}

/** Atelier-light section heading: outlined number behind, kicker, title, and a fine line ending in a link */
export function SectionHeading({ index, kicker, title, description, note, link, action, id }: SectionHeadingProps) {
  return (
    <div className="relative isolate mb-[18px] lg:mb-[22px] lg:flex lg:items-end lg:justify-between">
      <div className="relative">
        <span
          aria-hidden="true"
          className="outline-num -top-10 -left-2 text-[120px] lg:-top-[86px] lg:-left-3.5 lg:text-[210px]"
        >
          {index}
        </span>
        <p className="mb-2.5 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
          <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
          {kicker}
        </p>
        <h2 id={id} className="font-display text-[34px] leading-[1.05] lg:text-[44px]">
          {title}
        </h2>
        {description && <p className="mt-1.5 hidden text-muted lg:block">{description}</p>}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 lg:mt-0 lg:mb-3 lg:ml-10 lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:gap-[18px]">
        <em className="basis-full font-display text-base whitespace-nowrap text-quiet lg:order-2 lg:basis-auto lg:text-[19px]">
          {note}
        </em>
        <i aria-hidden="true" className="trail-line mt-1 flex-1 lg:order-1 lg:mt-0" />
        {action}
        {link && (
          <Link
            to={link.to}
            className="mt-1 flex min-h-11 items-center gap-1 text-[15px] whitespace-nowrap text-wine lg:order-3 lg:mt-0 lg:min-h-0 lg:link-line lg:pb-0.5"
          >
            {link.label}
            <ChevronRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}
