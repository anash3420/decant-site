import type { InquiryStatus, Kind } from './api.ts'

// Labels and small text helpers shared by admin pages (kept out of ui.tsx so it only exports components)

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

export const KIND_LABEL: Record<Kind, string> = {
  decant: 'Decant',
  'catch-release': 'Catch & Release',
  'full-bottle': 'Full bottle',
}

/** Comma-separated text ⇄ string array, for notes and accords */
export const splitList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
export const joinList = (xs: string[] | undefined) => (xs ?? []).join(', ')

/** Parses a numeric text field; empty → undefined */
export const num = (s: string) => (s.trim() === '' ? undefined : Number(s))

export const dateTime = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
