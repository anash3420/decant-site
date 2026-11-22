// Hearted decants, kept in this browser until accounts exist. Components subscribe to one slug each, so hearting a
// card re-renders only that card's button.
import { useCallback, useSyncExternalStore } from 'react'

const KEY = 'wishlist'
const listeners = new Set<() => void>()

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

let saved = read()

function toggle(slug: string) {
  const next = new Set(saved)
  if (next.has(slug)) next.delete(slug)
  else next.add(slug)
  saved = next
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // Private windows can refuse storage; the heart still works for this visit
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWishlisted(slug: string) {
  const isSaved = useSyncExternalStore(
    subscribe,
    () => saved.has(slug),
    () => false,
  )
  return [isSaved, useCallback(() => toggle(slug), [slug])] as const
}
