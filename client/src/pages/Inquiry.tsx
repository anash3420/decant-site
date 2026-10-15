import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, getOption, maxQty } from '@shared/stock.ts'
import { kindMeta } from '../lib/catalog.ts'
import { useInquiry } from '../context/InquiryContext.tsx'
import { useShop } from '../context/ShopContext.tsx'
import type { FulfilmentId } from '@shared/types.ts'
import { saveToHistory, type SentInquiry } from '../lib/history.ts'
import { lettermailBlockedReason } from '@shared/shipping.ts'
import { FACEBOOK_URL } from '@shared/validation.ts'
import { createInquiry, ShopApiError, type CreatedInquiry, type UnavailableLine } from '../api/shop.ts'
import BottleArt from '../components/BottleArt.tsx'
import QtyStepper from '../components/QtyStepper.tsx'
import { CatalogError } from '../components/CatalogState.tsx'
import Spinner from '../components/Spinner.tsx'
import { scrollBehavior } from '../lib/motion.ts'

const input =
  // 16px on phones so iOS doesn't zoom the page when a field is focused
  'mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base placeholder:text-soldout focus:border-accent focus:outline-none sm:text-sm'

interface Submitted {
  reference: string
  name: string
  saved: boolean
}

/** The server's reply → the copy kept in this browser's History */
const toHistory = (i: CreatedInquiry): SentInquiry => ({
  reference: i.reference,
  createdAt: i.createdAt,
  contact: i.contact,
  fulfilment: i.fulfilment.method,
  fulfilmentLabel: i.fulfilment.label,
  shippingCost: i.fulfilment.cost,
  location: i.fulfilment.location,
  notes: i.notes,
  items: i.items.map((it) => ({
    slug: it.slug,
    nameSnapshot: it.nameSnapshot,
    kind: it.kind,
    optionId: it.optionId,
    optionLabel: it.optionLabel,
    qty: it.qty,
    priceSnapshot: it.unitPrice,
  })),
  subtotal: i.subtotal,
  estimatedTotal: i.estimatedTotal,
})

export default function Inquiry() {
  const { items, setQty, remove, clear } = useInquiry()
  const { getListing, settings, status, refresh } = useShop()
  const [chosenFulfilment, setFulfilment] = useState<FulfilmentId>('pickup')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Submitted | null>(null)
  const [sending, setSending] = useState(false)
  /** A problem the server reported on send (stock, price, limits, network) */
  const [notice, setNotice] = useState<{ title: string; lines?: string[] } | null>(null)
  const selectionsRef = useRef<HTMLDivElement>(null)

  const lines = items.flatMap((item) => {
    const f = getListing(item.slug)
    const option = f && getOption(f, item.optionId)
    return f && option ? [{ item, f, option, price: option.price }] : []
  })
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.item.qty, 0)
  const options = settings?.fulfilment ?? []
  const lettermailBlocked = lettermailBlockedReason(lines, settings?.lettermail)
  // If the inquiry outgrows lettermail after it was picked, fall back to tracked rather than silently keeping it
  const preferred: FulfilmentId = chosenFulfilment === 'lettermail' && lettermailBlocked ? 'tracked' : chosenFulfilment
  // …and if that option is switched off in settings, use the first one that's on
  const shipping =
    options.find((o) => o.id === preferred) ??
    options.find((o) => !(o.id === 'lettermail' && lettermailBlocked)) ??
    options[0]
  const fulfilment = shipping?.id ?? 'pickup'
  const ships = fulfilment !== 'pickup'
  const shippingCost = shipping?.cost ?? 0

  const showNotice = (n: { title: string; lines?: string[] }) => {
    setNotice(n)
    selectionsRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() })
  }

  /** Brings the inquiry in line with what's actually left, and says what changed */
  const reconcile = (problems: UnavailableLine[]) =>
    problems.flatMap((p) => {
      const line = lines.find((l) => l.f.slug === p.slug && l.item.optionId === p.optionId)
      const name = line ? `${line.f.name} (${line.option.label})` : 'An item'
      if (p.reason === 'insufficient' && p.available) {
        setQty(p.slug, p.optionId, p.available)
        return [`${name}: only ${p.available} left, so your quantity is now ${p.available}.`]
      }
      remove(p.slug, p.optionId)
      return [`${name} is no longer available and was removed.`]
    })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (sending) return
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    setNotice(null)

    const next: Record<string, string> = {}
    if (!data.name?.trim()) next.name = 'Please add your name.'
    if (!FACEBOOK_URL.test(data.facebook?.trim() ?? ''))
      next.facebook = 'Paste your Facebook profile link, e.g. facebook.com/your.name'
    if (ships && !data.location?.trim()) next.location = 'Add your city and postal code so I can quote shipping.'
    if (!data.confirm) next.confirm = 'Please confirm before sending.'
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) {
      // On phones the Send button is far from the fields, so take the visitor to the first problem
      const field = form.elements.namedItem(firstInvalid) as HTMLElement | null
      field?.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
      field?.focus({ preventScroll: true })
      return
    }

    setSending(true)
    try {
      // The server re-prices everything; expectedTotal lets it tell us if what the visitor saw is out of date
      const inquiry = await createInquiry({
        contact: { name: data.name.trim(), facebook: data.facebook.trim() },
        fulfilment,
        location: ships ? data.location.trim() : undefined,
        notes: data.notes?.trim() || undefined,
        items: lines.map((l) => ({ slug: l.f.slug, optionId: l.item.optionId, qty: l.item.qty })),
        expectedTotal: subtotal + shippingCost,
        website: data.website || undefined,
      })
      const saved = saveToHistory(toHistory(inquiry))
      setSubmitted({ reference: inquiry.reference, name: inquiry.contact.name, saved })
      clear()
      window.scrollTo({ top: 0 })
      void refresh() // stock just changed
    } catch (err) {
      const e =
        err instanceof ShopApiError ? err : new ShopApiError(0, 'error', 'Something went wrong. Please try again.')
      if (e.code === 'unavailable') {
        await refresh()
        showNotice({
          title: 'Some of this just sold. Your inquiry has been updated, so check it and send again.',
          lines: reconcile((e.details as UnavailableLine[]) ?? []),
        })
      } else if (e.code === 'price_changed') {
        await refresh()
        showNotice({ title: 'Prices were updated since you added these. Check the new total and send again.' })
      } else if (e.code === 'lettermail_unavailable' || e.code === 'fulfilment_unavailable') {
        await refresh()
        showNotice({ title: e.message, lines: ['Pick another delivery option and send again.'] })
      } else {
        showNotice({ title: e.message })
      }
    } finally {
      setSending(false)
    }
  }

  if (status === 'error' && !submitted) return <CatalogError />
  if (status === 'loading' && items.length > 0) {
    return (
      <p className="flex items-center gap-2 text-muted" role="status">
        <Spinner />
        Loading your inquiry…
      </p>
    )
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-xl text-center">
        <p className="text-sm text-instock">Inquiry sent · Ref {submitted.reference}</p>
        <h1 className="mt-2 text-4xl">Thanks, {submitted.name.split(' ')[0]}!</h1>
        <p className="mt-4 text-muted">
          I'll message you on Facebook within a day or two to confirm availability, the total and payment. Nothing is
          charged until we've talked.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={settings?.ownerFacebookUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Message me on Facebook
          </a>
          <Link to="/" className="rounded-md border border-border bg-surface px-5 py-3 text-sm hover:border-muted">
            Keep browsing
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">
          {submitted.saved ? (
            <>
              A copy is saved on this device in{' '}
              <Link to="/history" className="font-medium text-accent underline underline-offset-4">
                your history
              </Link>
              .
            </>
          ) : (
            'Your browser blocked saving a copy on this device, so jot down the reference above.'
          )}
        </p>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl">Your inquiry is empty</h1>
        <p className="mt-4 text-muted">Open a fragrance, pick a size and add it here.</p>
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
      <h1 className="text-4xl">Your inquiry</h1>
      <p className="mt-3 max-w-prose text-muted">
        This is a request, not a purchase. Check your picks, tell me how to reach you, and I'll follow up on Facebook to
        confirm and arrange payment.
      </p>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-10">
          {/* 1. Selections */}
          <div ref={selectionsRef} className="scroll-mt-6">
            {notice && (
              <div role="alert" className="mb-6 rounded-xl border border-error/30 bg-error-soft p-4 text-sm">
                <p className="flex gap-2 font-medium text-error">
                  <ErrorIcon />
                  {notice.title}
                </p>
                {notice.lines?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-10 text-text">
                    {notice.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            <h2 className="text-2xl">1. Your selections</h2>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
              {lines.map(({ item, f, option, price }) => (
                // Phones: controls get their own full-width row under the thumbnail; sm+: they sit under the name
                <li
                  key={`${item.slug}-${item.optionId}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 p-4 sm:gap-x-4"
                >
                  {f.photos?.[0]?.src ? (
                    // Same cover photo as the shop card, filling the square thumbnail (trim aimed to keep caps)
                    <img
                      src={f.photos[0].src}
                      alt=""
                      loading="lazy"
                      className="size-16 rounded-lg object-cover object-[center_20%] sm:row-span-2 sm:size-20"
                    />
                  ) : (
                    <BottleArt
                      tint={f.tint}
                      variant={f.kind === 'full-bottle' ? 'bottle' : 'vial'}
                      fill={f.kind === 'full-bottle' ? f.fillPercent / 100 : undefined}
                      className="size-16 rounded-lg sm:row-span-2 sm:size-20"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{f.house}</p>
                    <Link
                      to={`/fragrance/${f.slug}`}
                      className="inline-block py-0.5 font-display text-xl hover:text-accent"
                    >
                      {f.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {kindMeta(f.kind).short} · {option.label}
                      {f.kind !== 'full-bottle' && <> · {formatPrice(price)} each</>}
                    </p>
                    <StockWarning max={maxQty(f, item.optionId, items)} qty={item.qty} />
                  </div>
                  <p className="font-medium tabular-nums">{formatPrice(price * item.qty)}</p>
                  <div className="col-span-full flex items-center justify-between gap-4 sm:col-span-2 sm:col-start-2 sm:justify-start">
                    {f.kind !== 'full-bottle' && (
                      <QtyStepper
                        label={`Quantity of ${f.name} ${option.label}`}
                        value={item.qty}
                        max={maxQty(f, item.optionId, items)}
                        onChange={(n) => setQty(item.slug, item.optionId, n)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.slug, item.optionId)}
                      className="min-h-11 px-2 text-sm text-muted underline-offset-4 hover:text-text hover:underline sm:-mx-2"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Delivery */}
          <fieldset>
            <legend className="font-display text-2xl">2. Pickup or shipping</legend>
            <div className="mt-4 space-y-3">
              {options.map((o) => {
                const blocked = o.id === 'lettermail' ? lettermailBlocked : null
                return (
                  <label
                    key={o.id}
                    className={`flex gap-3 rounded-lg border p-4 transition-colors ${
                      blocked
                        ? 'cursor-not-allowed border-border bg-bg'
                        : fulfilment === o.id
                          ? 'cursor-pointer border-accent bg-accent-soft'
                          : 'cursor-pointer border-border bg-surface hover:border-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfilment"
                      value={o.id}
                      checked={fulfilment === o.id}
                      disabled={!!blocked}
                      onChange={() => setFulfilment(o.id)}
                      className="mt-0.5 size-5 shrink-0 accent-accent"
                    />
                    <span className="flex-1">
                      <span
                        className={`flex justify-between gap-4 text-sm font-medium ${blocked ? 'text-soldout' : ''}`}
                      >
                        {o.label}
                        <span className="tabular-nums">{o.cost === 0 ? 'Free' : formatPrice(o.cost)}</span>
                      </span>
                      <span className={`mt-0.5 block text-sm ${blocked ? 'text-soldout' : 'text-muted'}`}>
                        {blocked ? `Not available for this inquiry. ${blocked}` : o.detail}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {lettermailBlocked && chosenFulfilment === 'lettermail' && (
              <p className="mt-3 text-sm font-medium text-accent" role="status">
                Switched to tracked shipping because lettermail no longer fits this inquiry.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Shipping is an estimate. I'll confirm the final cost when I message you.
            </p>
          </fieldset>

          {/* 3. Contact */}
          <form
            id="inquiry-form"
            onSubmit={handleSubmit}
            onChange={(e) => {
              const field = (e.target as Element).getAttribute('name') ?? ''
              if (errors[field])
                setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== field)))
            }}
            noValidate
          >
            <h2 className="text-2xl">3. How to reach you</h2>
            <div className="mt-4 space-y-5 rounded-xl border border-border bg-surface p-5">
              <Field label="Your name" error={errors.name}>
                <input
                  name="name"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  aria-invalid={!!errors.name}
                  className={input}
                  placeholder="Jane Doe"
                />
              </Field>

              <Field
                label="Facebook profile link"
                hint="So I can message you. On Facebook: your profile → ⋯ → Copy link."
                error={errors.facebook}
              >
                <input
                  name="facebook"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  aria-invalid={!!errors.facebook}
                  className={input}
                  placeholder="https://www.facebook.com/your.name"
                />
              </Field>

              {ships && (
                <Field label="City and postal code" error={errors.location}>
                  <input
                    name="location"
                    autoComplete="postal-code"
                    enterKeyHint="next"
                    aria-invalid={!!errors.location}
                    className={input}
                    placeholder="Edmonton, T5J 0N3"
                  />
                </Field>
              )}

              <Field label="Notes (optional)">
                <textarea
                  name="notes"
                  rows={3}
                  className={input}
                  placeholder="Pickup times that work, questions about a scent…"
                />
              </Field>

              {/* honeypot: hidden from people, bots tend to fill it */}
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

              <div>
                <label className="-my-2 flex cursor-pointer gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="confirm"
                    aria-invalid={!!errors.confirm}
                    className={`mt-0.5 size-5 shrink-0 accent-accent ${errors.confirm ? 'outline-2 outline-offset-2 outline-error' : ''}`}
                  />
                  <span>I understand this is a request and I'll be contacted on Facebook to confirm and pay.</span>
                </label>
                {errors.confirm && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-error">
                    <ErrorIcon />
                    {errors.confirm}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Summary */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-2xl">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Items ({lines.reduce((n, l) => n + l.item.qty, 0)})</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{shipping?.label}</dt>
                <dd className="tabular-nums">{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <dt>Estimated total</dt>
                <dd className="tabular-nums">{formatPrice(subtotal + shippingCost)}</dd>
              </div>
            </dl>
            <button
              type="submit"
              form="inquiry-form"
              disabled={sending}
              className="mt-5 hidden min-h-11 w-full rounded-md bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60 lg:block"
            >
              {sending ? 'Sending…' : 'Send inquiry'}
            </button>
            {Object.keys(errors).length > 0 && (
              <p
                role="alert"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-error-soft px-3 py-2 text-sm font-medium text-error"
              >
                <ErrorIcon />
                Please fix the highlighted fields.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-accent-soft/50 p-5 text-sm">
            <p className="font-medium">Rather just message me?</p>
            <p className="mt-1 text-muted">Questions about a scent or a custom size, reach out directly.</p>
            <a
              href={settings?.ownerFacebookUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4"
            >
              Open my Facebook profile ↗
            </a>
          </div>
        </aside>
      </div>

      {/* Phones: total and Send always within thumb reach */}
      <div
        data-sticky-cta
        className="sticky bottom-0 z-20 -mx-5 mt-8 flex items-center justify-between gap-4 border-t border-border bg-surface/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8 lg:hidden"
      >
        <div className="text-sm">
          <p className="text-muted">Estimated total</p>
          <p className="text-lg font-medium tabular-nums">{formatPrice(subtotal + shippingCost)}</p>
        </div>
        <button
          type="submit"
          form="inquiry-form"
          disabled={sending}
          className="min-h-12 rounded-md bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send inquiry'}
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label
      className={`block text-sm ${error ? '[&_input]:border-error [&_input]:bg-error-soft [&_input]:ring-1 [&_input]:ring-error [&_textarea]:border-error [&_textarea]:ring-1 [&_textarea]:ring-error' : ''}`}
    >
      <span className="font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1.5 font-medium text-error">
          <ErrorIcon />
          {error}
        </span>
      )}
    </label>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Flags a line that no longer fits current stock (someone else got there first) */
function StockWarning({ max, qty }: { max: number; qty: number }) {
  if (qty <= max) return null
  return (
    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-error">
      <ErrorIcon />
      {max === 0 ? 'No longer available. Remove it to send.' : `Only ${max} left. Lower the quantity to send.`}
    </p>
  )
}
