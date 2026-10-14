import { useEffect, useState, type FormEvent } from 'react'
import { useToast } from '../../context/ToastContext.tsx'
import { ApiError, api, type AdminSettings } from '../api.ts'
import { Button, Card, ErrorBox, Field, Loading, PageHeader, inputClass, useLoad } from '../ui.tsx'

export default function SettingsPage() {
  const toast = useToast()
  const { data, error, loading, reload } = useLoad(() => api<{ settings: AdminSettings }>('/settings'), [])
  const [form, setForm] = useState<AdminSettings>()
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<ApiError>()

  useEffect(() => {
    if (data) setForm(data.settings)
  }, [data])

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!form) return <Loading />

  const setOption = (i: number, p: Partial<AdminSettings['fulfilment'][number]>) =>
    setForm({ ...form, fulfilment: form.fulfilment.map((f, n) => (n === i ? { ...f, ...p } : f)) })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setSaveError(undefined)
    try {
      const r = await api<{ settings: AdminSettings }>('/settings', { method: 'PUT', json: form })
      setForm(r.settings)
      toast({ title: 'Settings saved', detail: 'The shop uses them right away.' })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err : new ApiError(0, 'error', 'Could not save.'))
    } finally {
      setBusy(false)
    }
  }

  const errors = saveError?.fieldErrors ?? {}

  return (
    <form onSubmit={save}>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Card title="Contact">
          <div className="grid gap-4">
            <Field label="Your Facebook profile link" hint="Shown on the inquiry page, thank-you screen, History and footer." error={errors.ownerFacebookUrl}>
              <input
                type="url"
                value={form.ownerFacebookUrl}
                onChange={(e) => setForm({ ...form, ownerFacebookUrl: e.target.value })}
                autoCapitalize="off"
                aria-invalid={!!errors.ownerFacebookUrl}
                className={inputClass}
              />
            </Field>
            <Field label="Tagline">
              <input value={form.siteTagline} onChange={(e) => setForm({ ...form, siteTagline: e.target.value })} maxLength={200} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="Pickup and shipping">
          <div className="space-y-4">
            {form.fulfilment.map((f, i) => (
              <div key={f.id} className={`rounded-lg border p-3 ${f.enabled ? 'border-border' : 'border-dashed border-border bg-bg'}`}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                  <input type="checkbox" checked={f.enabled} onChange={(e) => setOption(i, { enabled: e.target.checked })} className="size-5 accent-accent" />
                  Offer {f.label || f.id}
                </label>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                  <Field label="Name">
                    <input value={f.label} onChange={(e) => setOption(i, { label: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Cost ($)">
                    <input type="number" inputMode="decimal" min={0} step="any" value={f.cost} onChange={(e) => setOption(i, { cost: Number(e.target.value) })} className={inputClass} />
                  </Field>
                  <Field label="Details for buyers" className="col-span-2">
                    <input value={f.detail} onChange={(e) => setOption(i, { detail: e.target.value })} maxLength={200} className={inputClass} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          {errors.fulfilment && <p className="mt-2 text-sm font-medium text-error">{errors.fulfilment}</p>}
        </Card>

        <Card title="Lettermail limits">
          <p className="mb-3 text-sm text-muted">Above these, buyers must choose pickup or tracked shipping. Full bottles never go by lettermail.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Largest decant (ml)">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.lettermail.maxDecantMl}
                onChange={(e) => setForm({ ...form, lettermail: { ...form.lettermail, maxDecantMl: Number(e.target.value) } })}
                className={inputClass}
              />
            </Field>
            <Field label="Catch & Release total (ml)">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.lettermail.maxCatchReleaseMl}
                onChange={(e) => setForm({ ...form, lettermail: { ...form.lettermail, maxCatchReleaseMl: Number(e.target.value) } })}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        {saveError && (
          <p role="alert" className="rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error">
            {saveError.message}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" busy={busy} className="min-h-12 px-6">
            Save settings
          </Button>
        </div>
      </div>
    </form>
  )
}
