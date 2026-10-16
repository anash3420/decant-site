import type { Concentration, FragranceCategory } from '@shared/types.ts'

// Admin API client. Session lives in an HttpOnly cookie the browser sends automatically.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }

  /** Field → first message, from the server's zod errors */
  get fieldErrors(): Record<string, string> {
    const fe = (this.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors ?? {}
    return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0] ?? 'Invalid']))
  }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn
}

type Init = { method?: string; json?: unknown; body?: Blob; contentType?: string }

// Overlapping GETs for the same path share one request (see the same idea in api/shop.ts)
const inFlight = new Map<string, Promise<unknown>>()

export function api<T>(path: string, init: Init = {}): Promise<T> {
  const isGet = (init.method ?? (init.json !== undefined || init.body ? 'POST' : 'GET')) === 'GET'
  if (!isGet) return send<T>(path, init)
  const pending = inFlight.get(path)
  if (pending) return pending as Promise<T>
  const promise = send<T>(path, init).finally(() => inFlight.delete(path))
  inFlight.set(path, promise)
  return promise
}

async function send<T>(path: string, init: Init): Promise<T> {
  const headers: Record<string, string> = {}
  if (init.json !== undefined) headers['content-type'] = 'application/json'
  if (init.contentType) headers['content-type'] = init.contentType

  let res: Response
  try {
    res = await fetch(`/api/admin${path}`, {
      method: init.method ?? (init.json !== undefined || init.body ? 'POST' : 'GET'),
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'network', 'Can’t reach the server. Check your connection.')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error ?? {}
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized?.()
    throw new ApiError(res.status, err.code ?? 'error', err.message ?? `Request failed (${res.status})`, err.details)
  }
  return data as T
}

// ── Shapes returned by the admin API ──────────────────────────────────────────

export type Kind = 'decant' | 'catch-release' | 'full-bottle'
export type ListingStatus = 'draft' | 'published' | 'archived'
export type InquiryStatus = 'new' | 'contacted' | 'confirmed' | 'fulfilled' | 'cancelled'

export interface Photo {
  _id?: string
  url: string
  pathname?: string
  width?: number
  height?: number
  label: string
  order: number
}

export interface AdminListing {
  id: string
  slug: string
  kind: Kind
  status: ListingStatus
  listingNote: string
  addedAt: string
  photos: Photo[]
  fragrance: { id: string; name: string; slug: string; tint: string; brand: { name: string; slug: string } } | null
  openInquiries?: number
  // decant
  bottles?: { _id?: string; sizeMl: number; remainingMl: number; batchCode?: string; costPaid?: number }[]
  prices?: { sizeMl: number; price: number }[]
  // catch & release
  vials?: {
    _id?: string
    sizeMl: number
    format: string
    price: number
    qty: number
    note?: string
    sourcedFrom?: string
    costPaid?: number
  }[]
  // full bottle
  bottleSizeMl?: number
  fillPercent?: number
  hasBox?: boolean
  condition?: string
  price?: number
  sold?: boolean
  costPaid?: number
}

export interface AdminFragrance {
  id: string
  slug: string
  name: string
  brand: { id: string; name: string; slug: string } | null
  concentration: Concentration
  year: number | null
  gender: 'Feminine' | 'Masculine' | 'Unisex'
  category: FragranceCategory
  accords: string[]
  notes: { top: string[]; heart: string[]; base: string[] }
  description: string
  tint: string
  listingCount?: number
}

export interface AdminBrand {
  id: string
  name: string
  slug: string
  fragranceCount: number
}

export interface InquirySummary {
  id: string
  reference: string
  createdAt: string
  status: InquiryStatus
  name: string
  facebook: string
  fulfilment: string
  itemCount: number
  itemNames: string[]
  estimatedTotal: number
}

export interface AdminInquiry {
  id: string
  reference: string
  createdAt: string
  updatedAt: string
  status: InquiryStatus
  nextStatuses: InquiryStatus[]
  contact: { name: string; facebook: string }
  fulfilment: { method: string; label: string; cost: number; location?: string }
  notes?: string
  items: {
    listingId: string
    kind: Kind
    slug: string
    nameSnapshot: string
    optionLabel: string
    qty: number
    unitPrice: number
  }[]
  subtotal: number
  estimatedTotal: number
  statusHistory: { status: InquiryStatus; at: string; note?: string }[]
  adminNotes: string
  stockHeld: boolean
  /** Sent while stock deduction was off (test mode), so no stock was ever held */
  stockSkipped: boolean
}

export interface AdminSettings {
  ownerFacebookUrl: string
  siteTagline: string
  fulfilment: {
    id: 'pickup' | 'lettermail' | 'tracked'
    label: string
    cost: number
    detail: string
    enabled: boolean
  }[]
  lettermail: { maxDecantMl: number; maxCatchReleaseMl: number }
  /** Off = test mode: inquiries don't deduct stock */
  deductStock: boolean
}

export interface AdminStats {
  inquiries: Record<InquiryStatus, number>
  openValue: number
  fulfilledLast30Days: { count: number; total: number }
  lowStock: { id: string; name: string; kind: Kind; detail: string }[]
}
