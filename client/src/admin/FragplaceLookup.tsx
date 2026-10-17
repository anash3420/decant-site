import { useEffect, useRef, useState } from 'react'
import { ApiError, api, type FragplaceMatch } from './api.ts'
import { Button, Card } from './ui.tsx'

const MIN_NAME = 2
/** Wait for typing to settle before using up a lookup */
const DEBOUNCE_MS = 900

/**
 * Finds the fragrance on Fragplace (a licensed fragrance database) by brand + name and offers up to 5 matches.
 * Searches by itself once both are filled in (when `auto`), and on demand with the button.
 * Picking one hands it to the form, which fills in the year, notes, accords and photo.
 */
export default function FragplaceLookup({
  brand,
  name,
  auto,
  pickedId,
  busy,
  onPick,
}: {
  brand?: string
  name: string
  auto: boolean
  pickedId: number | null
  busy: boolean
  onPick: (match: FragplaceMatch, replace: boolean) => void
}) {
  const [matches, setMatches] = useState<FragplaceMatch[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [replace, setReplace] = useState(false)
  const searched = useRef('')
  const query = brand && name.trim().length >= MIN_NAME ? { brand, name: name.trim() } : null
  const key = query ? `${query.brand}|${query.name}` : ''

  const run = async (q: { brand: string; name: string }, k: string) => {
    searched.current = k
    setLoading(true)
    setError('')
    try {
      const r = await api<{ matches: FragplaceMatch[] }>(
        `/fragplace?brand=${encodeURIComponent(q.brand)}&name=${encodeURIComponent(q.name)}`,
      )
      if (searched.current === k) setMatches(r.matches)
    } catch (e) {
      if (searched.current === k) setError(e instanceof ApiError ? e.message : 'Lookup failed. Try again.')
    } finally {
      if (searched.current === k) setLoading(false)
    }
  }

  useEffect(() => {
    if (!auto || !query || key === searched.current) return
    const timer = setTimeout(() => void run(query, key), DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures brand + name
  }, [auto, key])

  return (
    <Card
      title="Find this fragrance"
      actions={
        <Button variant="secondary" busy={loading} disabled={!query} onClick={() => query && void run(query, key)}>
          {matches ? 'Search again' : 'Search'}
        </Button>
      }
    >
      <p className="text-sm text-muted">
        {query
          ? 'Pick the right match to fill in the year, notes, accords and bottle photo.'
          : 'Enter the name and choose a brand to look this fragrance up.'}
      </p>

      {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}

      {matches && matches.length === 0 && !loading && (
        <p className="mt-3 text-sm text-muted">No matches. Check the spelling, or fill the details in yourself.</p>
      )}

      {matches && matches.length > 0 && (
        <>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="size-5 accent-accent"
            />
            Also replace the year, notes and accords already filled in
          </label>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">
            {matches.map((m) => {
              const picked = m.id === pickedId
              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border p-2 ${picked ? 'border-accent bg-accent-soft' : 'border-border'}`}
                >
                  {m.thumb ? (
                    <img
                      src={m.thumb}
                      alt=""
                      loading="lazy"
                      className="h-20 w-15 shrink-0 rounded bg-white object-contain"
                    />
                  ) : (
                    <span className="h-20 w-15 shrink-0 rounded bg-bg" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {m.brand}
                      {m.year ? ` · ${m.year}` : ''}
                    </span>
                    <span className="block truncate text-xs text-muted">{m.accords.slice(0, 3).join(', ')}</span>
                  </span>
                  <Button
                    variant={picked ? 'secondary' : 'primary'}
                    busy={busy && picked}
                    disabled={busy}
                    onClick={() => onPick(m, replace)}
                    className="shrink-0"
                  >
                    {picked ? 'Use again' : 'Use this'}
                  </Button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
