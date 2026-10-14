import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext.tsx'
import { ApiError, api, type AdminBrand, type AdminFragrance } from '../api.ts'
import { Button, Card, ErrorBox, Field, Loading, PageHeader, inputClass, joinList, splitList, useLoad } from '../ui.tsx'

const CONCENTRATIONS = ['Eau de Parfum', 'Eau de Toilette', 'Parfum', 'Extrait de Parfum', 'Eau de Cologne', 'Elixir']

interface Form {
  name: string
  brand: string
  concentration: string
  year: string
  gender: AdminFragrance['gender']
  accords: string
  top: string
  heart: string
  base: string
  description: string
  tint: string
}

const empty: Form = { name: '', brand: '', concentration: 'Eau de Parfum', year: '', gender: 'Unisex', accords: '', top: '', heart: '', base: '', description: '', tint: '#B8A88A' }

export default function FragranceEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()

  const { data, error, loading, reload } = useLoad(
    () =>
      Promise.all([
        api<{ brands: AdminBrand[] }>('/brands'),
        isNew ? Promise.resolve(null) : api<{ fragrance: AdminFragrance }>(`/fragrances/${id}`),
      ]),
    [id],
  )
  const [form, setForm] = useState<Form>()
  const [busy, setBusy] = useState<string>()
  const [saveError, setSaveError] = useState<ApiError>()

  useEffect(() => {
    if (!data) return
    const f = data[1]?.fragrance
    setForm(
      f
        ? {
            name: f.name,
            brand: f.brand?.id ?? '',
            concentration: f.concentration,
            year: f.year ? String(f.year) : '',
            gender: f.gender,
            accords: joinList(f.accords),
            top: joinList(f.notes.top),
            heart: joinList(f.notes.heart),
            base: joinList(f.notes.base),
            description: f.description,
            tint: f.tint,
          }
        : empty,
    )
  }, [data])

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!form) return <Loading />

  const set = (p: Partial<Form>) => setForm({ ...form, ...p })
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
      accords: splitList(form.accords),
      notes: { top: splitList(form.top), heart: splitList(form.heart), base: splitList(form.base) },
      description: form.description,
      tint: form.tint,
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
      <PageHeader title={isNew ? 'New fragrance' : form.name || 'Fragrance'} back={{ to: '/admin/fragrances', label: 'Fragrances' }} />

      <div className="space-y-6">
        <Card title="About the scent">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} required aria-invalid={!!errors.name} className={inputClass} placeholder="e.g. Aventus" />
            </Field>
            <Field label="Brand" error={errors.brand}>
              <select value={form.brand} onChange={(e) => set({ brand: e.target.value })} required aria-invalid={!!errors.brand} className={inputClass}>
                <option value="">Choose a brand…</option>
                {data![0].brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Link to="/admin/brands" className="mt-1 inline-flex min-h-11 items-center text-sm text-accent">
                + Add a brand
              </Link>
            </Field>
            <Field label="Concentration">
              <input value={form.concentration} onChange={(e) => set({ concentration: e.target.value })} list="concentrations" required className={inputClass} />
              <datalist id="concentrations">
                {CONCENTRATIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year" error={errors.year}>
                <input type="number" inputMode="numeric" value={form.year} onChange={(e) => set({ year: e.target.value })} min={1800} max={2100} className={inputClass} />
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={(e) => set({ gender: e.target.value as Form['gender'] })} className={inputClass}>
                  <option>Unisex</option>
                  <option>Feminine</option>
                  <option>Masculine</option>
                </select>
              </Field>
            </div>
            <Field label="Description" className="sm:col-span-2">
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4} maxLength={2000} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="Notes and accords">
          <p className="mb-3 text-sm text-muted">Separate with commas.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accords" hint="The first three show on shop cards." className="sm:col-span-2">
              <input value={form.accords} onChange={(e) => set({ accords: e.target.value })} placeholder="Woody, Smoky, Fruity" className={inputClass} />
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
            <Field label="Placeholder colour" hint="Used for the bottle drawing until a listing has photos.">
              <input type="color" value={form.tint} onChange={(e) => set({ tint: e.target.value })} className="h-11 w-20 cursor-pointer rounded-md border border-border bg-surface" />
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
          <Button type="submit" busy={busy === 'save'} className="min-h-12 px-6">
            {isNew ? 'Add fragrance' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
