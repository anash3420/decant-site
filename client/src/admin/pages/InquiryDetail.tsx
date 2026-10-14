import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice } from '@shared/stock.ts'
import { useToast } from '../../context/ToastContext.tsx'
import { ApiError, api, type AdminInquiry, type InquiryStatus } from '../api.ts'
import { Button, Card, ErrorBox, Field, Loading, PageHeader, StatusBadge, inputClass } from '../ui.tsx'
import { KIND_LABEL, STATUS_LABEL, dateTime } from '../format.ts'
import { useLoad } from '../useLoad.ts'

const ACTION_LABEL: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Mark contacted',
  confirmed: 'Mark confirmed',
  fulfilled: 'Mark fulfilled',
  cancelled: 'Cancel inquiry',
}

/** A ready-to-paste Messenger reply summarising the inquiry */
function replyText(i: AdminInquiry) {
  const first = i.contact.name.split(' ')[0]
  const lines = i.items.map(
    (it) =>
      `• ${it.qty > 1 ? `${it.qty} × ` : ''}${it.nameSnapshot} (${it.optionLabel}) — ${formatPrice(it.unitPrice * it.qty)}`,
  )
  return [
    `Hi ${first}! Thanks for your inquiry ${i.reference} 🙂`,
    '',
    ...lines,
    `${i.fulfilment.label}: ${i.fulfilment.cost ? formatPrice(i.fulfilment.cost) : 'free'}`,
    `Total: ${formatPrice(i.estimatedTotal)}`,
    '',
    'Everything is set aside for you. Let me know how you’d like to pay and I’ll get it ready.',
  ].join('\n')
}

export default function InquiryDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { data, setData, error, loading, reload } = useLoad(
    () => api<{ inquiry: AdminInquiry }>(`/inquiries/${id}`),
    id,
  )
  const [note, setNote] = useState('')
  const [adminNotes, setAdminNotes] = useState<string>()
  const [busy, setBusy] = useState<string>()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [actionError, setActionError] = useState('')

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const i = data!.inquiry
  const notesValue = adminNotes ?? i.adminNotes

  const patch = async (body: Record<string, unknown>, label: string) => {
    setBusy(label)
    setActionError('')
    try {
      const r = await api<{ inquiry: AdminInquiry }>(`/inquiries/${id}`, { method: 'PATCH', json: body })
      setData(r)
      return r.inquiry
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save.')
    } finally {
      setBusy(undefined)
    }
  }

  const changeStatus = async (status: InquiryStatus) => {
    const updated = await patch({ status, note: note.trim() || undefined }, status)
    if (updated) {
      setNote('')
      setConfirmCancel(false)
      toast({
        title: `Marked ${STATUS_LABEL[status].toLowerCase()}`,
        detail: status === 'cancelled' ? 'Stock has been released back to the shop.' : i.reference,
      })
    }
  }

  const copyReply = async () => {
    try {
      await navigator.clipboard.writeText(replyText(i))
      toast({ title: 'Reply copied', detail: 'Paste it in Messenger.' })
    } catch {
      setActionError('Copy failed. Select the text in the preview instead.')
    }
  }

  return (
    <>
      <PageHeader title={`Inquiry ${i.reference}`} back={{ to: '/admin/inquiries', label: 'Inquiries' }} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card title={i.contact.name} actions={<StatusBadge status={i.status} />}>
            <p className="text-sm text-muted">Sent {dateTime.format(new Date(i.createdAt))}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={i.contact.facebook.startsWith('http') ? i.contact.facebook : `https://${i.contact.facebook}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
              >
                Open their Facebook ↗
              </a>
              <Button variant="secondary" onClick={copyReply}>
                Copy reply message
              </Button>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs tracking-wide text-muted uppercase">Delivery</dt>
                <dd className="mt-0.5">
                  {i.fulfilment.label}
                  {i.fulfilment.location && <span className="block text-muted">{i.fulfilment.location}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted uppercase">Stock</dt>
                <dd className="mt-0.5">
                  {i.stockHeld ? (i.status === 'fulfilled' ? 'Deducted' : 'Held for this inquiry') : 'Released'}
                </dd>
              </div>
              {i.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs tracking-wide text-muted uppercase">Their notes</dt>
                  <dd className="mt-0.5 whitespace-pre-line">“{i.notes}”</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Items">
            <ul className="-my-2 divide-y divide-border">
              {i.items.map((it) => (
                <li
                  key={`${it.listingId}-${it.optionLabel}`}
                  className="flex items-baseline justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/listings/${it.listingId}`}
                      className="inline-block py-0.5 font-medium hover:text-accent"
                    >
                      {it.nameSnapshot}
                    </Link>
                    <p className="text-muted">
                      {KIND_LABEL[it.kind]} · {it.optionLabel} · {it.qty} × {formatPrice(it.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">{formatPrice(it.unitPrice * it.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Items</dt>
                <dd className="tabular-nums">{formatPrice(i.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{i.fulfilment.label}</dt>
                <dd className="tabular-nums">{i.fulfilment.cost ? formatPrice(i.fulfilment.cost) : 'Free'}</dd>
              </div>
              <div className="flex justify-between text-base font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(i.estimatedTotal)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Update status">
            {i.nextStatuses.length === 0 ? (
              <p className="text-sm text-muted">
                This inquiry is {STATUS_LABEL[i.status].toLowerCase()}. No further changes.
              </p>
            ) : (
              <>
                <Field label="Note (optional)" hint="Saved with the status change, e.g. “paid by e-transfer”.">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    className={inputClass}
                  />
                </Field>
                <div className="mt-4 flex flex-col gap-2">
                  {i.nextStatuses
                    .filter((s) => s !== 'cancelled')
                    .map((s) => (
                      <Button key={s} busy={busy === s} onClick={() => changeStatus(s)}>
                        {ACTION_LABEL[s]}
                      </Button>
                    ))}
                  {i.nextStatuses.includes('cancelled') &&
                    (confirmCancel ? (
                      <div className="rounded-lg border border-error/30 bg-error-soft p-3 text-sm">
                        <p className="font-medium text-error">Cancel {i.reference}?</p>
                        <p className="mt-1 text-text">Held stock goes back on sale. This can’t be undone.</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="danger"
                            busy={busy === 'cancelled'}
                            onClick={() => changeStatus('cancelled')}
                          >
                            Yes, cancel
                          </Button>
                          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                            Keep it
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                        Cancel inquiry
                      </Button>
                    ))}
                </div>
              </>
            )}
            {actionError && (
              <p role="alert" className="mt-3 text-sm font-medium text-error">
                {actionError}
              </p>
            )}
          </Card>

          <Card title="Private notes">
            <textarea
              value={notesValue}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              aria-label="Private notes"
              placeholder="Only you see these."
              className={inputClass}
            />
            <Button
              variant="secondary"
              className="mt-3"
              busy={busy === 'notes'}
              disabled={notesValue === i.adminNotes}
              onClick={async () => {
                if (await patch({ adminNotes: notesValue }, 'notes')) {
                  setAdminNotes(undefined)
                  toast({ title: 'Notes saved' })
                }
              }}
            >
              Save notes
            </Button>
          </Card>

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {[...i.statusHistory].reverse().map((h, n) => (
                <li key={n} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <div>
                    <p className="font-medium">{STATUS_LABEL[h.status]}</p>
                    <p className="text-muted">{dateTime.format(new Date(h.at))}</p>
                    {h.note && <p className="mt-0.5">“{h.note}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  )
}
