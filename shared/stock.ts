import type { DecantListing, Fragrance, InquiryItem } from './types.ts'

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n)

/** Something a visitor can put in their inquiry: a decant size, a vial, or the bottle */
export interface Option {
  id: string
  label: string
  detail?: string
  price: number
  available: boolean
  /** ml per unit: decant size or vial size (not set for full bottles) */
  sizeMl?: number
}

export const remainingMl = (f: DecantListing) => f.bottles.reduce((sum, b) => sum + b.remainingMl, 0)

export function getOptions(f: Fragrance): Option[] {
  switch (f.kind) {
    case 'decant':
      return f.prices.map((p) => ({
        id: `${p.sizeMl}ml`,
        label: `${p.sizeMl}ml`,
        price: p.price,
        sizeMl: p.sizeMl,
        available: remainingMl(f) >= p.sizeMl,
      }))
    case 'catch-release':
      return f.vials.map((v) => ({
        id: v.id,
        label: `${v.sizeMl}ml ${v.format}`,
        sizeMl: v.sizeMl,
        detail: v.note,
        price: v.price,
        available: v.qty > 0,
      }))
    case 'full-bottle':
      return [
        {
          id: 'bottle',
          label: `${f.bottleSizeMl}ml bottle`,
          detail: `~${f.fillPercent}% full · ${f.hasBox ? 'with box' : 'no box'}`,
          price: f.price,
          available: !f.sold,
        },
      ]
  }
}

export const getOption = (f: Fragrance, optionId: string) => getOptions(f).find((o) => o.id === optionId)

/** How many of an option can be requested in total, accounting for other lines in the inquiry */
export function maxQty(f: Fragrance, optionId: string, items: InquiryItem[]): number {
  const option = getOption(f, optionId)
  if (!option?.available) return 0
  switch (f.kind) {
    case 'decant': {
      const usedElsewhere = items
        .filter((i) => i.slug === f.slug && i.optionId !== optionId)
        .reduce((sum, i) => sum + (getOption(f, i.optionId)?.sizeMl ?? 0) * i.qty, 0)
      return Math.max(0, Math.floor((remainingMl(f) - usedElsewhere) / option.sizeMl!))
    }
    case 'catch-release':
      return f.vials.find((v) => v.id === optionId)?.qty ?? 0
    case 'full-bottle':
      return 1
  }
}

export const isSoldOut = (f: Fragrance) => !getOptions(f).some((o) => o.available)

/** Cheapest available option (or cheapest overall when sold out), for "From $X" labels */
export function fromOption(f: Fragrance): Option {
  const options = getOptions(f)
  const pool = options.some((o) => o.available) ? options.filter((o) => o.available) : options
  return pool.reduce((min, o) => (o.price < min.price ? o : min), pool[0])
}
