import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext.tsx'
import { ApiError, api, type AdminBrand, type FragplaceBrand, type FragrancePhoto } from '../api.ts'
import BrandLookup from '../BrandLookup.tsx'
import { isLookupLogo } from '../format.ts'
import LogoCard from '../LogoCard.tsx'
import { Button, Card, ErrorBox, Field, Loading, PageHeader, inputClass } from '../ui.tsx'
import { useLoad } from '../useLoad.ts'

interface Form {
  name: string
  slug: string
  description: string
  logo: FragrancePhoto | null
  logoMobile: FragrancePhoto | null
  fragplaceId: number | null
}

const empty: Form = { name: '', slug: '', description: '', logo: null, logoMobile: null, fragplaceId: null }

export default function BrandEdit() {
  const { id } = useParams()
  const { data, error, loading, reload } = useLoad(
    () => (id ? api<{ brand: AdminBrand }>(`/brands/${id}`) : Promise.resolve(null)),
    id ?? 'new-brand',
  )
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <Loading />
  return <BrandForm key={id ?? 'new'} id={id} brand={data?.brand} />
}

function BrandForm({ id, brand }: { id?: string; brand?: AdminBrand }) {
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<Form>(() =>
    brand
      ? {
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logo: brand.logo,
          logoMobile: brand.logoMobile,
          fragplaceId: brand.fragplaceId,
        }
      : empty,
  )
  const [busy, setBusy] = useState<string>()
  const [saveError, setSaveError] = useState<ApiError>()
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }))
  const errors = saveError?.fieldErrors ?? {}

  /** Fills in from a lookup match: empty fields only unless `replace`; logos you uploaded yourself are kept */
  const applyMatch = async (m: FragplaceBrand, replace: boolean) => {
    const canReplace = (logo: FragrancePhoto | null) => !logo || replace || isLookupLogo(logo)
    set({
      fragplaceId: m.id,
      description: m.description && (replace || !form.description.trim()) ? m.description : form.description,
    })
    if (!m.thumb || (!canReplace(form.logo) && !canReplace(form.logoMobile))) {
      toast({ title: 'Details filled in', detail: 'Your own logos were kept.' })
      return
    }
    setBusy('import')
    try {
      const r = await api<{ desktop: FragrancePhoto; mobile: FragrancePhoto }>('/fragplace/logo', {
        json: { thumb: m.thumb },
      })
      setForm((f) => ({
        ...f,
        logo: canReplace(f.logo) ? r.desktop : f.logo,
        logoMobile: canReplace(f.logoMobile) ? r.mobile : f.logoMobile,
      }))
      toast({ title: 'Details filled in', detail: 'Check the logos, then save.' })
    } catch (err) {
      toast({
        title: 'Description filled in, logo failed',
        detail: err instanceof ApiError ? err.message : 'Upload your own logo instead.',
      })
    } finally {
      setBusy(undefined)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy('save')
    setSaveError(undefined)
    const payload = {
      name: form.name,
      slug: isNew ? undefined : form.slug || undefined,
      description: form.description,
      logo: form.logo,
      logoMobile: form.logoMobile,
      fragplaceId: form.fragplaceId,
    }
    try {
      const r = isNew
        ? await api<{ brand: AdminBrand }>('/brands', { json: payload })
        : await api<{ brand: AdminBrand }>(`/brands/${id}`, { method: 'PATCH', json: payload })
      toast({ title: isNew ? 'Brand added' : 'Brand saved', detail: r.brand.name })
      navigate('/admin/brands', { replace: true })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err : new ApiError(0, 'error', 'Could not save.'))
    } finally {
      setBusy(undefined)
    }
  }

  const remove = async () => {
    setBusy('delete')
    try {
      await api(`/brands/${id}`, { method: 'DELETE' })
      toast({ title: 'Brand deleted' })
      navigate('/admin/brands', { replace: true })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err : new ApiError(0, 'error', 'Could not delete.'))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <form onSubmit={save}>
      <PageHeader title={isNew ? 'New brand' : form.name || 'Brand'} back={{ to: '/admin/brands', label: 'Brands' }} />

      <div className="space-y-6">
        <Card title="Brand">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                required
                maxLength={80}
                aria-invalid={!!errors.name}
                className={inputClass}
                placeholder="e.g. Amouage"
              />
            </Field>
            {!isNew && (
              <Field
                label="Shop link"
                hint="Used in brand links (?brand=…). Changing it breaks links already shared."
                error={errors.slug}
              >
                <input
                  value={form.slug}
                  onChange={(e) => set({ slug: e.target.value })}
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-invalid={!!errors.slug}
                  className={inputClass}
                />
              </Field>
            )}
            <Field
              label="Description"
              hint="Shown beside the logo when shoppers browse this brand."
              error={errors.description}
              className="sm:col-span-2"
            >
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

        <BrandLookup
          name={form.name}
          // Searches by itself until the brand has been matched once; afterwards only on request
          auto={!form.fragplaceId}
          pickedId={form.fragplaceId}
          busy={busy === 'import'}
          onPick={(m, replace) => void applyMatch(m, replace)}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <LogoCard
            title="Logo"
            hint="Shown in the brand banner on tablets and computers."
            logo={form.logo}
            importing={busy === 'import'}
            onChange={(logo) => set({ logo })}
          />
          <LogoCard
            title="Phone logo"
            hint="Optional: a smaller or stacked version for phones."
            logo={form.logoMobile}
            fallback={form.logo}
            importing={busy === 'import'}
            onChange={(logoMobile) => set({ logoMobile })}
          />
        </div>

        {saveError && (
          <p role="alert" className="rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error">
            {saveError.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isNew && brand?.fragranceCount === 0 ? (
            <Button variant="danger" busy={busy === 'delete'} onClick={remove}>
              Delete brand
            </Button>
          ) : (
            <span className="text-sm text-muted">{!isNew && 'Brands with fragrances can’t be deleted.'}</span>
          )}
          <Button type="submit" busy={busy === 'save'} disabled={busy === 'import'} className="min-h-12 px-6">
            {isNew ? 'Add brand' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
