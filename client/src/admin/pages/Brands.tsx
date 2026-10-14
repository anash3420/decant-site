import { useState, type FormEvent } from 'react'
import { useToast } from '../../context/ToastContext.tsx'
import { ApiError, api, type AdminBrand } from '../api.ts'
import { Button, ErrorBox, Loading, PageHeader, inputClass, useLoad } from '../ui.tsx'

export default function Brands() {
  const toast = useToast()
  const { data, setData, error, loading, reload } = useLoad(() => api<{ brands: AdminBrand[] }>('/brands'), [])
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string }>()
  const [busy, setBusy] = useState<string>()
  const [actionError, setActionError] = useState('')

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setActionError('')
    try {
      await fn()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.')
    } finally {
      setBusy(undefined)
    }
  }

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    void run('add', async () => {
      const r = await api<{ brand: AdminBrand }>('/brands', { json: { name: newName.trim() } })
      setData({ brands: [...data!.brands, r.brand].sort((a, b) => a.name.localeCompare(b.name)) })
      setNewName('')
      toast({ title: 'Brand added', detail: r.brand.name })
    })
  }

  const rename = (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    void run('rename', async () => {
      await api(`/brands/${editing.id}`, { method: 'PATCH', json: { name: editing.name.trim() } })
      setEditing(undefined)
      await reload()
      toast({ title: 'Brand renamed' })
    })
  }

  return (
    <>
      <PageHeader title="Brands" />

      <form onSubmit={add} className="mb-6 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New brand, e.g. Amouage" aria-label="New brand name" className={inputClass} />
        <Button type="submit" busy={busy === 'add'}>
          Add
        </Button>
      </form>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error">
          {actionError}
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {data!.brands.map((b) => (
          <li key={b.id} className="px-4 py-2 sm:px-5">
            {editing?.id === b.id ? (
              <form onSubmit={rename} className="flex flex-wrap items-center gap-2 py-1">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label={`Rename ${b.name}`} autoFocus className={`${inputClass} flex-1`} />
                <Button type="submit" busy={busy === 'rename'}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(undefined)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className="block text-sm text-muted">
                    {b.fragranceCount} fragrance{b.fragranceCount === 1 ? '' : 's'} · /?brand={b.slug}
                  </span>
                </span>
                <span className="flex shrink-0">
                  <Button variant="ghost" onClick={() => setEditing({ id: b.id, name: b.name })}>
                    Rename
                  </Button>
                  {b.fragranceCount === 0 && (
                    <Button
                      variant="ghost"
                      busy={busy === `del-${b.id}`}
                      onClick={() =>
                        run(`del-${b.id}`, async () => {
                          await api(`/brands/${b.id}`, { method: 'DELETE' })
                          setData({ brands: data!.brands.filter((x) => x.id !== b.id) })
                          toast({ title: 'Brand deleted', detail: b.name })
                        })
                      }
                    >
                      Delete
                    </Button>
                  )}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">Renaming keeps the brand’s shop link the same. Brands with fragrances can’t be deleted.</p>
    </>
  )
}
