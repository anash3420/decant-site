import type { Fragrance } from './types.ts'
import type { Option } from './stock.ts'

// Lettermail limits: small, flat parcels only. Anything bigger has to be picked up or sent tracked.
// Defaults here; the server's settings document can override them.
export interface LettermailLimits {
  maxDecantMl: number
  maxCatchReleaseMl: number
}

export const DEFAULT_LETTERMAIL_LIMITS: LettermailLimits = { maxDecantMl: 10, maxCatchReleaseMl: 20 }

interface Line {
  f: Fragrance
  option: Option
  item: { qty: number }
}

/** Why lettermail can't be used for these lines, or null if it can */
export function lettermailBlockedReason(lines: Line[], limits = DEFAULT_LETTERMAIL_LIMITS): string | null {
  if (lines.some((l) => l.f.kind === 'full-bottle')) return 'Full bottles ship tracked or are picked up.'

  const bigDecant = lines.find((l) => l.f.kind === 'decant' && (l.option.sizeMl ?? 0) > limits.maxDecantMl)
  if (bigDecant)
    return `Decants over ${limits.maxDecantMl}ml (your ${bigDecant.option.sizeMl}ml ${bigDecant.f.name}) ship tracked.`

  const catchReleaseMl = lines
    .filter((l) => l.f.kind === 'catch-release')
    .reduce((sum, l) => sum + (l.option.sizeMl ?? 0) * l.item.qty, 0)
  if (catchReleaseMl > limits.maxCatchReleaseMl)
    return `Catch & Release over ${limits.maxCatchReleaseMl}ml in total (you have ${catchReleaseMl}ml) ships tracked.`

  return null
}
