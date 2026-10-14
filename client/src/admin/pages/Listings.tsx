import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BottleArt from '../../components/BottleArt.tsx'
import { api, type AdminListing, type Kind, type ListingStatus } from '../api.ts'
import { Button, Empty, ErrorBox, FilterChips, ListingStatusBadge, Loading, PageHeader, inputClass } from '../ui.tsx'
import { KIND_LABEL } from '../format.ts'
import { useLoad } from '../useLoad.ts'

function stockSummary(l: AdminListing) {
  if (l.kind === 'decant') {
    const left = (l.bottles ?? []).reduce((n, b) => n + b.remainingMl, 0)
    return { text: `${left}ml left`, low: left < 15 }
  }
  if (l.kind === 'catch-release') {
    const left = (l.vials ?? []).reduce((n, v) => n + v.qty, 0)
    return { text: `${left} vial${left === 1 ? '' : 's'} left`, low: left === 0 }
  }
  return { text: l.sold ? 'Sold' : 'Available', low: false }
}

export default function Listings() {
  const [params, setParams] = useSearchParams()
  const kind = (params.get('kind') ?? '') as Kind | ''
  const status = (params.get('status') ?? '') as ListingStatus | ''
  const search = params.get('search') ?? ''
  const [searchText, setSearchText] = useState(search)

  const { data, error, loading, reload } = useLoad(
    () =>
      api<{ listings: AdminListing[] }>(
        `/listings?${new URLSearchParams({ ...(kind && { kind }), ...(status && { status }), ...(search && { search }) })}`,
      ),
    `${kind}|${status}|${search}`,
  )

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Listings"
        actions={
          <Link
            to="/admin/listings/new"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            + New listing
          </Link>
        }
      />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          update('search', searchText.trim())
        }}
        className="mb-4 flex gap-2"
      >
        <input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Fragrance, brand or link"
          aria-label="Search listings"
          enterKeyHint="search"
          className={inputClass}
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="space-y-2">
        <FilterChips
          label="Type"
          value={kind}
          onChange={(v) => update('kind', v)}
          options={[
            { value: '', label: 'All types' },
            ...(Object.keys(KIND_LABEL) as Kind[]).map((k) => ({ value: k, label: KIND_LABEL[k] })),
          ]}
        />
        <FilterChips
          label="Status"
          value={status}
          onChange={(v) => update('status', v)}
          options={[
            { value: '', label: 'Any status' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Drafts' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
      </div>

      <div className="mt-6">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : data!.listings.length === 0 ? (
          <Empty title="No listings match">Try another filter, or add a new listing.</Empty>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {data!.listings.map((l) => {
              const stock = stockSummary(l)
              return (
                <li key={l.id}>
                  <Link
                    to={`/admin/listings/${l.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg sm:px-5"
                  >
                    {l.photos[0] ? (
                      <img
                        src={l.photos[0].url}
                        alt=""
                        className="size-14 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <BottleArt
                        tint={l.fragrance?.tint ?? '#B8A88A'}
                        variant={l.kind === 'full-bottle' ? 'bottle' : 'vial'}
                        fill={l.kind === 'full-bottle' ? (l.fillPercent ?? 70) / 100 : undefined}
                        className="size-14 shrink-0 rounded-lg"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted">{l.fragrance?.brand.name}</p>
                      <p className="truncate font-medium">{l.fragrance?.name ?? l.slug}</p>
                      <p className="text-sm text-muted">
                        {KIND_LABEL[l.kind]} ·{' '}
                        <span className={stock.low ? 'font-medium text-error' : ''}>{stock.text}</span>
                      </p>
                    </div>
                    <ListingStatusBadge status={l.status} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
