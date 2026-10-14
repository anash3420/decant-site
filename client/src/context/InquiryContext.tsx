import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InquiryItem } from '@shared/types.ts'

const STORAGE_KEY = 'decants:inquiry'

interface InquiryContextValue {
  items: InquiryItem[]
  count: number
  add: (slug: string, optionId: string, qty: number) => void
  setQty: (slug: string, optionId: string, qty: number) => void
  remove: (slug: string, optionId: string) => void
  clear: () => void
  /** Keep only lines that pass; used to drop listings that were removed from the shop */
  retain: (keep: (item: InquiryItem) => boolean) => void
}

const InquiryContext = createContext<InquiryContextValue | null>(null)

function load(): InquiryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as InquiryItem[]) : []
    // Drop lines from older formats; lines for listings that no longer exist are pruned once the catalog loads
    return parsed.filter((i) => typeof i.slug === 'string' && typeof i.optionId === 'string' && i.qty > 0)
  } catch {
    return []
  }
}

const same = (i: InquiryItem, slug: string, optionId: string) => i.slug === slug && i.optionId === optionId

export function InquiryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InquiryItem[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage unavailable (private mode); the inquiry just won't persist
    }
  }, [items])

  // Actions only use the setter, so they're created once and stay stable for effects that depend on them
  const actions = useMemo(
    () => ({
      add: (slug: string, optionId: string, qty: number) =>
        setItems((prev) =>
          prev.some((i) => same(i, slug, optionId))
            ? prev.map((i) => (same(i, slug, optionId) ? { ...i, qty: i.qty + qty } : i))
            : [...prev, { slug, optionId, qty }],
        ),
      setQty: (slug: string, optionId: string, qty: number) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => !same(i, slug, optionId))
            : prev.map((i) => (same(i, slug, optionId) ? { ...i, qty } : i)),
        ),
      remove: (slug: string, optionId: string) => setItems((prev) => prev.filter((i) => !same(i, slug, optionId))),
      clear: () => setItems([]),
      retain: (keep: (item: InquiryItem) => boolean) =>
        setItems((prev) => (prev.every(keep) ? prev : prev.filter(keep))),
    }),
    [],
  )

  const value = useMemo<InquiryContextValue>(
    () => ({ items, count: items.reduce((n, i) => n + i.qty, 0), ...actions }),
    [items, actions],
  )

  return <InquiryContext.Provider value={value}>{children}</InquiryContext.Provider>
}

export function useInquiry() {
  const ctx = useContext(InquiryContext)
  if (!ctx) throw new Error('useInquiry must be used inside <InquiryProvider>')
  return ctx
}
