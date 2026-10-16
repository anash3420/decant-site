import type { Fragrance } from './types.ts'

/** Lowercase without accents, so "parfums" finds "Parfums" and "imperial" finds "Impérial" */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const words = (q: string) => normalize(q).split(/\s+/).filter(Boolean)

/**
 * Listings whose house or name contain every word of the query, best matches first:
 * names starting with the query, then houses starting with it, then anything else; in-stock before sold out.
 */
export function searchListings<T extends Pick<Fragrance, 'house' | 'name'>>(
  listings: T[],
  query: string,
  isSoldOut: (f: T) => boolean = () => false,
): T[] {
  const terms = words(query)
  if (!terms.length) return []
  const q = terms.join(' ')
  const rank = (f: T) => {
    const name = normalize(f.name)
    const house = normalize(f.house)
    return (name.startsWith(q) ? 0 : house.startsWith(q) ? 1 : 2) + (isSoldOut(f) ? 3 : 0)
  }
  return listings
    .filter((f) => {
      const text = normalize(`${f.house} ${f.name}`)
      return terms.every((t) => text.includes(t))
    })
    .map((f) => ({ f, r: rank(f) }))
    .sort((a, b) => a.r - b.r || a.f.house.localeCompare(b.f.house) || a.f.name.localeCompare(b.f.name))
    .map(({ f }) => f)
}
