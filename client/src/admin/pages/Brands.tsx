import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type AdminBrand } from '../api.ts'
import { Empty, ErrorBox, Loading, PageHeader, inputClass } from '../ui.tsx'
import { useLoad } from '../useLoad.ts'

export default function Brands() {
  const { data, error, loading, reload } = useLoad(() => api<{ brands: AdminBrand[] }>('/brands'), 'brands')
  const [filter, setFilter] = useState('')
  const shown = (data?.brands ?? []).filter((b) => b.name.toLowerCase().includes(filter.trim().toLowerCase()))

  return (
    <>
      <PageHeader
        title="Brands"
        actions={
          <Link
            to="/admin/brands/new"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            + New brand
          </Link>
        }
      />
      <p className="-mt-3 mb-4 text-sm text-muted">
        The house behind each fragrance. Its logo and description show when shoppers browse the brand.
      </p>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter brands"
        aria-label="Filter brands"
        className={`${inputClass} mb-4`}
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : shown.length === 0 ? (
        <Empty title="No brands match" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {shown.map((b) => (
            <li key={b.id}>
              <Link
                to={`/admin/brands/${b.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg sm:px-5"
              >
                <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-panel p-1.5">
                  {b.logo ? (
                    <img
                      src={b.logo.url}
                      alt=""
                      loading="lazy"
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                  ) : (
                    <span className="text-xs text-muted">No logo</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {b.fragranceCount} fragrance{b.fragranceCount === 1 ? '' : 's'}
                    {!b.logo && !b.description && ' · no logo or description yet'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
