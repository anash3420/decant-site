import { useState } from 'react'
import type { Photo as ListingPhoto } from '@shared/types.ts'
import { Photo } from '../Photo.tsx'
import { Dots, PhotoViewer } from './PhotoViewer.tsx'

interface GalleryProps {
  photos: ListingPhoto[]
  house: string
  name: string
}

/**
 * The fragrance's photos. Desktop: stacked down the left, each filling a tall rounded frame. Phone: a swipe strip
 * with dots. Every photo opens the full-screen viewer; the round bubble on its corner says so.
 */
export function Gallery({ photos: all, house, name }: GalleryProps) {
  const photos = all.filter((p) => p.src)
  const [viewing, setViewing] = useState<number | null>(null)
  const [shown, setShown] = useState(0)

  return (
    <div>
      <div
        onScroll={(e) => {
          const strip = e.currentTarget
          const step = strip.scrollWidth / photos.length
          setShown(Math.round(strip.scrollLeft / step))
        }}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:snap-none lg:flex-col lg:gap-3.5 lg:overflow-visible lg:px-0"
      >
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setViewing(i)}
            aria-label={`Open photo ${i + 1} of ${photos.length}${p.label ? `, ${p.label}` : ''}`}
            className={`relative h-[300px] flex-none snap-start overflow-hidden rounded-2xl bg-[#efe6dc] lg:h-[780px] lg:w-full lg:cursor-zoom-in lg:rounded-[18px] ${photos.length > 1 ? 'w-[calc(100%-28px)]' : 'w-full'}`}
          >
            <Photo
              src={p.src!}
              alt={i === 0 ? `${house} ${name}` : ''}
              width={p.width}
              height={p.height}
              priority={i === 0}
              className="absolute! inset-0"
              imgClassName="size-full object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute right-3 bottom-3 flex size-11 items-center justify-center rounded-full border border-white/80 bg-[rgb(25_12_10/0.16)] text-white shadow-[0_4px_14px_rgb(0_0_0/0.12)] backdrop-blur-[10px] lg:right-[18px] lg:bottom-[18px] lg:size-12"
            >
              <ExpandIcon />
            </span>
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 lg:hidden">
          <Dots count={photos.length} active={shown} />
        </div>
      )}
      {viewing !== null && (
        <PhotoViewer photos={photos} start={viewing} house={house} name={name} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

function ExpandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  )
}
