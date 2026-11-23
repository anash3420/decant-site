import { memo, use, useRef, useState, type ComponentProps, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ShopListing } from '@shared/types.ts'
import { fromOption } from '@shared/shop.ts'
import { formatPrice } from '@shared/stock.ts'
import { getCatalog, getHome, type SpotlightSlide } from '../api/shop.ts'
import { productPath } from '../lib/catalog.ts'
import { ChevronLeft, ChevronRight } from './icons.tsx'

const DESKTOP = '(min-width: 1024px)'

type Item = { slide: SpotlightSlide; listing: ShopListing }

/**
 * Homepage spotlight, "Pool of light": each photo fills its slide with a soft vignette, its colours pool down onto
 * a glass shelf, with a faint reflection. Desktop shows the neighbours peeking at the sides; phones show one slide
 * with the next one peeking in. Swipe, arrows or dots move it.
 *
 * Changing slide is one slow dissolve: the photo, the pool of light, the reflection and the side slides all melt
 * from the old slide into the new one together (the old layers stay underneath, so nothing ever goes blank). The
 * photo settles from slightly larger, and the caption card rises in from just below.
 */
export function Spotlight() {
  const home = use(getHome())
  const catalog = use(getCatalog())
  const slides = home.spotlight
    .map((slide) => ({ slide, listing: catalog.find((l) => l.slug === slide.slug) }))
    .filter((s): s is Item => !!s.listing)
  const start = Math.min(home.spotlightStart, slides.length - 1)
  const [view, setView] = useState({ index: start, prev: start })

  if (!slides.length) return null
  const count = slides.length
  const { index } = view
  const show = (next: number) => setView((v) => (next === v.index ? v : { index: next, prev: v.index }))
  const go = (step: number) => show((index + step + count) % count)
  const wrap = (i: number) => slides[(i + count) % count]
  const current = slides[index]
  const previous = slides[view.prev]
  const changed = previous !== current

  return (
    <section
      aria-roledescription="carousel"
      aria-label="In the spotlight"
      className="relative z-10 mx-auto mt-5 max-w-[1440px] overflow-x-clip px-4 lg:mt-10 lg:px-[30px]"
    >
      <div className="flex gap-2.5 lg:grid lg:grid-cols-[minmax(0,200px)_minmax(0,940px)_minmax(0,200px)] lg:justify-center lg:gap-5">
        <Peek
          item={wrap(index - 1)}
          was={wrap(view.prev - 1)}
          label="Previous"
          onClick={() => go(-1)}
          className="hidden lg:block"
        />

        <div className="relative w-[calc(100%-34px)] flex-none [--slide-h:420px] lg:w-auto">
          <Swipeable
            onSwipe={(dx) => go(dx < 0 ? 1 : -1)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}: ${current.listing.house} ${current.listing.name}`}
            className="spot-slide photo is-loaded relative z-[2] h-(--slide-h) touch-pan-y rounded-[14px] shadow-[0_15px_21px_-14px_rgb(20_8_12/0.5)] lg:aspect-[940/600] lg:h-auto lg:shadow-[0_22px_30px_-20px_rgb(20_8_12/0.5)]"
          >
            {/* The photos breathe very slowly while resting */}
            <div className="spot-drift absolute inset-0">
              {changed && (
                <SlidePicture key={`under-${previous.slide.slug}`} slide={previous.slide} alt="" layer="none" />
              )}
              <SlidePicture
                key={current.slide.slug}
                slide={current.slide}
                alt={`${current.listing.house} ${current.listing.name}`}
                layer={changed ? 'spot-settle' : 'none'}
              />
            </div>
            <Caption key={`caption-${current.slide.slug}`} listing={current.listing} />
          </Swipeable>

          {/* The pool of light and the reflection reuse the slide's photo (already cached by the browser) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[calc(100%-28px)] z-0 h-[133px] [--pool-blur:28px] lg:top-[calc(100%-40px)] lg:h-[190px] lg:[--pool-blur:40px]"
          >
            {changed && <Layer key={`pool-under-${previous.slide.slug}`} slide={previous.slide} img="spot-pool" />}
            <Layer
              key={`pool-${current.slide.slug}`}
              slide={current.slide}
              img="spot-pool"
              anim={changed ? 'spot-in' : ''}
            />
          </div>
          <div aria-hidden="true" className="spot-reflection z-[1] h-[98px] lg:h-[140px]">
            {changed && <Layer key={`ref-under-${previous.slide.slug}`} slide={previous.slide} img="spot-mirror" />}
            <Layer
              key={`ref-${current.slide.slug}`}
              slide={current.slide}
              img="spot-mirror"
              anim={changed ? 'spot-in' : ''}
            />
          </div>

          <ArrowButton side="left" onClick={() => go(-1)} />
          <ArrowButton side="right" onClick={() => go(1)} />
        </div>

        <Peek item={wrap(index + 1)} was={wrap(view.prev + 1)} label="Next" onClick={() => go(1)} />
      </div>

      <div className="flex justify-center pt-[90px] lg:pt-[128px]">
        {slides.map((s, i) => (
          <button
            key={s.slide.slug}
            type="button"
            aria-label={`Show ${s.listing.name}`}
            aria-current={i === index}
            onClick={() => show(i)}
            className="flex h-11 items-center px-1"
          >
            <i className={`spot-dot block h-[3px] rounded-sm ${i === index ? 'w-10 bg-wine' : 'w-6 bg-line lg:w-7'}`} />
          </button>
        ))}
      </div>
    </section>
  )
}

/** The slide photo: the desktop crop on wide screens, the portrait crop on phones */
const SlidePicture = memo(function SlidePicture({
  slide,
  alt,
  layer,
}: {
  slide: SpotlightSlide
  alt: string
  layer: 'spot-settle' | 'none'
}) {
  return (
    <picture>
      <source media={DESKTOP} srcSet={slide.desktop.src} width={slide.desktop.width} height={slide.desktop.height} />
      <img
        src={slide.phone.src}
        width={slide.phone.width}
        height={slide.phone.height}
        alt={alt}
        fetchPriority="high"
        draggable={false}
        className={`absolute inset-0 size-full object-cover ${layer === 'none' ? '' : layer}`}
      />
    </picture>
  )
})

/** One layer of the pool of light or the reflection */
function Layer({ slide, img, anim = '' }: { slide: SpotlightSlide; img: 'spot-pool' | 'spot-mirror'; anim?: string }) {
  return (
    <picture>
      <source media={DESKTOP} srcSet={slide.desktop.src} />
      <img
        src={slide.phone.src}
        alt=""
        className={`${img} ${anim} ${img === 'spot-pool' ? 'top-0 h-[119px] lg:h-[170px]' : 'h-(--slide-h) lg:aspect-[940/600] lg:h-auto'}`}
      />
    </picture>
  )
}

/** The caption card glides up out of the bottom edge of the photo each time the slide changes */
function Caption({ listing }: { listing: ShopListing }) {
  const { price, sizeMl } = fromOption(listing)
  return (
    <div className="spot-caption absolute bottom-2.5 left-2.5 z-[3] grid grid-cols-[auto_auto] gap-x-[22px] rounded-[10px] bg-white px-3.5 py-2.5 text-ink shadow-[0_10px_30px_rgb(15_23_32/0.18)] [--cap-gap:10px] lg:bottom-6 lg:left-6 lg:block lg:w-[270px] lg:rounded-xl lg:px-[22px] lg:py-[18px] lg:[--cap-gap:24px]">
      <span className="col-start-1 block text-[11px] font-medium tracking-[0.02em] text-wine lg:text-[13px]">
        {listing.house}
      </span>
      <span className="col-start-1 mb-0.5 block font-display text-[19px] leading-[1.1] lg:mt-0.5 lg:mb-2 lg:text-[28px]">
        {listing.name}
      </span>
      <span className="col-start-1 block text-[13px] leading-[1.15] font-medium lg:text-[15px] lg:leading-normal">
        From {formatPrice(price)} for {sizeMl} ml
      </span>
      <Link
        to={productPath(listing.slug)}
        className="relative -top-1.5 col-start-2 row-start-3 self-end justify-self-end link-line pb-[3px] text-sm leading-none whitespace-nowrap text-wine before:absolute before:-inset-x-3 before:-inset-y-4 before:content-[''] lg:static lg:mt-3 lg:inline-block lg:pb-0 lg:leading-normal lg:text-ink lg:[--link-line-color:currentColor]"
      >
        Discover
      </Link>
    </div>
  )
}

function Peek({
  item,
  was,
  label,
  onClick,
  className = '',
}: {
  item: Item
  /** The slide that was here before the last change; it stays underneath while the new one dissolves in */
  was: Item
  label: string
  onClick: () => void
  className?: string
}) {
  const changed = was !== item
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${label}: ${item.listing.name}`}
      onClick={onClick}
      className={`photo is-loaded relative h-[420px] w-6 flex-none rounded-[14px] opacity-60 lg:h-auto lg:w-auto lg:opacity-50 ${className}`}
    >
      {changed && <PeekPicture key={`under-${was.slide.slug}`} slide={was.slide} anim="" />}
      <PeekPicture key={item.slide.slug} slide={item.slide} anim={changed ? 'spot-in-late' : ''} />
    </button>
  )
}

function PeekPicture({ slide, anim }: { slide: SpotlightSlide; anim: string }) {
  return (
    <picture>
      <source media={DESKTOP} srcSet={slide.desktop.src} />
      <img
        src={slide.phone.src}
        alt=""
        draggable={false}
        className={`absolute inset-0 size-full object-cover ${anim}`}
      />
    </picture>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      onClick={onClick}
      className={`absolute top-[46%] z-[4] hidden size-12 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgb(15_23_32/0.12)] transition-[background-color,transform] duration-[250ms] ease-out hover:bg-ivory active:scale-[0.97] active:duration-150 lg:flex ${side === 'left' ? '-left-6' : '-right-6'}`}
    >
      {side === 'left' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  )
}

/** Same footprint as the spotlight while its data loads */
export function SpotlightSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto mt-5 max-w-[1440px] px-4 lg:mt-10 lg:px-[30px]">
      <div className="flex gap-2.5 lg:grid lg:grid-cols-[minmax(0,200px)_minmax(0,940px)_minmax(0,200px)] lg:justify-center lg:gap-5">
        <span className="photo hidden rounded-[14px] opacity-50 lg:block" />
        <span className="photo h-[420px] w-[calc(100%-34px)] flex-none rounded-[14px] lg:aspect-[940/600] lg:h-auto lg:w-auto" />
        <span className="photo h-[420px] w-6 flex-none rounded-[14px] opacity-50 lg:h-auto lg:w-auto" />
      </div>
      <div className="h-[134px] lg:h-[172px]" />
    </div>
  )
}

/**
 * Swipe with feedback: the slide follows the finger a little (damped, capped) so the gesture feels connected,
 * then eases back. It moves the element directly, so dragging causes no React re-renders.
 */
function Swipeable({ onSwipe, children, ...rest }: { onSwipe: (dx: number) => void } & ComponentProps<'div'>) {
  const ref = useRef<HTMLDivElement>(null)
  const startX = useRef<number | null>(null)

  const move = (dx: number, animate: boolean) => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.style.transition = animate ? 'transform 600ms var(--ease-lux)' : 'none'
    el.style.transform = dx ? `translateX(${Math.max(-48, Math.min(48, dx * 0.3))}px)` : ''
  }
  const end = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    startX.current = null
    move(0, true)
    if (!cancelled && Math.abs(dx) > 40) onSwipe(dx)
  }

  return (
    <div
      {...rest}
      ref={ref}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || e.button === 0) startX.current = e.clientX
      }}
      onPointerMove={(e) => {
        if (startX.current !== null) move(e.clientX - startX.current, false)
      }}
      onPointerUp={(e) => end(e, false)}
      // The browser took over (a vertical scroll) or the pointer left: ease back, don't change slide
      onPointerCancel={(e) => end(e, true)}
      onPointerLeave={(e) => end(e, true)}
    >
      {children}
    </div>
  )
}
