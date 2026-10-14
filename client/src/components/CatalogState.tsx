import { useShop } from '../context/ShopContext.tsx'

/** Placeholder cards while the catalog loads, sized like the real ones so nothing jumps */
export function CardSkeletons({ count = 3, row = false }: { count?: number; row?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={
        row
          ? '-mx-5 no-scrollbar flex gap-4 overflow-hidden px-5 sm:mx-0 sm:px-0'
          : 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`overflow-hidden rounded-xl border border-border bg-surface ${row ? 'w-[78%] shrink-0 sm:w-64' : ''}`}
        >
          <div className="aspect-[4/3] animate-pulse bg-accent-soft/60" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-border" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-border" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Shown when the first catalog load fails (e.g. offline) */
export function CatalogError() {
  const { error, refresh } = useShop()
  return (
    <div role="alert" className="rounded-xl border border-error/30 bg-error-soft p-5">
      <p className="font-medium text-error">{error?.message ?? 'The shop couldn’t load.'}</p>
      <button
        type="button"
        onClick={() => void refresh()}
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  )
}
