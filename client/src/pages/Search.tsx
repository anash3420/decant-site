import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Fragrance } from '@shared/types.ts'
import { searchCatalog } from '../api/shop.ts'
import { CardSkeletons } from '../components/CatalogState.tsx'
import FragranceCard from '../components/FragranceCard.tsx'
import { KINDS } from '../lib/catalog.ts'

/** /search?q= : every match, in sections by listing type (empty sections hidden) */
export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const [state, setState] = useState<{ q: string; results?: Fragrance[]; error?: string }>({ q })

  useEffect(() => {
    if (!q) return
    let current = true
    searchCatalog(q)
      .then((r) => current && setState({ q, results: r.results }))
      .catch((err: Error) => current && setState({ q, error: err.message }))
    return () => {
      current = false
    }
  }, [q])

  const loading = q !== '' && (state.q !== q || (!state.results && !state.error))
  const results = state.q === q ? (state.results ?? []) : []
  const groups = KINDS.map((k) => ({ ...k, items: results.filter((f) => f.kind === k.id) })).filter(
    (g) => g.items.length,
  )

  return (
    <div className="min-w-0">
      <Link to="/" className="-my-3 inline-block py-3 text-sm text-muted hover:text-text">
        ← All fragrances
      </Link>
      <h1 className="mt-3 text-4xl break-words sm:text-5xl">{q ? `“${q}”` : 'Search'}</h1>
      {!q ? (
        <p className="mt-3 text-muted">Type a fragrance or house in the search box above.</p>
      ) : loading ? (
        <div className="mt-10" aria-busy="true">
          <CardSkeletons count={3} />
        </div>
      ) : state.error ? (
        <p role="alert" className="mt-6 rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error">
          {state.error}
        </p>
      ) : results.length === 0 ? (
        <p className="mt-3 text-muted">
          Nothing matches that right now.{' '}
          <Link to="/" className="text-accent underline underline-offset-4">
            Browse all fragrances
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-3 text-muted" aria-live="polite">
            {results.length} {results.length === 1 ? 'listing' : 'listings'}
          </p>
          {groups.map((g) => (
            <section key={g.id} className="mt-10" aria-labelledby={`results-${g.id}`}>
              <h2 id={`results-${g.id}`} className="text-2xl sm:text-3xl">
                {g.title} <span className="text-lg text-muted">({g.items.length})</span>
              </h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((f) => (
                  <FragranceCard key={f.slug} fragrance={f} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
