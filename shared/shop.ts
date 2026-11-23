// What shoppers see of a decant. The server turns each listing into a ShopListing before sending it, so bottles
// (ml left, batch codes, costs) never reach the browser; the shop works only from these per-size limits.
import type { DecantListing, ShopListing } from './types.ts'
import { remainingMl } from './stock.ts'

/** The most of one size a shopper can add. Capped so the number never gives away how much is left in a bottle. */
export const MAX_PER_SIZE = 10

/** For the API: the listing without its bottles, each size carrying the most a shopper can add */
export function toShopListing(l: DecantListing): ShopListing {
  const ml = remainingMl(l)
  // Fields copied one by one, so admin-only fields on the stored listing can't slip through
  return {
    slug: l.slug,
    kind: 'decant',
    name: l.name,
    house: l.house,
    brandSlug: l.brandSlug,
    category: l.category,
    concentration: l.concentration,
    year: l.year,
    gender: l.gender,
    accords: l.accords,
    notes: l.notes,
    description: l.description,
    tint: l.tint,
    photos: l.photos,
    addedAt: l.addedAt,
    prices: l.prices.map((p) => ({
      sizeMl: p.sizeMl,
      price: p.price,
      maxQty: Math.min(MAX_PER_SIZE, Math.floor(ml / p.sizeMl)),
    })),
  }
}

export interface ShopOption {
  /** "5ml" */
  id: string
  sizeMl: number
  price: number
  maxQty: number
  available: boolean
}

export const getOptions = (l: ShopListing): ShopOption[] =>
  l.prices.map((p) => ({ id: `${p.sizeMl}ml`, ...p, available: p.maxQty > 0 }))

export const isSoldOut = (l: ShopListing) => !l.prices.some((p) => p.maxQty > 0)

/** The cheapest size in stock (the cheapest overall when sold out), for "From $X for N ml" */
export function fromOption(l: ShopListing): ShopOption {
  const options = getOptions(l)
  const inStock = options.filter((o) => o.available)
  return (inStock.length ? inStock : options).reduce((a, b) => (b.price < a.price ? b : a))
}
