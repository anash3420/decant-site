import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext.tsx'
import {
  ApiError,
  api,
  type AdminBrand,
  type AdminFragrance,
  type FragplaceMatch,
  type FragrancePhoto,
} from '../api.ts'
import FragplaceLookup from '../FragplaceLookup.tsx'
import FragrancePhotoCard from '../FragrancePhotoCard.tsx'
import { Button, Card, ErrorBox, Field, Loading, PageHeader, inputClass } from '../ui.tsx'
import { CONCENTRATIONS, type Concentration, type FragranceCategory } from '@shared/types.ts'
import { CATEGORIES } from '../../lib/catalog.ts'
import { isFragplacePhoto, joinList, splitList } from '../format.ts'
import { useLoad } from '../useLoad.ts'

interface Form {
  name: string
  brand: string
  concentration: Concentration
  year: string
  gender: AdminFragrance['gender']
  category: FragranceCategory
  accords: string
  top: string
  heart: string
  base: string
  description: string
  tint: string
  photo: FragrancePhoto | null
  fragplaceId: number | null
}

const empty: Form = {
  name: '',
  brand: '',
  concentration: 'Eau de Parfum',
  year: '',
  gender: 'Unisex',
  category: 'designer',
  accords: '',
  top: '',
  heart: '',
  base: '',
  description: '',
  tint: '#B8A88A',
  photo: null,
  fragplaceId: null,
}

const toForm = (f: AdminFragrance): Form => ({
  name: f.name,
  brand: f.brand?.id ?? '',
  concentration: f.concentration,
  year: f.year ? String(f.year) : '',
  gender: f.gender,
  category: f.category,
  accords: joinList(f.accords),
  top: joinList(f.notes.top),
  heart: joinList(f.notes.heart),
  base: joinList(f.notes.base),
  description: f.description,
  tint: f.tint,
  photo: f.photo,
  fragplaceId: f.fragplaceId,
})

export default function FragranceEdit() {
  const { id } = useParams()
  const { data, error, loading, reload } = useLoad(
    () =>
      Promise.all([
        api<{ brands: AdminBrand[] }>('/brands'),
        id ? api<{ fragrance: AdminFragrance }>(`/fragrances/${id}`) : Promise.resolve(null),
      ]),
    id ?? 'new',
  )

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <FragranceForm key={id ?? 'new'} id={id} brands={data[0].brands} fragrance={data[1]?.fragrance} />
}

function FragranceForm({ id, brands, fragrance }: { id?: string; brands: AdminBrand[]; fragrance?: AdminFragrance }) {
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<Form>(() => (fragrance ? toForm(fragrance) : empty))
  const [busy, setBusy] = useState<string>()
  const [saveError, setSaveError] = useState<ApiError>()

  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }))
  const errors = saveError?.fieldErrors ?? {}

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy('save')
    setSaveError(undefined)
    const payload = {
      name: form.name,
      brand: form.brand,
      concentration: form.concentration,
      year: form.year ? Number(form.year) : null,
      gender: form.gender,
      category: form.category,
      accords: splitList(form.accords),
      notes: { top: splitList(form.top), heart: splitList(form.heart), base: splitList(form.base) },
      description: form.description,
      tint: form.tint,
      photo: form.photo,
      fragplaceId: form.fragplaceId,
    }
    try {
      const r = isNew
        ? await api<{ fragrance: AdminFragrance }>('/fragrances', { json: payload })
        : await api<{ fragrance: AdminFragrance }>(`/fragrances/${id}`, { method: 'PATCH', json: payload })
      toast({ title: isNew ? 'Fragrance added' : 'Fragrance saved', detail: r.fragrance.name })
      if (isNew) navigate('/admin/fragrances', { replace: true })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err : new ApiError(0, 'error', 'Could not save.'))
    } finally {
      setBusy(undefined)
    }
  }

  /** Fills the form from a Fragplace match: empty fields only unless `replace`, and the photo unless it's your own */
  const applyMatch = async (m: FragplaceMatch, replace: boolean) => {
    const fill = (current: string, next: string) => (next && (replace || !current.trim()) ? next : current)
    const filled: Partial<Form> = {
      fragplaceId: m.id,
      year: fill(form.year, m.year ? String(m.year) : ''),
      accords: fill(form.accords, joinList(m.accords)),
      top: fill(form.top, joinList(m.notes.top)),
      heart: fill(form.heart, joinList(m.notes.heart)),
      base: fill(form.base, joinList(m.notes.base)),
    }
    set(filled)
    const changed = (['year', 'accords', 'top', 'heart', 'base'] as const).filter((k) => filled[k] !== form[k])
    const keepOwnPhoto = form.photo && !isFragplacePhoto(form.photo)
    if (!m.thumb || keepOwnPhoto) {
      toast({
        title: changed.length ? 'Details filled in' : 'Nothing to fill in',
        detail: keepOwnPhoto ? 'Your own photo was kept.' : undefined,
      })
      return
    }
    setBusy('import')
    try {
      const photo = await api<FragrancePhoto>('/fragplace/photo', { json: { thumb: m.thumb } })
      set({ photo })
      toast({ title: 'Details filled in', detail: 'Check the details, then save.' })
    } catch (err) {
      toast({
        title: 'Details filled in, photo failed',
        detail: err instanceof ApiError ? err.message : 'Upload your own photo instead.',
      })
    } finally {
      setBusy(undefined)
    }
  }

  const remove = async () => {
    setBusy('delete')
    try {
      await api(`/fragrances/${id}`, { method: 'DELETE' })
      toast({ title: 'Fragrance deleted' })
      navigate('/admin/fragrances', { replace: true })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err : new ApiError(0, 'error', 'Could not delete.'))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        title={isNew ? 'New fragrance' : form.name || 'Fragrance'}
        back={{ to: '/admin/fragrances', label: 'Fragrances' }}
      />

      <div className="space-y-6">
        <Card title="About the scent">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                required
                aria-invalid={!!errors.name}
                className={inputClass}
                placeholder="e.g. Aventus"
              />
            </Field>
            <Field label="Brand" error={errors.brand}>
              <select
                value={form.brand}
                onChange={(e) => set({ brand: e.target.value })}
                required
                aria-invalid={!!errors.brand}
                className={inputClass}
              >
                <option value="">Choose a brand…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Link to="/admin/brands" className="mt-1 inline-flex min-h-11 items-center text-sm text-accent">
                + Add a brand
              </Link>
            </Field>
            <Field label="Concentration" error={errors.concentration}>
              <select
                value={form.concentration}
                onChange={(e) => set({ concentration: e.target.value as Concentration })}
                aria-invalid={!!errors.concentration}
                className={inputClass}
              >
                {CONCENTRATIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">Category</legend>
              <span className="mt-0.5 block text-xs text-muted">
                Shown as a label in the shop and used for the Niche / Designer / Private line / Dupe pages.
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.category === c.id ? 'border-accent bg-accent-soft' : 'border-border'}`}
                  >
                    <input
                      type="radio"
                      name="category"
                      checked={form.category === c.id}
                      onChange={() => set({ category: c.id })}
                      className="size-5 accent-accent"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year" error={errors.year}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => set({ year: e.target.value })}
                  min={1800}
                  max={2100}
                  className={inputClass}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => set({ gender: e.target.value as Form['gender'] })}
                  className={inputClass}
                >
                  <option>Unisex</option>
                  <option>Feminine</option>
                  <option>Masculine</option>
                </select>
              </Field>
            </div>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={4}
                maxLength={2000}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <FragplaceLookup
          brand={brands.find((b) => b.id === form.brand)?.name}
          name={form.name}
          // Searches by itself while the fragrance hasn't been matched yet; afterwards only on request
          auto={!form.fragplaceId}
          pickedId={form.fragplaceId}
          busy={busy === 'import'}
          onPick={(m, replace) => void applyMatch(m, replace)}
        />

        <FragrancePhotoCard
          photo={form.photo}
          tint={form.tint}
          importing={busy === 'import'}
          onChange={(photo) => set({ photo })}
        />

        <Card title="Notes and accords">
          <p className="mb-3 text-sm text-muted">Separate with commas.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accords" hint="The first three show on shop cards." className="sm:col-span-2">
              <input
                value={form.accords}
                onChange={(e) => set({ accords: e.target.value })}
                placeholder="Woody, Smoky, Fruity"
                className={inputClass}
              />
            </Field>
            <Field label="Top notes">
              <input value={form.top} onChange={(e) => set({ top: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Heart notes">
              <input value={form.heart} onChange={(e) => set({ heart: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Base notes">
              <input value={form.base} onChange={(e) => set({ base: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Drawing colour" hint="Used for the bottle drawing when there's no photo at all.">
              <input
                type="color"
                value={form.tint}
                onChange={(e) => set({ tint: e.target.value })}
                className="h-11 w-20 cursor-pointer rounded-md border border-border bg-surface"
              />
            </Field>
          </div>
        </Card>

        {saveError && (
          <p role="alert" className="rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error">
            {saveError.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isNew ? (
            <Button variant="danger" busy={busy === 'delete'} onClick={remove}>
              Delete fragrance
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" busy={busy === 'save'} disabled={busy === 'import'} className="min-h-12 px-6">
            {isNew ? 'Add fragrance' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
