import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import type { Fragrance } from '@shared/types.ts'
import { formatPrice, fromOption } from '@shared/stock.ts'
import { searchCatalog } from '../api/shop.ts'
import { KINDS } from '../lib/catalog.ts'

const SUGGESTIONS = 5

/**
 * Fragrance search with up to 5 suggestions grouped by listing type (an ARIA combobox).
 * Picking a suggestion opens that listing; Enter with none highlighted opens /search?q= with every match.
 */
export default function SearchBox({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const id = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(() => (location.pathname === '/search' ? (params.get('q') ?? '') : ''))
  const [results, setResults] = useState<Fragrance[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const latest = useRef(0)
  const box = useRef<HTMLFormElement>(null)

  // Suggestions follow the typing, 200ms after it pauses; a slow older reply never replaces a newer one
  useEffect(() => {
    const q = query.trim()
    const ticket = ++latest.current
    if (!q) return // an empty box shows no list, so old results can stay until the next search
    const timer = setTimeout(() => {
      searchCatalog(q, SUGGESTIONS)
        .then((r) => ticket === latest.current && setResults(r.results))
        .catch(() => ticket === latest.current && setResults([]))
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  // Groups in the shop's usual order; a type with no matches is left out entirely
  const groups = KINDS.map((k) => ({ ...k, items: results.filter((f) => f.kind === k.id) })).filter(
    (g) => g.items.length,
  )
  const ordered = groups.flatMap((g) => g.items)
  const showList = open && query.trim() !== '' && ordered.length > 0
  const optionId = (i: number) => `${id}-opt-${i}`

  const finish = (to: string) => {
    setOpen(false)
    setActive(-1)
    navigate(to)
    onDone?.()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (showList && active >= 0) return finish(`/fragrance/${ordered[active]!.slug}`)
    if (q) finish(`/search?q=${encodeURIComponent(q)}`)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!ordered.length) return
      e.preventDefault()
      setOpen(true)
      // Wraps through the suggestions and back to the text box (-1)
      const last = ordered.length - 1
      setActive((a) => (e.key === 'ArrowDown' ? (a >= last ? -1 : a + 1) : a < 0 ? last : a - 1))
    } else if (e.key === 'Escape') {
      if (showList) {
        e.preventDefault()
        setOpen(false)
        setActive(-1)
      } else onDone?.()
    }
  }

  return (
    <form
      ref={box}
      role="search"
      onSubmit={submit}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
      className="relative w-full"
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        Search fragrances
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Search fragrances or houses"
        className="min-h-11 w-full rounded-md border border-border bg-bg pr-3 pl-9 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none md:text-sm"
      />

      {showList && (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label="Suggestions"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {groups.map((g) => (
            <div key={g.id} role="group" aria-labelledby={`${id}-${g.id}`}>
              <p id={`${id}-${g.id}`} className="px-3 pt-2 pb-1 text-xs tracking-wide text-muted uppercase">
                {g.title}
              </p>
              {g.items.map((f) => {
                const i = ordered.indexOf(f)
                const from = fromOption(f)
                return (
                  <div
                    key={f.slug}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    // mousedown, not click: keeps focus in the box so the list doesn't close first
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => finish(`/fragrance/${f.slug}`)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 ${i === active ? 'bg-accent-soft' : ''}`}
                  >
                    {f.photos?.[0]?.src ? (
                      <img
                        src={f.photos[0].src}
                        alt=""
                        className="size-9 shrink-0 rounded object-cover object-[center_20%]"
                      />
                    ) : (
                      <span className="size-9 shrink-0 rounded" style={{ background: f.tint }} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">{f.name}</span>
                      <span className="block truncate text-xs text-muted">{f.house}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{formatPrice(from.price)}</span>
                  </div>
                )
              })}
            </div>
          ))}
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            className="mt-1 flex min-h-11 w-full items-center border-t border-border px-3 text-left text-sm text-accent hover:bg-accent-soft"
          >
            See all results for “{query.trim()}” →
          </button>
        </div>
      )}
    </form>
  )
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" strokeLinecap="round" />
    </svg>
  )
}
