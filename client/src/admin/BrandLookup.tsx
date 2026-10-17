import { useEffect, useRef, useState } from 'react'
import { ApiError, api, type FragplaceBrand } from './api.ts'
import { Button, Card } from './ui.tsx'

const MIN_NAME = 2
const DEBOUNCE_MS = 900

/**
 * Looks the brand up in the fragrance database by name and offers up to 5 matches with their logo and
 * description. Searches by itself once a name is typed (when `auto`), and on demand with the button.
 */
export default function BrandLookup({
  name,
  auto,
  pickedId,
  busy,
  onPick,
}: {
  name: string
  auto: boolean
  pickedId: number | null
  busy: boolean
  onPick: (match: FragplaceBrand, replace: boolean) => void
}) {
  const [matches, setMatches] = useState<FragplaceBrand[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [replace, setReplace] = useState(false)
  const searched = useRef('')
  const query = name.trim().length >= MIN_NAME ? name.trim() : ''

  const run = async (q: string) => {
    searched.current = q
    setLoading(true)
    setError('')
    try {
      const r = await api<{ matches: FragplaceBrand[] }>(`/fragplace/brands?name=${encodeURIComponent(q)}`)
      if (searched.current === q) setMatches(r.matches)
    } catch (e) {
      if (searched.current === q) setError(e instanceof ApiError ? e.message : 'Lookup failed. Try again.')
    } finally {
      if (searched.current === q) setLoading(false)
    }
  }

  useEffect(() => {
    if (!auto || !query || query === searched.current) return
    const timer = setTimeout(() => void run(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [auto, query])

  return (
    <Card
      title="Find this brand"
      actions={
        <Button variant="secondary" busy={loading} disabled={!query} onClick={() => void run(query)}>
          {matches ? 'Search again' : 'Search'}
        </Button>
      }
    >
      <p className="text-sm text-muted">
        {query
          ? 'Pick the right match to fill in the description and logos.'
          : 'Type the brand’s full name to look it up (e.g. Guerlain, not GRLN).'}
      </p>

      {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}
      {matches && matches.length === 0 && !loading && (
        <p className="mt-3 text-sm text-muted">No matches. Try the full name, or fill the details in yourself.</p>
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
            Also replace the description and logos already there
          </label>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">
            {matches.map((m) => {
              const picked = m.id === pickedId
              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border p-2 ${picked ? 'border-accent bg-accent-soft' : 'border-border'}`}
                >
                  <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-white p-1">
                    {m.thumb && (
                      <img src={m.thumb} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.name}</span>
                    <span className="line-clamp-2 text-xs text-muted">{m.description}</span>
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
