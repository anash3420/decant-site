import { Link } from 'react-router-dom'
import { formatPrice } from '@shared/stock.ts'
import { api, type AdminStats, type InquirySummary } from '../api.ts'
import { Card, Empty, ErrorBox, KIND_LABEL, Loading, PageHeader, dateTime, useLoad } from '../ui.tsx'

export default function Dashboard() {
  const { data, error, loading, reload } = useLoad(
    () =>
      Promise.all([
        api<AdminStats>('/stats'),
        api<{ inquiries: InquirySummary[] }>('/inquiries?status=new&limit=5'),
      ]),
    [],
  )

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const [stats, { inquiries: fresh }] = data!

  const tiles = [
    { label: 'New', value: stats.inquiries.new, to: '/admin/inquiries?status=new', highlight: stats.inquiries.new > 0 },
    { label: 'Contacted', value: stats.inquiries.contacted, to: '/admin/inquiries?status=contacted' },
    { label: 'Confirmed', value: stats.inquiries.confirmed, to: '/admin/inquiries?status=confirmed' },
    { label: 'Open value', value: formatPrice(stats.openValue), to: '/admin/inquiries' },
  ]

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className={`rounded-xl border p-4 transition-colors ${t.highlight ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-muted'}`}
          >
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums">{t.value}</p>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        Fulfilled in the last 30 days: {stats.fulfilledLast30Days.count} ({formatPrice(stats.fulfilledLast30Days.total)} in items)
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card
          title="New inquiries"
          actions={
            <Link to="/admin/inquiries" className="inline-flex min-h-11 items-center text-sm font-medium text-accent">
              All →
            </Link>
          }
        >
          {fresh.length === 0 ? (
            <Empty title="Nothing waiting">New inquiries show up here.</Empty>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {fresh.map((i) => (
                <li key={i.id}>
                  <Link to={`/admin/inquiries/${i.id}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {i.name} <span className="font-normal text-muted">· {i.reference}</span>
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {dateTime.format(new Date(i.createdAt))} · {i.itemCount} item{i.itemCount === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatPrice(i.estimatedTotal)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Stock to look at">
          {stats.lowStock.length === 0 ? (
            <Empty title="All good">Decants under 15ml and empty Catch & Release listings show up here.</Empty>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {stats.lowStock.map((l) => (
                <li key={l.id}>
                  <Link to={`/admin/listings/${l.id}`} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-medium">{l.name}</span>
                      <span className="block text-sm text-muted">{KIND_LABEL[l.kind]}</span>
                    </span>
                    <span className="shrink-0 text-sm text-error">{l.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
