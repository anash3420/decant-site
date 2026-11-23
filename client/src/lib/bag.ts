// The bag, kept in this browser until checkout exists. Each line is one decant size; the server will price
// everything at checkout, so only slug, size and quantity are kept here. The bag panel's open state lives here too,
// so Add to bag anywhere can open it.
import { useSyncExternalStore } from 'react'
import type { DecantListing } from '@shared/types.ts'
import { maxQty } from '@shared/stock.ts'

export interface BagLine {
  slug: string
  sizeMl: number
  qty: number
}

interface BagState {
  lines: BagLine[]
  open: boolean
  /** The line added most recently in this visit, marked "Just added" */
  justAdded: string | null
  /** Opened or closed as a hand-over from quick buy (or to it), so the dimmed page stays steady instead of fading */
  handoff: boolean
}

const KEY = 'bag'
const listeners = new Set<() => void>()

function read(): BagLine[] {
  try {
    const lines = JSON.parse(localStorage.getItem(KEY) ?? '[]') as BagLine[]
    return Array.isArray(lines) ? lines.filter((l) => l && l.slug && l.sizeMl > 0 && l.qty > 0) : []
  } catch {
    return []
  }
}

let state: BagState = { lines: read(), open: false, justAdded: null, handoff: false }

function set(next: Partial<BagState>) {
  const linesChanged = next.lines && next.lines !== state.lines
  state = { ...state, ...next }
  if (linesChanged) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.lines))
    } catch {
      // Private windows can refuse storage; the bag still works for this visit
    }
  }
  listeners.forEach((l) => l())
}

export const lineKey = (l: { slug: string; sizeMl: number }) => `${l.slug}:${l.sizeMl}`
const optionId = (sizeMl: number) => `${sizeMl}ml`
const asItems = (lines: BagLine[]) => lines.map((l) => ({ slug: l.slug, optionId: optionId(l.sizeMl), qty: l.qty }))
const find = (slug: string, sizeMl: number) => state.lines.find((l) => l.slug === slug && l.sizeMl === sizeMl)

/** The most of this size the bag can hold, given the stock and the other sizes of it already in the bag */
export function limitFor(listing: DecantListing, sizeMl: number) {
  return maxQty(listing, optionId(sizeMl), asItems(state.lines))
}

/** How many more of this size can go in the bag */
export const roomFor = (listing: DecantListing, sizeMl: number) =>
  Math.max(0, limitFor(listing, sizeMl) - (find(listing.slug, sizeMl)?.qty ?? 0))

/**
 * Adds to the bag (never more than the stock allows) and opens it. Returns how many were added. `handoff` is for
 * quick buy, which closes as the bag opens.
 */
export function addToBag(listing: DecantListing, sizeMl: number, qty: number, handoff = false) {
  const added = Math.min(qty, roomFor(listing, sizeMl))
  if (added <= 0) return 0
  const existing = find(listing.slug, sizeMl)
  // The newest line goes on top
  const lines = existing
    ? [{ ...existing, qty: existing.qty + added }, ...state.lines.filter((l) => l !== existing)]
    : [{ slug: listing.slug, sizeMl, qty: added }, ...state.lines]
  set({ lines, open: true, justAdded: lineKey({ slug: listing.slug, sizeMl }), handoff })
  return added
}

export function setQty(listing: DecantListing, sizeMl: number, qty: number) {
  const capped = Math.max(1, Math.min(qty, limitFor(listing, sizeMl)))
  set({ lines: state.lines.map((l) => (l.slug === listing.slug && l.sizeMl === sizeMl ? { ...l, qty: capped } : l)) })
}

/** Changes a line's size. If that size is already in the bag the two lines join. */
export function setSize(listing: DecantListing, fromMl: number, toMl: number) {
  const line = find(listing.slug, fromMl)
  if (!line || fromMl === toMl) return
  const others = state.lines.filter((l) => l !== line)
  const room = maxQty(listing, optionId(toMl), asItems(others))
  const target = others.find((l) => l.slug === listing.slug && l.sizeMl === toMl)
  const qty = Math.min(line.qty + (target?.qty ?? 0), room)
  if (qty <= 0) return
  const moved = { slug: listing.slug, sizeMl: toMl, qty }
  const lines = state.lines.flatMap((l) => (l === line ? [moved] : l === target ? [] : [l]))
  const key = lineKey(line)
  set({ lines, justAdded: state.justAdded === key ? lineKey(moved) : state.justAdded })
}

export function removeLine(slug: string, sizeMl: number) {
  set({ lines: state.lines.filter((l) => !(l.slug === slug && l.sizeMl === sizeMl)) })
}

export const openBag = () => set({ open: true, handoff: false })
export const closeBag = () => set({ open: false, justAdded: null, handoff: false })
/** Closes the bag because quick buy is opening over it */
export const handOffBag = () => set({ open: false, justAdded: null, handoff: true })

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const useBagState = <T>(pick: (s: BagState) => T) =>
  useSyncExternalStore(
    subscribe,
    () => pick(state),
    () => pick(state),
  )

/** Number of decants in the bag, for "Bag (n)" */
export const useBagCount = () => useBagState((s) => s.lines.reduce((n, l) => n + l.qty, 0))
export const useBagLines = () => useBagState((s) => s.lines)
export const useBagOpen = () => useBagState((s) => s.open)
export const useBagHandoff = () => useBagState((s) => s.handoff)
export const useJustAdded = () => useBagState((s) => s.justAdded)
