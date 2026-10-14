import type { Fragrance, FulfilmentId, ListingKind } from '@shared/types.ts'
import type { LettermailLimits } from '@shared/shipping.ts'

// Public shop API. Same origin in production (Vercel); proxied to the Express server by Vite in dev.

export class ShopApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

/**
 * GETs for the same path that overlap share one network request: React StrictMode's double effects in
 * dev, a tab-focus refresh landing mid-load, or two components asking for the same thing at once.
 * Only in-flight requests are shared; once one settles, the next call fetches fresh data.
 */
const inFlight = new Map<string, Promise<unknown>>()

function request<T>(path: string, init?: { method?: string; json?: unknown }): Promise<T> {
  const isGet = (init?.method ?? (init?.json ? 'POST' : 'GET')) === 'GET'
  if (!isGet) return send<T>(path, init)

  const pending = inFlight.get(path)
  if (pending) return pending as Promise<T>
  const promise = send<T>(path, init).finally(() => inFlight.delete(path))
  inFlight.set(path, promise)
  return promise
}

async function send<T>(path: string, init?: { method?: string; json?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? (init?.json ? 'POST' : 'GET'),
      headers: init?.json ? { 'content-type': 'application/json' } : undefined,
      body: init?.json ? JSON.stringify(init.json) : undefined,
    })
  } catch {
    throw new ShopApiError(0, 'network', 'Can’t reach the shop right now. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error ?? {}
    throw new ShopApiError(res.status, err.code ?? 'error', err.message ?? 'Something went wrong. Please try again.', err.details)
  }
  return data as T
}

export interface ShopSettings {
  ownerFacebookUrl: string
  siteTagline: string
  fulfilment: { id: FulfilmentId; label: string; cost: number; detail: string }[]
  lettermail: LettermailLimits
}

export interface UnavailableLine {
  slug: string
  optionId: string
  reason: 'not_found' | 'insufficient'
  available?: number
}

export interface CreatedInquiry {
  reference: string
  createdAt: string
  status: string
  contact: { name: string; facebook: string }
  fulfilment: { method: FulfilmentId; label: string; cost: number; location?: string }
  notes?: string
  items: { slug: string; nameSnapshot: string; kind: ListingKind; optionId: string; optionLabel: string; qty: number; unitPrice: number }[]
  subtotal: number
  estimatedTotal: number
}

export interface InquiryStatusInfo {
  reference: string
  status: 'new' | 'contacted' | 'confirmed' | 'fulfilled' | 'cancelled'
  updatedAt: string
}

export const fetchCatalog = () => request<{ listings: Fragrance[] }>('/catalog').then((r) => r.listings)
export const fetchListing = (slug: string) => request<{ listing: Fragrance }>(`/catalog/${encodeURIComponent(slug)}`).then((r) => r.listing)
export const fetchSettings = () => request<ShopSettings>('/settings/public')

export const createInquiry = (body: {
  contact: { name: string; facebook: string }
  fulfilment: FulfilmentId
  location?: string
  notes?: string
  items: { slug: string; optionId: string; qty: number }[]
  expectedTotal: number
  website?: string
}) => request<{ inquiry: CreatedInquiry }>('/inquiries', { json: body }).then((r) => r.inquiry)

export const fetchInquiryStatus = (reference: string) =>
  request<InquiryStatusInfo>(`/inquiries/${encodeURIComponent(reference)}/status`)
