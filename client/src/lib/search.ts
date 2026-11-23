// The search panel: open from the header's search icon or the phone menu, mounted once in the layout. Matching and
// highlighting live here too, so they can be tested without React.
import { useSyncExternalStore } from 'react'
import type { ShopListing } from '@shared/types.ts'
import { normalize, searchListings } from '@shared/search.ts'
import { isSoldOut } from '@shared/shop.ts'

let open = false
const listeners = new Set<() => void>()
const set = (next: boolean) => {
  open = next
  listeners.forEach((l) => l())
}

export const openSearch = () => set(true)
export const closeSearch = () => set(false)
export const useSearchOpen = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
    () => open,
  )

const words = (q: string) => normalize(q).split(/\s+/).filter(Boolean)
/** Every word of the query starts a word of the text ("am" suggests Amber, not Mind Games) */
const startsWords = (text: string, terms: string[]) => {
  const parts = words(text)
  return terms.every((t) => parts.some((p) => p.startsWith(t)))
}

export interface Suggestion {
  kind: 'house' | 'accord'
  label: string
  /** For a house, its slug; for an accord, the accord */
  value: string
  count: number
}

/** What the panel shows for a query: matching houses and accords, then the decants (best first) */
export function search(catalog: ShopListing[], query: string) {
  const terms = words(query)
  if (!terms.length) return { suggestions: [] as Suggestion[], decants: [] as ShopListing[] }
  const houses = new Map<string, Suggestion>()
  const accords = new Map<string, Suggestion>()
  for (const l of catalog) {
    if (startsWords(l.house, terms)) {
      const h = houses.get(l.brandSlug) ?? { kind: 'house', label: l.house, value: l.brandSlug, count: 0 }
      houses.set(l.brandSlug, { ...h, count: h.count + 1 })
    }
    for (const a of l.accords) {
      if (!startsWords(a, terms)) continue
      const s = accords.get(a) ?? { kind: 'accord', label: a, value: a, count: 0 }
      accords.set(a, { ...s, count: s.count + 1 })
    }
  }
  const byCount = (a: Suggestion, b: Suggestion) => b.count - a.count || a.label.localeCompare(b.label)
  return {
    suggestions: [
      ...[...houses.values()].sort(byCount).slice(0, 3),
      ...[...accords.values()].sort(byCount).slice(0, 3),
    ],
    decants: searchListings(catalog, query, isSoldOut),
  }
}

/**
 * Splits text into plain and matched parts for each word of the query, ignoring case and accents
 * ("imp" marks "Imp" in "Impérial"), so the match can be underlined.
 */
export function highlight(text: string, query: string): { text: string; match: boolean }[] {
  const terms = words(query)
  // One normalised letter per original letter, so positions line up
  const plain = [...text].map((c) => normalize(c) || c).join('')
  const marked = new Array<boolean>(plain.length).fill(false)
  for (const t of terms) {
    const at = plain.indexOf(t)
    if (at >= 0) marked.fill(true, at, at + t.length)
  }
  const chars = [...text]
  const parts: { text: string; match: boolean }[] = []
  chars.forEach((c, i) => {
    const last = parts.at(-1)
    if (last && last.match === marked[i]) last.text += c
    else parts.push({ text: c, match: marked[i] })
  })
  return parts
}
