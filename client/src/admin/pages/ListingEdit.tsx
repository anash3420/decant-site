import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatPrice } from '@shared/stock.ts'
import { useToast } from '../../context/ToastContext.tsx'
import {
  ApiError,
  api,
  type AdminFragrance,
  type AdminListing,
  type Kind,
  type ListingStatus,
  type Photo,
} from '../api.ts'
import { cropAndResize, type CropArea } from '../processImage.ts'
import CropDialog from '../CropDialog.tsx'
import { FRAME_CLASS, orientationOf, type Orientation } from '../../lib/photos.ts'
import { Button, Card, ErrorBox, Field, Loading, PageHeader, inputClass } from '../ui.tsx'
import { KIND_LABEL, num } from '../format.ts'
import { useLoad } from '../useLoad.ts'

// Numbers are edited as text so a half-typed "1." or an empty field doesn't fight the cursor
type S = string
interface Form {
  kind: Kind
  fragrance: string
  status: ListingStatus
  listingNote: string
  slug: string
  photos: Photo[]
  bottles: { _id?: string; sizeMl: S; remainingMl: S; batchCode: S; costPaid: S }[]
  prices: { sizeMl: S; price: S }[]
  vials: { _id?: string; sizeMl: S; format: S; price: S; qty: S; note: S; sourcedFrom: S; costPaid: S }[]
  bottleSizeMl: S
  fillPercent: S
  hasBox: boolean
  condition: S
  price: S
  costPaid: S
  sold: boolean
}

const str = (n: number | undefined | null) => (n === undefined || n === null ? '' : String(n))

function emptyForm(kind: Kind): Form {
  return {
    kind,
    fragrance: '',
    status: 'draft',
    listingNote: '',
    slug: '',
    photos: [],
    bottles: [{ sizeMl: '', remainingMl: '', batchCode: '', costPaid: '' }],
    prices: [
      { sizeMl: '2', price: '' },
      { sizeMl: '5', price: '' },
      { sizeMl: '10', price: '' },
    ],
    vials: [{ sizeMl: '5', format: 'atomizer', price: '', qty: '1', note: '', sourcedFrom: '', costPaid: '' }],
    bottleSizeMl: '',
    fillPercent: '100',
    hasBox: true,
    condition: '',
    price: '',
    costPaid: '',
    sold: false,
  }
}

function fromListing(l: AdminListing): Form {
  return {
    ...emptyForm(l.kind),
    fragrance: l.fragrance?.id ?? '',
    status: l.status,
    listingNote: l.listingNote,
    slug: l.slug,
    photos: l.photos,
    bottles: (l.bottles ?? []).map((b) => ({
      _id: b._id,
      sizeMl: str(b.sizeMl),
      remainingMl: str(b.remainingMl),
      batchCode: b.batchCode ?? '',
      costPaid: str(b.costPaid),
    })),
    prices: (l.prices ?? []).map((p) => ({ sizeMl: str(p.sizeMl), price: str(p.price) })),
    vials: (l.vials ?? []).map((v) => ({
      _id: v._id,
      sizeMl: str(v.sizeMl),
      format: v.format,
      price: str(v.price),
      qty: str(v.qty),
      note: v.note ?? '',
      sourcedFrom: v.sourcedFrom ?? '',
      costPaid: str(v.costPaid),
    })),
    bottleSizeMl: str(l.bottleSizeMl),
    fillPercent: str(l.fillPercent),
    hasBox: l.hasBox ?? true,
    condition: l.condition ?? '',
    price: str(l.price),
    costPaid: str(l.costPaid),
    sold: l.sold ?? false,
  }
}

function toPayload(f: Form) {
  const base = {
    kind: f.kind,
    fragrance: f.fragrance,
    status: f.status,
    listingNote: f.listingNote,
    slug: f.slug || undefined,
    photos: f.photos.map((p, i) => ({ ...p, order: i })),
  }
  if (f.kind === 'decant')
    return {
      ...base,
      bottles: f.bottles.map((b) => ({
        _id: b._id,
        sizeMl: num(b.sizeMl),
        remainingMl: num(b.remainingMl),
        batchCode: b.batchCode || undefined,
        costPaid: num(b.costPaid) ?? null,
      })),
      prices: f.prices.filter((p) => p.sizeMl || p.price).map((p) => ({ sizeMl: num(p.sizeMl), price: num(p.price) })),
    }
  if (f.kind === 'catch-release')
    return {
      ...base,
      vials: f.vials.map((v) => ({
        _id: v._id,
        sizeMl: num(v.sizeMl),
        format: v.format,
        price: num(v.price),
        qty: num(v.qty),
        note: v.note || undefined,
        sourcedFrom: v.sourcedFrom || undefined,
        costPaid: num(v.costPaid) ?? null,
      })),
    }
  return {
    ...base,
    bottleSizeMl: num(f.bottleSizeMl),
    fillPercent: num(f.fillPercent),
    hasBox: f.hasBox,
    condition: f.condition,
    price: num(f.price),
    costPaid: num(f.costPaid) ?? null,
    sold: f.sold,
  }
}

export default function ListingEdit() {
  const { id } = useParams()
  const { data, error, loading, reload } = useLoad(
    () =>
      Promise.all([
        api<{ fragrances: AdminFragrance[] }>('/fragrances'),
        id ? api<{ listing: AdminListing }>(`/listings/${id}`) : Promise.resolve(null),
      ]),
    id ?? 'new',
  )

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  // key: a fresh form (and fresh state) per listing
  return <ListingForm key={id ?? 'new'} id={id} fragrances={data[0].fragrances} listing={data[1]?.listing} />
}

function ListingForm({
  id,
  fragrances,
  listing,
}: {
  id?: string
  fragrances: AdminFragrance[]
  listing?: AdminListing
}) {
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<Form>(() => (listing ? fromListing(listing) : emptyForm('decant')))
  const [saved, setSaved] = useState(() => JSON.stringify(form))
  const [busy, setBusy] = useState<string>()
  const [saveError, setSaveError] = useState<ApiError>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dirty = JSON.stringify(form) !== saved
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const fragrancesByBrand = useMemo(() => {
    const groups = new Map<string, AdminFragrance[]>()
    for (const fr of fragrances) {
      const b = fr.brand?.name ?? 'No brand'
      groups.set(b, [...(groups.get(b) ?? []), fr])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [fragrances])

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const title = isNew ? 'New listing' : (listing?.fragrance?.name ?? 'Listing')
  const fieldErrors = saveError?.fieldErrors ?? {}

  const save = async () => {
    setBusy('save')
    setSaveError(undefined)
    try {
      const payload = toPayload(form)
      const r = isNew
        ? await api<{ listing: AdminListing }>('/listings', { json: payload })
        : await api<{ listing: AdminListing }>(`/listings/${id}`, { method: 'PATCH', json: payload })
      const next = fromListing(r.listing)
      setForm(next)
      setSaved(JSON.stringify(next))
      toast({
        title: isNew ? 'Listing created' : 'Changes saved',
        detail: r.listing.status === 'published' ? 'Live in the shop.' : `Status: ${r.listing.status}`,
      })
      if (isNew) navigate(`/admin/listings/${r.listing.id}`, { replace: true })
    } catch (e) {
      setSaveError(e instanceof ApiError ? e : new ApiError(0, 'error', 'Could not save.'))
    } finally {
      setBusy(undefined)
    }
  }

  const remove = async () => {
    setBusy('delete')
    try {
      await api(`/listings/${id}`, { method: 'DELETE' })
      toast({ title: 'Listing deleted' })
      navigate('/admin/listings', { replace: true })
    } catch (e) {
      setSaveError(e instanceof ApiError ? e : new ApiError(0, 'error', 'Could not delete.'))
      setConfirmDelete(false)
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        back={{ to: '/admin/listings', label: 'Listings' }}
        actions={
          listing?.status === 'published' && (
            <a
              href={`/fragrance/${listing.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-medium text-accent"
            >
              View in shop ↗
            </a>
          )
        }
      />

      {listing?.openInquiries ? (
        <p className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm">
          {listing.openInquiries} open inquir{listing.openInquiries === 1 ? 'y holds' : 'ies hold'} stock from this
          listing. Stock numbers below already exclude it.
        </p>
      ) : null}

      <div className="space-y-6 pb-24 lg:pb-0">
        <Card title="Basics">
          {isNew && (
            <fieldset className="mb-5">
              <legend className="text-sm font-medium">Type</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                  <label
                    key={k}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${form.kind === k ? 'border-accent bg-accent-soft' : 'border-border'}`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      checked={form.kind === k}
                      onChange={() => set({ kind: k })}
                      className="size-5 accent-accent"
                    />
                    {KIND_LABEL[k]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {isNew ? (
              <Field
                label="Fragrance"
                hint="Can’t be changed after the listing is created."
                error={fieldErrors.fragrance}
              >
                <select
                  value={form.fragrance}
                  onChange={(e) => set({ fragrance: e.target.value })}
                  aria-invalid={!!fieldErrors.fragrance}
                  className={inputClass}
                >
                  <option value="">Choose a fragrance…</option>
                  {fragrancesByBrand.map(([brand, frs]) => (
                    <optgroup key={brand} label={brand}>
                      {frs.map((fr) => (
                        <option key={fr.id} value={fr.id}>
                          {fr.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <Link to="/admin/fragrances/new" className="mt-1 inline-flex min-h-11 items-center text-sm text-accent">
                  + Add a fragrance that isn’t listed
                </Link>
              </Field>
            ) : (
              // Fixed after creation: inquiries point at this listing. Notes etc. live on the fragrance itself.
              <div className="text-sm">
                <p className="font-medium">Fragrance</p>
                <p className="mt-1.5 flex min-h-11 items-center gap-2 rounded-md border border-border bg-bg px-3">
                  <span className="text-muted">{listing?.fragrance?.brand.name}</span>
                  <span className="font-medium">{listing?.fragrance?.name}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Fixed once a listing exists. For a different fragrance, create a new listing.
                </p>
                {listing?.fragrance && (
                  <Link
                    to={`/admin/fragrances/${listing.fragrance.id}`}
                    className="inline-flex min-h-11 items-center text-sm text-accent"
                  >
                    Edit this fragrance’s notes and details →
                  </Link>
                )}
              </div>
            )}
            <Field label="Status" hint="Only published listings appear in the shop.">
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value as ListingStatus })}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field
              label="Listing note (optional)"
              hint="Shown after the fragrance description, e.g. “Picked up in a CFE split”."
              className="sm:col-span-2"
            >
              <input
                value={form.listingNote}
                onChange={(e) => set({ listingNote: e.target.value })}
                maxLength={500}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        {form.kind === 'decant' && <DecantFields form={form} set={set} errors={fieldErrors} />}
        {form.kind === 'catch-release' && <VialFields form={form} set={set} errors={fieldErrors} />}
        {form.kind === 'full-bottle' && <BottleFields form={form} set={set} errors={fieldErrors} />}

        <PhotoFields photos={form.photos} onChange={(update) => setForm((f) => ({ ...f, photos: update(f.photos) }))} />

        <Card title="Link">
          <Field
            label="Shop link"
            hint={
              isNew
                ? 'Leave empty to generate it from the fragrance name.'
                : 'Changing it breaks links already shared on Facebook.'
            }
            error={fieldErrors.slug}
          >
            <div className="flex items-center gap-1 text-sm">
              <span className="shrink-0 text-muted">/fragrance/</span>
              <input
                value={form.slug}
                onChange={(e) => set({ slug: e.target.value })}
                autoCapitalize="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>
          </Field>
        </Card>

        {!isNew && (
          <Card title="Remove">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Delete this listing and its photos?</span>
                <Button variant="danger" busy={busy === 'delete'} onClick={remove}>
                  Yes, delete
                </Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete listing
                </Button>
                <span className="text-sm text-muted">Listings that appear in inquiries can only be archived.</span>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Save bar: fixed on phones, inline on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {saveError ? (
              <span className="font-medium text-error">{saveError.message}</span>
            ) : dirty ? (
              'Unsaved changes'
            ) : isNew ? (
              ''
            ) : (
              'All changes saved'
            )}
          </p>
          <Button onClick={save} busy={busy === 'save'} disabled={!dirty && !isNew} className="min-h-12 px-6">
            {isNew ? 'Create listing' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  )
}

type FieldsProps = { form: Form; set: (p: Partial<Form>) => void; errors: Record<string, string> }

function Row({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-4">{children}</div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="mt-2 min-h-11 text-sm text-muted hover:text-error">
          {removeLabel}
        </button>
      )}
    </div>
  )
}

const NumberInput = (props: { value: string; onChange: (v: string) => void; label: string; step?: string }) => (
  <input
    type="number"
    inputMode="decimal"
    min="0"
    step={props.step ?? 'any'}
    value={props.value}
    onChange={(e) => props.onChange(e.target.value)}
    aria-label={props.label}
    className={inputClass}
  />
)

function DecantFields({ form, set, errors }: FieldsProps) {
  const withCost = form.bottles.filter((b) => num(b.costPaid) && num(b.sizeMl))
  const costPerMl = withCost.length
    ? withCost.reduce((n, b) => n + num(b.costPaid)!, 0) / withCost.reduce((n, b) => n + num(b.sizeMl)!, 0)
    : undefined
  const totalLeft = form.bottles.reduce((n, b) => n + (num(b.remainingMl) ?? 0), 0)

  const setBottle = (i: number, p: Partial<Form['bottles'][number]>) =>
    set({ bottles: form.bottles.map((b, n) => (n === i ? { ...b, ...p } : b)) })
  const setPrice = (i: number, p: Partial<Form['prices'][number]>) =>
    set({ prices: form.prices.map((x, n) => (n === i ? { ...x, ...p } : x)) })

  return (
    <>
      <Card title="Bottles" actions={<span className="text-sm text-muted tabular-nums">{totalLeft}ml left</span>}>
        <p className="mb-3 text-sm text-muted">
          Log how much is left after each decanting session. Visitors see sizes as available while enough ml remains.
        </p>
        <div className="space-y-3">
          {form.bottles.map((b, i) => (
            <Row
              key={b._id ?? i}
              removeLabel="Remove bottle"
              onRemove={
                form.bottles.length > 1 ? () => set({ bottles: form.bottles.filter((_, n) => n !== i) }) : undefined
              }
            >
              <Field label="Bottle size (ml)">
                <NumberInput label="Bottle size" value={b.sizeMl} onChange={(v) => setBottle(i, { sizeMl: v })} />
              </Field>
              <Field label="ml left">
                <NumberInput label="ml left" value={b.remainingMl} onChange={(v) => setBottle(i, { remainingMl: v })} />
              </Field>
              <Field label="Cost paid ($)" hint="Private">
                <NumberInput label="Cost paid" value={b.costPaid} onChange={(v) => setBottle(i, { costPaid: v })} />
              </Field>
              <Field label="Batch code" hint="Private">
                <input
                  value={b.batchCode}
                  onChange={(e) => setBottle(i, { batchCode: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </Row>
          ))}
        </div>
        {errors.bottles && <p className="mt-2 text-sm font-medium text-error">{errors.bottles}</p>}
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() =>
            set({ bottles: [...form.bottles, { sizeMl: '', remainingMl: '', batchCode: '', costPaid: '' }] })
          }
        >
          + Add bottle
        </Button>
      </Card>

      <Card title="Decant sizes and prices">
        {costPerMl !== undefined && (
          <p className="mb-3 text-sm text-muted">
            Your cost: about {formatPrice(Math.round(costPerMl * 100) / 100)} per ml.
          </p>
        )}
        <div className="space-y-2">
          {form.prices.map((p, i) => {
            const size = num(p.sizeMl)
            const price = num(p.price)
            const cost = costPerMl !== undefined && size ? costPerMl * size : undefined
            return (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Field label="Size (ml)" className="w-24">
                  <NumberInput label="Decant size" value={p.sizeMl} onChange={(v) => setPrice(i, { sizeMl: v })} />
                </Field>
                <Field label="Price ($)" className="w-28">
                  <NumberInput label="Price" value={p.price} onChange={(v) => setPrice(i, { price: v })} />
                </Field>
                <button
                  type="button"
                  onClick={() => set({ prices: form.prices.filter((_, n) => n !== i) })}
                  className="min-h-11 px-2 text-sm text-muted hover:text-error"
                  aria-label={`Remove ${p.sizeMl}ml size`}
                >
                  Remove
                </button>
                {cost !== undefined && price !== undefined && (
                  <span className={`min-h-11 pt-3 text-xs ${price - cost < 0 ? 'text-error' : 'text-muted'}`}>
                    costs {formatPrice(Math.round(cost * 100) / 100)} · {price - cost >= 0 ? '+' : ''}
                    {formatPrice(Math.round((price - cost) * 100) / 100)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {errors.prices && <p className="mt-2 text-sm font-medium text-error">{errors.prices}</p>}
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => set({ prices: [...form.prices, { sizeMl: '', price: '' }] })}
        >
          + Add size
        </Button>
      </Card>
    </>
  )
}

function VialFields({ form, set, errors }: FieldsProps) {
  const setVial = (i: number, p: Partial<Form['vials'][number]>) =>
    set({ vials: form.vials.map((v, n) => (n === i ? { ...v, ...p } : v)) })
  return (
    <Card title="Vials">
      <p className="mb-3 text-sm text-muted">One row per kind of vial. Set the count to 0 when they’re gone.</p>
      <div className="space-y-3">
        {form.vials.map((v, i) => {
          const margin =
            num(v.price) !== undefined && num(v.costPaid) !== undefined ? num(v.price)! - num(v.costPaid)! : undefined
          return (
            <Row
              key={v._id ?? i}
              removeLabel="Remove vial"
              onRemove={form.vials.length > 1 ? () => set({ vials: form.vials.filter((_, n) => n !== i) }) : undefined}
            >
              <Field label="Size (ml)">
                <NumberInput label="Vial size" value={v.sizeMl} onChange={(x) => setVial(i, { sizeMl: x })} />
              </Field>
              <Field label="Format">
                <input
                  value={v.format}
                  onChange={(e) => setVial(i, { format: e.target.value })}
                  list="vial-formats"
                  className={inputClass}
                />
              </Field>
              <Field label="Price ($)">
                <NumberInput label="Vial price" value={v.price} onChange={(x) => setVial(i, { price: x })} />
              </Field>
              <Field label="How many">
                <NumberInput label="How many" step="1" value={v.qty} onChange={(x) => setVial(i, { qty: x })} />
              </Field>
              <Field label="Note for buyers" className="col-span-2">
                <input
                  value={v.note}
                  onChange={(e) => setVial(i, { note: e.target.value })}
                  placeholder="e.g. ~4ml left"
                  className={inputClass}
                />
              </Field>
              <Field label="From (private)">
                <input
                  value={v.sourcedFrom}
                  onChange={(e) => setVial(i, { sourcedFrom: e.target.value })}
                  placeholder="Member name"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Cost paid ($)"
                hint={margin !== undefined ? `${margin >= 0 ? '+' : ''}${formatPrice(margin)} each` : 'Private'}
              >
                <NumberInput label="Vial cost" value={v.costPaid} onChange={(x) => setVial(i, { costPaid: x })} />
              </Field>
            </Row>
          )
        })}
      </div>
      <datalist id="vial-formats">
        <option value="atomizer" />
        <option value="sample vial" />
        <option value="travel spray" />
        <option value="dabber" />
      </datalist>
      {errors.vials && <p className="mt-2 text-sm font-medium text-error">{errors.vials}</p>}
      <Button
        variant="secondary"
        className="mt-3"
        onClick={() =>
          set({
            vials: [
              ...form.vials,
              { sizeMl: '', format: 'atomizer', price: '', qty: '1', note: '', sourcedFrom: '', costPaid: '' },
            ],
          })
        }
      >
        + Add vial
      </Button>
    </Card>
  )
}

function BottleFields({ form, set, errors }: FieldsProps) {
  const margin =
    num(form.price) !== undefined && num(form.costPaid) !== undefined
      ? num(form.price)! - num(form.costPaid)!
      : undefined
  return (
    <Card title="Bottle details">
      <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-4">
        <Field label="Bottle size (ml)" error={errors.bottleSizeMl}>
          <NumberInput label="Bottle size" value={form.bottleSizeMl} onChange={(v) => set({ bottleSizeMl: v })} />
        </Field>
        <Field label={`Fill level: ${form.fillPercent || 0}%`} error={errors.fillPercent}>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={form.fillPercent || 0}
            onChange={(e) => set({ fillPercent: e.target.value })}
            className="min-h-11 w-full accent-accent"
          />
        </Field>
        <Field label="Price ($)" error={errors.price}>
          <NumberInput label="Price" value={form.price} onChange={(v) => set({ price: v })} />
        </Field>
        <Field
          label="Cost paid ($)"
          hint={margin !== undefined ? `${margin >= 0 ? '+' : ''}${formatPrice(margin)} margin` : 'Private'}
        >
          <NumberInput label="Cost paid" value={form.costPaid} onChange={(v) => set({ costPaid: v })} />
        </Field>
        <Field label="Condition" className="col-span-2 sm:col-span-4">
          <textarea
            value={form.condition}
            onChange={(e) => set({ condition: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="e.g. Excellent. Box has light shelf wear."
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.hasBox}
            onChange={(e) => set({ hasBox: e.target.checked })}
            className="size-5 accent-accent"
          />
          Comes with the box
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.sold}
            onChange={(e) => set({ sold: e.target.checked })}
            className="size-5 accent-accent"
          />
          Sold
        </label>
      </div>
      <p className="text-xs text-muted">
        An inquiry marks the bottle sold automatically; cancelling it makes it available again.
      </p>
    </Card>
  )
}

function PhotoFields({
  photos,
  onChange,
}: {
  photos: Photo[]
  onChange: (update: (prev: Photo[]) => Photo[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  /** Photos picked but not cropped yet; the first one is in the crop dialog */
  const [queue, setQueue] = useState<File[]>([])
  const [batchSize, setBatchSize] = useState(0)

  const pick = (files: FileList) => {
    setError('')
    const list = [...files].slice(0, 12 - photos.length)
    setQueue(list)
    setBatchSize(list.length)
  }

  const next = () => setQueue((q) => q.slice(1))

  // Uploads run in the background so the next photo can be framed straight away
  const upload = async (file: File, area: CropArea, orientation: Orientation) => {
    setUploading((n) => n + 1)
    try {
      const { blob, width, height } = await cropAndResize(file, area, orientation)
      const r = await api<{ url: string; pathname: string }>('/uploads', { body: blob, contentType: blob.type })
      // Updater form: uploads finish one by one and each must build on the list as it is by then
      onChange((prev) => [
        ...prev,
        {
          url: r.url,
          pathname: r.pathname,
          width,
          height,
          label: prev.length === 0 ? 'Front' : '',
          order: prev.length,
        },
      ])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Couldn’t upload ${file.name}.`)
    } finally {
      setUploading((n) => n - 1)
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    onChange((prev) => {
      const next = [...prev]
      ;[next[i], next[i + dir]] = [next[i + dir]!, next[i]!]
      return next
    })
  }

  return (
    <Card title="Photos" actions={<span className="text-sm text-muted">{photos.length}/12</span>}>
      <p className="mb-3 text-sm text-muted">
        The first photo is the cover. You frame each photo after picking it; shoppers see exactly that frame.
      </p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.url} className="rounded-lg border border-border p-2">
              <img
                src={p.url}
                alt={p.label || `Photo ${i + 1}`}
                // Uniform tiles; each photo shown whole, whatever its shape
                className={`${FRAME_CLASS.landscape} w-full rounded-md bg-accent-soft/60 object-contain`}
              />
              <p className="mt-1 text-xs text-muted">
                {orientationOf(p) === 'portrait' ? 'Portrait 3:4' : 'Landscape 4:3'}
              </p>
              <input
                value={p.label}
                onChange={(e) =>
                  onChange((prev) => prev.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))
                }
                placeholder="Label, e.g. Fill level"
                aria-label={`Label for photo ${i + 1}`}
                maxLength={60}
                className={`${inputClass} mt-2`}
              />
              <div className="mt-1 flex justify-between">
                <span className="flex">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move earlier"
                    className="size-11 text-lg text-muted disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={i === photos.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move later"
                    className="size-11 text-lg text-muted disabled:opacity-30"
                  >
                    →
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => onChange((prev) => prev.filter((_, n) => n !== i))}
                  className="min-h-11 px-2 text-sm text-muted hover:text-error"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) pick(e.target.files)
          e.target.value = ''
        }}
      />
      <Button
        variant="secondary"
        className="mt-3"
        busy={uploading > 0}
        disabled={photos.length >= 12}
        onClick={() => input.current?.click()}
      >
        {uploading > 0 ? `Uploading ${uploading}…` : '+ Add photos'}
      </Button>
      {error && <p className="mt-2 text-sm font-medium text-error">{error}</p>}
      {queue[0] && (
        <CropDialog
          // Remount per file so zoom and position start fresh
          key={`${queue[0].name}-${queue[0].lastModified}-${queue.length}`}
          file={queue[0]}
          progress={batchSize > 1 ? `Photo ${batchSize - queue.length + 1} of ${batchSize}` : undefined}
          onConfirm={(area, orientation) => {
            void upload(queue[0]!, area, orientation)
            next()
          }}
          onSkip={next}
          onCancelAll={() => setQueue([])}
        />
      )}
    </Card>
  )
}
