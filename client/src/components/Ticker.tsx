import { Fragment } from 'react'
import { fill, site } from '../lib/content.ts'
import { Sparkle } from './icons.tsx'

const messages = site.ticker.filter((m) => m.enabled).map((m) => fill(m.text))

/** Scrolling announcement bar. Two identical runs slide by half their width for a seamless loop; hover pauses it. */
export function Ticker() {
  if (!messages.length) return null
  const run = (hidden: boolean) => (
    <div className="flex flex-none items-center" aria-hidden={hidden || undefined}>
      {messages.map((text) => (
        <Fragment key={text}>
          <span className="py-2.5 text-[11px] tracking-[0.12em] whitespace-nowrap text-[#f5e6e9] uppercase lg:py-[11px] lg:text-xs lg:tracking-[0.14em]">
            {text}
          </span>
          <span className="mx-[18px] flex lg:mx-[26px]">
            <Sparkle />
          </span>
        </Fragment>
      ))}
    </div>
  )
  return (
    <div className="ticker" role="region" aria-label="Shop announcements">
      <div className="ticker-fade">
        <div className="ticker-track">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </div>
  )
}
