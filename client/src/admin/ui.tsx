import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, type InquiryStatus, type Kind, type ListingStatus } from './api.ts'

// Admin UI kit: same tokens as the shop, 44px targets, 16px inputs on phones.

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<ApiError>()
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)
  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setData(await run())
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'error', String(e)))
    } finally {
      setLoading(false)
    }
  }, [run])
  useEffect(() => {
    void reload()
  }, [reload])
  return { data, setData, error, loading, reload }
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-text hover:border-muted',
  danger: 'border border-error/30 bg-error-soft text-error hover:border-error',
  ghost: 'text-muted hover:text-text',
}

export function Button({
  variant = 'primary',
  busy,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {busy && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  )
}

export const inputClass =
  'min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-base placeholder:text-soldout focus:border-accent focus:outline-none aria-invalid:border-error aria-invalid:bg-error-soft sm:text-sm'

export function Field({
  label,
  hint,
  error,
  children,
  className = '',
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block font-medium text-error">{error}</span>}
    </label>
  )
}

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          {title && <h2 className="font-display text-xl">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function PageHeader({ title, back, actions }: { title: string; back?: { to: string; label: string }; actions?: ReactNode }) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="-my-3 inline-block py-3 text-sm text-muted hover:text-text">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export const STATUS_STYLE: Record<InquiryStatus, string> = {
  new: 'bg-accent text-on-accent',
  contacted: 'bg-accent-soft text-accent',
  confirmed: 'bg-instock-soft text-instock',
  fulfilled: 'bg-soldout-soft text-text',
  cancelled: 'bg-soldout-soft text-soldout line-through',
}
export const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

const LISTING_STATUS_STYLE: Record<ListingStatus, string> = {
  published: 'bg-instock-soft text-instock',
  draft: 'bg-accent-soft text-accent',
  archived: 'bg-soldout-soft text-soldout',
}
export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap capitalize ${LISTING_STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

export const KIND_LABEL: Record<Kind, string> = {
  decant: 'Decant',
  'catch-release': 'Catch & Release',
  'full-bottle': 'Full bottle',
}

/** Chips for filters; swipeable on phones */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T | ''; label: string; count?: number }[]
  value: T | ''
  onChange: (v: T | '') => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors ${
            value === o.value ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-muted hover:text-text'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="text-xs tabular-nums opacity-80">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 py-10 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      {label}
    </p>
  )
}

export function ErrorBox({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error-soft p-4 text-sm text-error">
      <span className="font-medium">{error.message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
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
