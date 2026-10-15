import { Link } from 'react-router-dom'
import type { Fragrance } from '@shared/types.ts'
import { formatPrice, fromOption, isSoldOut } from '@shared/stock.ts'
import BottleArt from './BottleArt.tsx'
import StockBadge from './StockBadge.tsx'
import CategoryBadge from './CategoryBadge.tsx'

function priceLine(f: Fragrance) {
  const from = fromOption(f)
  switch (f.kind) {
    case 'decant':
      return (
        <>
          From <span className="font-medium text-text">{formatPrice(from.price)}</span> for {from.label}
        </>
      )
    case 'catch-release':
      return (
        <>
          {f.vials.length > 1 ? 'From ' : ''}
          <span className="font-medium text-text">{formatPrice(from.price)}</span> · {from.label}
        </>
      )
    case 'full-bottle':
      return (
        <>
          <span className="font-medium text-text">{formatPrice(f.price)}</span> · {f.bottleSizeMl}ml
        </>
      )
  }
}

export default function FragranceCard({ fragrance: f }: { fragrance: Fragrance }) {
  const soldOut = isSoldOut(f)
  const cover = f.photos?.[0]

  return (
    <Link
      to={`/fragrance/${f.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md"
    >
      {cover?.src ? (
        <img
          src={cover.src}
          alt=""
          loading="lazy"
          // Cards share one 4:3 grid; the cover fills it edge to edge (same proportions, overflow trimmed).
          // A portrait photo loses some height: aim the trim lower so a bottle keeps its cap (20% from the top).
          // Detail pages still show every photo whole.
          className={`aspect-[4/3] w-full object-cover object-[center_20%] ${soldOut ? 'opacity-60 grayscale' : ''}`}
        />
      ) : (
        <BottleArt
          tint={f.tint}
          variant={cover?.variant ?? (f.kind === 'full-bottle' ? 'bottle' : 'vial')}
          fill={cover?.fill ?? (f.kind === 'full-bottle' ? f.fillPercent / 100 : undefined)}
          className={`aspect-[4/3] ${soldOut ? 'opacity-60 grayscale' : ''}`}
        />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm text-muted">{f.house}</p>
          <CategoryBadge category={f.category} />
        </div>
        <h3 className="mt-1 text-2xl group-hover:text-accent">{f.name}</h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {f.kind === 'full-bottle' ? (
            <>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                ~{f.fillPercent}% full
              </span>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                {f.hasBox ? 'With box' : 'No box'}
              </span>
            </>
          ) : (
            f.accords.slice(0, 3).map((a) => (
              <span key={a} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                {a}
              </span>
            ))
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="text-sm text-muted">{priceLine(f)}</p>
          <StockBadge
            inStock={!soldOut}
            label={f.kind === 'full-bottle' ? (soldOut ? 'Sold' : 'Available') : undefined}
          />
        </div>
      </div>
    </Link>
  )
}
