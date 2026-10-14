import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

  const value: InquiryContextValue = {
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    add: (slug, optionId, qty) =>
      setItems((prev) =>
        prev.some((i) => same(i, slug, optionId))
          ? prev.map((i) => (same(i, slug, optionId) ? { ...i, qty: i.qty + qty } : i))
          : [...prev, { slug, optionId, qty }],
      ),
    setQty: (slug, optionId, qty) =>
      setItems((prev) =>
        qty <= 0
          ? prev.filter((i) => !same(i, slug, optionId))
          : prev.map((i) => (same(i, slug, optionId) ? { ...i, qty } : i)),
      ),
    remove: (slug, optionId) => setItems((prev) => prev.filter((i) => !same(i, slug, optionId))),
    clear: () => setItems([]),
    retain: (keep) => setItems((prev) => (prev.every(keep) ? prev : prev.filter(keep))),
  }

  return <InquiryContext.Provider value={value}>{children}</InquiryContext.Provider>
}

export function useInquiry() {
  const ctx = useContext(InquiryContext)
  if (!ctx) throw new Error('useInquiry must be used inside <InquiryProvider>')
  return ctx
}
