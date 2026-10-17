import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Fragrance } from '@shared/types.ts'
import { normalize } from '@shared/search.ts'
import { searchCatalog } from '../api/shop.ts'
import { CardSkeletons } from '../components/CatalogState.tsx'
import BrandBanner from '../components/BrandBanner.tsx'
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
  const house = brandHit(results, q)
  const count = `${results.length} ${results.length === 1 ? 'listing' : 'listings'}`

  return (
    <div className="min-w-0">
      <Link to="/" className="-my-3 inline-block py-3 text-sm text-muted hover:text-text">
        ← All fragrances
      </Link>

      <header className="mt-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
            {house ? 'House' : 'Search results'}
          </p>
          <h1 className="mt-1 text-4xl break-words sm:text-5xl">{house ?? (q || 'Search')}</h1>
        </div>
      </header>
      {house && <BrandBanner name={house} className="mt-6" />}

      {!q ? (
        <p className="mt-4 text-muted">Type a fragrance or house in the search box above.</p>
      ) : loading ? (
        <div className="mt-10" aria-busy="true">
          <CardSkeletons count={3} />
        </div>
      ) : state.error ? (
        <p role="alert" className="mt-6 rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error">
          {state.error}
        </p>
      ) : results.length === 0 ? (
        <p className="mt-4 text-muted">
          Nothing matches that right now.{' '}
          <Link to="/" className="text-accent underline underline-offset-4">
            Browse all fragrances
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-4 text-muted" aria-live="polite">
            {count}
            {/* Keep what they typed visible when it was matched to a house */}
            {house && normalize(house) !== normalize(q) && <> · matched from your search for {q}</>}
          </p>
          {groups.length > 1 && (
            <nav aria-label="Jump to" className="mt-5 flex flex-wrap gap-2">
              {groups.map((g) => (
                <a
                  key={g.id}
                  href={`#results-${g.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm hover:border-muted"
                >
                  {g.title}
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent tabular-nums">
                    {g.items.length}
                  </span>
                </a>
              ))}
            </nav>
          )}
          {groups.map((g) => (
            <section
              key={g.id}
              id={`results-${g.id}`}
              className="mt-10 scroll-mt-6"
              aria-labelledby={`results-${g.id}-title`}
            >
              <h2 id={`results-${g.id}-title`} className="text-2xl sm:text-3xl">
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

/** The house name when the search was really for one house: every result is theirs and the name contains the query */
function brandHit(results: Fragrance[], q: string) {
  const house = results[0]?.house
  if (!house || !results.every((f) => f.house === house)) return null
  return normalize(house).includes(normalize(q)) ? house : null
}
