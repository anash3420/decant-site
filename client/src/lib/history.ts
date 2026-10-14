import type { FulfilmentId, ListingKind } from '@shared/types.ts'

// Sent inquiries live in this browser only. In epic 3 the server becomes the source of truth
// and this list can be refreshed by reference for status updates.
const STORAGE_KEY = 'decants:history'

export interface SentInquiryItem {
  slug: string
  nameSnapshot: string
  kind: ListingKind
  optionId: string
  optionLabel: string
  qty: number
  priceSnapshot: number
}

export interface SentInquiry {
  reference: string
  createdAt: string
  contact: { name: string; facebook: string }
  fulfilment: FulfilmentId
  fulfilmentLabel: string
  shippingCost: number
  location?: string
  notes?: string
  items: SentInquiryItem[]
  subtotal: number
  estimatedTotal: number
}

export function loadHistory(): SentInquiry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as SentInquiry[]) : []
    return Array.isArray(parsed) ? parsed.filter((i) => i?.reference && Array.isArray(i.items)) : []
  } catch {
    return []
  }
}

function write(list: SentInquiry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/** Newest first. Returns false if the browser blocked storage. */
export const saveToHistory = (inquiry: SentInquiry) => write([inquiry, ...loadHistory()])

export const removeFromHistory = (reference: string) => write(loadHistory().filter((i) => i.reference !== reference))

export const clearHistory = () => write([])
