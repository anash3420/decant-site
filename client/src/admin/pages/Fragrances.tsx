import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type AdminFragrance } from '../api.ts'
import { Empty, ErrorBox, Loading, PageHeader, inputClass, useLoad } from '../ui.tsx'

export default function Fragrances() {
  const { data, error, loading, reload } = useLoad(() => api<{ fragrances: AdminFragrance[] }>('/fragrances'), [])
  const [filter, setFilter] = useState('')

  const shown = (data?.fragrances ?? []).filter((f) =>
    `${f.brand?.name} ${f.name}`.toLowerCase().includes(filter.trim().toLowerCase()),
  )

  return (
    <>
      <PageHeader
        title="Fragrances"
        actions={
          <Link to="/admin/fragrances/new" className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover">
            + New fragrance
          </Link>
        }
      />
      <p className="-mt-3 mb-4 text-sm text-muted">The scent itself: notes, accords and description. Each listing (decant, vial, bottle) points to one of these.</p>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name or brand"
        aria-label="Filter fragrances"
        className={`${inputClass} mb-4`}
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : shown.length === 0 ? (
        <Empty title="No fragrances match" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {shown.map((f) => (
            <li key={f.id}>
              <Link to={`/admin/fragrances/${f.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg sm:px-5">
                <span className="size-8 shrink-0 rounded-full border border-border" style={{ background: f.tint }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-muted">{f.brand?.name}</span>
                  <span className="block truncate font-medium">{f.name}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">
                  {f.listingCount} listing{f.listingCount === 1 ? '' : 's'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
