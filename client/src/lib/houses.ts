// The houses the shop lists: only those with decants, each with its type and "from" price.
import { fromOption, isSoldOut } from '@shared/shop.ts'
import { normalize } from '@shared/search.ts'
import type { ShopListing } from '@shared/types.ts'
import type { Brand } from '../api/shop.ts'
import { typeOf } from './filters.ts'

export interface House {
  brand: Brand
  listings: ShopListing[]
  type: string
  from: number
  letter: string
}

/** Houses that have decants, A to Z, each with its type (the most common among its decants) and "from" price */
export function housesOf(brands: Brand[], catalog: ShopListing[]): House[] {
  return brands
    .flatMap((brand) => {
      const listings = catalog.filter((l) => l.brandSlug === brand.slug)
      if (listings.length === 0) return []
      const counts = new Map<string, number>()
      for (const l of listings) counts.set(typeOf(l), (counts.get(typeOf(l)) ?? 0) + 1)
      const type = [...counts].sort((a, b) => b[1] - a[1])[0][0]
      const inStock = listings.filter((l) => !isSoldOut(l))
      const from = Math.min(...(inStock.length ? inStock : listings).map((l) => fromOption(l).price))
      const first = normalize(brand.name).charAt(0).toUpperCase()
      return [{ brand, listings, type, from, letter: /[A-Z]/.test(first) ? first : '#' }]
    })
    .sort((a, b) => a.brand.name.localeCompare(b.brand.name))
}
