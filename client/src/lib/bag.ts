// The bag, kept in this browser until checkout exists. Each line is one decant size; the server will price
// everything at checkout, so only slug, size and quantity are kept here. The bag panel's open state lives here too,
// so Add to bag anywhere can open it.
import { useSyncExternalStore } from 'react'
import type { ShopListing } from '@shared/types.ts'

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
  /** The shopper's note for the order (a sample they'd like, anything we should know), sent with it at checkout */
  note: string
}

const KEY = 'bag'
const NOTE_KEY = 'bag-note'
/** Longest order note we keep */
export const NOTE_MAX = 500
const listeners = new Set<() => void>()

function read(): BagLine[] {
  try {
    const lines = JSON.parse(localStorage.getItem(KEY) ?? '[]') as BagLine[]
    return Array.isArray(lines) ? lines.filter((l) => l && l.slug && l.sizeMl > 0 && l.qty > 0) : []
  } catch {
    return []
  }
}

function readNote() {
  try {
    return (localStorage.getItem(NOTE_KEY) ?? '').slice(0, NOTE_MAX)
  } catch {
    return ''
  }
}

let state: BagState = { lines: read(), open: false, justAdded: null, handoff: false, note: readNote() }

function set(next: Partial<BagState>) {
  const linesChanged = next.lines && next.lines !== state.lines
  state = { ...state, ...next }
  try {
    if (linesChanged) localStorage.setItem(KEY, JSON.stringify(state.lines))
    if (next.note !== undefined) localStorage.setItem(NOTE_KEY, state.note)
  } catch {
    // Private windows can refuse storage; the bag still works for this visit
  }
  listeners.forEach((l) => l())
}

export const lineKey = (l: { slug: string; sizeMl: number }) => `${l.slug}:${l.sizeMl}`
const find = (slug: string, sizeMl: number) => state.lines.find((l) => l.slug === slug && l.sizeMl === sizeMl)

/**
 * The most of this size the bag can hold.
 * shortcut: each size is capped on its own; sizes poured from the same bottles can together ask for more than is
 * left, and checkout on the server catches that. Upgrade if the API ever sends a shared ml budget (it must not send ml).
 */
export const limitFor = (listing: ShopListing, sizeMl: number) =>
  listing.prices.find((p) => p.sizeMl === sizeMl)?.maxQty ?? 0

/** How many more of this size can go in the bag */
export const roomFor = (listing: ShopListing, sizeMl: number) =>
  Math.max(0, limitFor(listing, sizeMl) - (find(listing.slug, sizeMl)?.qty ?? 0))

/**
 * Adds to the bag (never more than the stock allows) and opens it. Returns how many were added. `handoff` is for
 * quick buy, which closes as the bag opens.
 */
export function addToBag(listing: ShopListing, sizeMl: number, qty: number, handoff = false) {
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

export function setQty(listing: ShopListing, sizeMl: number, qty: number) {
  const capped = Math.max(1, Math.min(qty, limitFor(listing, sizeMl)))
  set({ lines: state.lines.map((l) => (l.slug === listing.slug && l.sizeMl === sizeMl ? { ...l, qty: capped } : l)) })
}

/** Changes a line's size. If that size is already in the bag the two lines join. */
export function setSize(listing: ShopListing, fromMl: number, toMl: number) {
  const line = find(listing.slug, fromMl)
  if (!line || fromMl === toMl) return
  const others = state.lines.filter((l) => l !== line)
  const room = limitFor(listing, toMl)
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

/**
 * Once the catalogue loads: drops lines whose decant or size is gone or sold out, and caps quantities at today's
 * stock, so a bag saved before a restock never counts or checks out what the shop no longer has.
 */
export function reconcile(catalog: ShopListing[]) {
  const lines = state.lines.flatMap((l) => {
    const listing = catalog.find((c) => c.slug === l.slug)
    const max = listing ? limitFor(listing, l.sizeMl) : 0
    return max > 0 ? [{ ...l, qty: Math.min(l.qty, max) }] : []
  })
  const same = lines.length === state.lines.length && lines.every((l, i) => l.qty === state.lines[i].qty)
  if (!same) set({ lines, justAdded: lines.some((l) => lineKey(l) === state.justAdded) ? state.justAdded : null })
}

export const openBag = () => set({ open: true, handoff: false })
export const setNote = (note: string) => set({ note: note.slice(0, NOTE_MAX) })
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
/** The lines right now, outside React (tests) */
export const bagLines = () => state.lines
export const useBagOpen = () => useBagState((s) => s.open)
export const useBagHandoff = () => useBagState((s) => s.handoff)
export const useJustAdded = () => useBagState((s) => s.justAdded)
export const useBagNote = () => useBagState((s) => s.note)
