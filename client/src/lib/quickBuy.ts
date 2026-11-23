// Which decant the quick-buy drawer shows. Any card can open it; the drawer itself is mounted once in the layout.
import { useSyncExternalStore } from 'react'
import type { ShopListing } from '@shared/types.ts'

interface QuickBuyState {
  open: boolean
  /** Kept after closing so the drawer can slide out with its content */
  listing: ShopListing | null
  /** Counts openings, so each one starts with a fresh size, quantity and button */
  opened: number
  /** Opened from the bag or closed into it, so the dimmed page stays steady instead of fading */
  handoff: boolean
}

let state: QuickBuyState = { open: false, listing: null, opened: 0, handoff: false }
const listeners = new Set<() => void>()

function set(next: QuickBuyState) {
  state = next
  listeners.forEach((l) => l())
}

export const openQuickBuy = (listing: ShopListing, handoff = false) =>
  set({ open: true, listing, opened: state.opened + 1, handoff })
export const closeQuickBuy = () => set({ ...state, open: false, handoff: false })
/** Closes quick buy because the bag is opening in its place */
export const handOffQuickBuy = () => set({ ...state, open: false, handoff: true })

export function useQuickBuy() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state,
  )
}
