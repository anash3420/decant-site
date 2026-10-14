import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Fragrance } from '@shared/types.ts'
import { fetchCatalog, fetchSettings, ShopApiError, type ShopSettings } from '../api/shop.ts'

/**
 * The whole published catalog (it's small) and the public settings, loaded once and shared.
 * Pages derive rows, categories and brand lists from it, so browsing never waits on the network.
 * It refreshes when the visitor comes back to the tab, so stock doesn't go stale.
 */

interface ShopValue {
  listings: Fragrance[]
  settings: ShopSettings | null
  status: 'loading' | 'ready' | 'error'
  error: ShopApiError | null
  refresh: () => Promise<void>
  getListing: (slug: string) => Fragrance | undefined
  /** Swap in a fresher copy of one listing (e.g. from the detail page's own fetch) */
  upsertListing: (listing: Fragrance) => void
}

const ShopContext = createContext<ShopValue | null>(null)

const REFRESH_AFTER_MS = 60_000

const loadShop = () => Promise.all([fetchCatalog(), fetchSettings()])

export function ShopProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Fragrance[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [status, setStatus] = useState<ShopValue['status']>('loading')
  const [error, setError] = useState<ShopApiError | null>(null)
  const lastLoaded = useRef(0)

  const applyLoaded = useCallback(([l, s]: Awaited<ReturnType<typeof loadShop>>) => {
    setListings(l)
    setSettings(s)
    setStatus('ready')
    setError(null)
    lastLoaded.current = Date.now()
  }, [])

  const applyFailed = useCallback((e: unknown) => {
    setError(e instanceof ShopApiError ? e : new ShopApiError(0, 'error', 'Could not load the shop.'))
    // Keep showing what we had if a background refresh fails
    setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
  }, [])

  const refresh = useCallback(() => loadShop().then(applyLoaded, applyFailed), [applyLoaded, applyFailed])

  useEffect(() => {
    loadShop().then(applyLoaded, applyFailed)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoaded.current > REFRESH_AFTER_MS) void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [applyLoaded, applyFailed, refresh])

  const bySlug = useMemo(() => new Map(listings.map((l) => [l.slug, l])), [listings])
  const getListing = useCallback((slug: string) => bySlug.get(slug), [bySlug])
  const upsertListing = useCallback(
    (listing: Fragrance) =>
      setListings((prev) =>
        prev.some((l) => l.slug === listing.slug)
          ? prev.map((l) => (l.slug === listing.slug ? listing : l))
          : [...prev, listing],
      ),
    [],
  )

  const value = useMemo<ShopValue>(
    () => ({ listings, settings, status, error, refresh, getListing, upsertListing }),
    [listings, settings, status, error, refresh, getListing, upsertListing],
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>')
  return ctx
}
