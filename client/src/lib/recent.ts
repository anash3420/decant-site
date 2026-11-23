// Decants viewed recently, newest first, kept in this browser only (the fragrance page's "Still on your mind").
import { useSyncExternalStore } from 'react'

const KEY = 'recently-viewed'
const MAX = 12
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const slugs = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(slugs) ? slugs.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

let slugs = read()

function write(next: string[]) {
  slugs = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private windows can refuse storage; the list still works for this visit
  }
  listeners.forEach((l) => l())
}

/** Puts a decant at the front of the list */
export const markViewed = (slug: string) => write([slug, ...slugs.filter((s) => s !== slug)].slice(0, MAX))
export const clearViewed = () => write([])

export const useRecentlyViewed = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => slugs,
    () => slugs,
  )
