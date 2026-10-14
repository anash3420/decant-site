import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchInquiryStatus, ShopApiError, type InquiryStatusInfo } from '../api/shop.ts'
import { useShop } from '../context/ShopContext.tsx'
import { kindMeta } from '../lib/catalog.ts'
import { clearHistory, loadHistory, removeFromHistory, type SentInquiry } from '../lib/history.ts'
import { formatPrice, maxQty } from '@shared/stock.ts'
import { useInquiry } from '../context/InquiryContext.tsx'

const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' })

/** undefined = still checking; 'unknown' = the shop has no record (e.g. sent before it went live) */
type StatusState = InquiryStatusInfo['status'] | 'unknown' | undefined

const STATUS_PILL: Record<InquiryStatusInfo['status'] | 'unknown', { label: string; className: string }> = {
  new: { label: 'Sent · awaiting reply', className: 'bg-accent-soft text-accent' },
  contacted: { label: 'I’ve messaged you', className: 'bg-accent text-on-accent' },
  confirmed: { label: 'Confirmed', className: 'bg-instock-soft text-instock' },
  fulfilled: { label: 'Completed', className: 'bg-soldout-soft text-text' },
  cancelled: { label: 'Cancelled', className: 'bg-soldout-soft text-soldout' },
  unknown: { label: 'Saved on this device', className: 'bg-soldout-soft text-muted' },
}

function StatusPill({ status }: { status: StatusState }) {
  if (!status)
    return <span className="h-5 w-28 shrink-0 animate-pulse rounded-full bg-border" aria-label="Checking status" />
  const pill = STATUS_PILL[status]
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap ${pill.className}`}>
      {pill.label}
    </span>
  )
}

// The status endpoint is rate limited, so only the most recent inquiries are checked
const STATUS_LOOKUPS = 15

export default function History() {
  const [history, setHistory] = useState(loadHistory)
  const [confirmClear, setConfirmClear] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, StatusState>>({})

  const references = history
    .slice(0, STATUS_LOOKUPS)
    .map((h) => h.reference)
    .join(',')
  useEffect(() => {
    let live = true
    for (const reference of references.split(',').filter(Boolean)) {
      fetchInquiryStatus(reference)
        .then((s) => live && setStatuses((prev) => ({ ...prev, [reference]: s.status })))
        .catch((e) => {
          // Not found (or not a valid server reference) → it only exists on this device
          if (live && e instanceof ShopApiError && (e.status === 404 || e.status === 400))
            setStatuses((prev) => ({ ...prev, [reference]: 'unknown' }))
        })
    }
    return () => {
      live = false
    }
  }, [references])

  const remove = (reference: string) => {
    removeFromHistory(reference)
    setHistory(loadHistory())
  }

  const clearAll = () => {
    clearHistory()
    setHistory([])
    setConfirmClear(false)
  }

  if (history.length === 0) {
    return (
      <section className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl">No inquiries yet</h1>
        <p className="mt-4 text-muted">
          Inquiries you send from this device show up here, so you can look back at what you asked for.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-md bg-accent px-5 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          Browse fragrances
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Your history</h1>
          <p className="mt-3 max-w-prose text-muted">
            Inquiries you've sent from this device. They're stored in this browser only, so they won't show up on
            another phone or computer, and clearing your browser data removes them.
          </p>
        </div>
        {confirmClear ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">Remove all {history.length}?</span>
            <button
              type="button"
              onClick={clearAll}
              className="min-h-11 px-1 font-medium text-error underline-offset-4 hover:underline"
            >
              Yes, clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="min-h-11 px-1 text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="min-h-11 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Clear history
          </button>
        )}
      </div>

      <ol className="mt-10 space-y-6">
        {history.map((inq) => (
          <li key={inq.reference}>
            <InquiryCard inquiry={inq} status={statuses[inq.reference]} onRemove={() => remove(inq.reference)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function InquiryCard({
  inquiry: inq,
  status,
  onRemove,
}: {
  inquiry: SentInquiry
  status: StatusState
  onRemove: () => void
}) {
  const { getListing, settings } = useShop()
  const { items: current, add } = useInquiry()
  const navigate = useNavigate()
  const count = inq.items.reduce((n, i) => n + i.qty, 0)

  // Items that still exist and have stock, capped at what's left after the current inquiry
  const reorderable = inq.items.flatMap((i) => {
    const f = getListing(i.slug)
    if (!f) return []
    const already = current.find((c) => c.slug === i.slug && c.optionId === i.optionId)?.qty ?? 0
    const qty = Math.min(i.qty, maxQty(f, i.optionId, current) - already)
    return qty > 0 ? [{ ...i, qty }] : []
  })

  const requestAgain = () => {
    reorderable.forEach((i) => add(i.slug, i.optionId, i.qty))
    navigate('/inquiry')
  }

  return (
    <article className="rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-sm text-muted">{dateFormat.format(new Date(inq.createdAt))}</p>
          <h2 className="mt-0.5 text-2xl">
            Ref {inq.reference}{' '}
            <span className="font-sans text-base text-muted">
              · {count} item{count === 1 ? '' : 's'}
            </span>
          </h2>
        </div>
        <StatusPill status={status} />
      </header>

      <ul className="divide-y divide-border px-5">
        {inq.items.map((i) => {
          const stillListed = Boolean(getListing(i.slug))
          return (
            <li key={`${i.slug}-${i.optionId}`} className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                {stillListed ? (
                  <Link to={`/fragrance/${i.slug}`} className="inline-block py-1 font-medium hover:text-accent">
                    {i.nameSnapshot}
                  </Link>
                ) : (
                  <span className="font-medium">{i.nameSnapshot}</span>
                )}
                <p className="text-muted">
                  {kindMeta(i.kind).short} · {i.optionLabel}
                  {i.qty > 1 && <> · × {i.qty}</>}
                </p>
              </div>
              <span className="tabular-nums">{formatPrice(i.priceSnapshot * i.qty)}</span>
            </li>
          )
        })}
      </ul>

      <dl className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">
            {inq.fulfilmentLabel}
            {inq.location && <> · {inq.location}</>}
          </dt>
          <dd className="tabular-nums">{inq.shippingCost === 0 ? 'Free' : formatPrice(inq.shippingCost)}</dd>
        </div>
        <div className="flex justify-between gap-4 font-medium">
          <dt>Estimated total</dt>
          <dd className="tabular-nums">{formatPrice(inq.estimatedTotal)}</dd>
        </div>
        {inq.notes && (
          <div className="pt-1">
            <dt className="sr-only">Your notes</dt>
            <dd className="text-muted">“{inq.notes}”</dd>
          </div>
        )}
      </dl>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border p-5 text-sm">
        <button
          type="button"
          onClick={requestAgain}
          disabled={reorderable.length === 0}
          className="min-h-11 rounded-md bg-accent px-4 font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          title={reorderable.length === 0 ? 'None of these are available right now' : undefined}
        >
          Request again
        </button>
        <a
          href={settings?.ownerFacebookUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline"
        >
          Ask about this on Facebook ↗
        </a>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto min-h-11 px-1 text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Remove
        </button>
      </footer>
      {reorderable.length > 0 && reorderable.length < inq.items.length && (
        <p className="-mt-2 px-5 pb-4 text-xs text-muted">
          Some of these are sold out; only what's available will be added.
        </p>
      )}
    </article>
  )
}
