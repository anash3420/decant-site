import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice } from '@shared/stock.ts'
import { api, type AdminStats, type InquiryStatus, type InquirySummary } from '../api.ts'
import { Button, Empty, ErrorBox, FilterChips, Loading, PageHeader, StatusBadge, inputClass } from '../ui.tsx'
import { STATUS_LABEL, dateTime } from '../format.ts'
import { useLoad } from '../useLoad.ts'

const STATUSES: InquiryStatus[] = ['new', 'contacted', 'confirmed', 'fulfilled', 'cancelled']

export default function Inquiries() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as InquiryStatus | ''
  const search = params.get('search') ?? ''
  const page = Number(params.get('page') ?? 1)
  const [searchText, setSearchText] = useState(search)

  const { data, error, loading, reload } = useLoad(
    () =>
      Promise.all([
        api<{ inquiries: InquirySummary[]; total: number; pages: number }>(
          `/inquiries?${new URLSearchParams({ ...(status && { status }), ...(search && { search }), page: String(page) })}`,
        ),
        api<AdminStats>('/stats'),
      ]),
    `${status}|${search}|${page}`,
  )

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const counts = data?.[1].inquiries

  return (
    <>
      <PageHeader title="Inquiries" />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          update({ search: searchText.trim() })
        }}
        className="mb-4 flex gap-2"
      >
        <input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Name, reference or fragrance"
          aria-label="Search inquiries"
          enterKeyHint="search"
          className={inputClass}
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <FilterChips
        label="Status"
        value={status}
        onChange={(v) => update({ status: v })}
        options={[
          { value: '', label: 'All' },
          ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], count: counts?.[s] })),
        ]}
      />

      <div className="mt-6">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : data![0].inquiries.length === 0 ? (
          <Empty title={search ? `No inquiries match “${search}”` : 'No inquiries here yet'} />
        ) : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {data![0].inquiries.map((i) => (
                <li key={i.id}>
                  <Link
                    to={`/admin/inquiries/${i.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-bg sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {i.name} <span className="font-normal text-muted">· {i.reference}</span>
                        </p>
                        <p className="truncate text-sm text-muted">{i.itemNames.join(', ')}</p>
                        <p className="text-xs text-muted">
                          {dateTime.format(new Date(i.createdAt))} · {i.fulfilment}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={i.status} />
                        <span className="text-sm font-medium tabular-nums">{formatPrice(i.estimatedTotal)}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {data![0].pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <Button variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  ← Newer
                </Button>
                <span className="text-sm text-muted">
                  Page {page} of {data![0].pages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= data![0].pages}
                  onClick={() => update({ page: String(page + 1) })}
                >
                  Older →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
