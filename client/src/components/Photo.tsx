import { memo, useState } from 'react'

interface PhotoProps {
  src: string
  alt: string
  /** Sizes the frame. The parent may size it instead (e.g. an absolutely positioned frame). */
  className?: string
  imgClassName?: string
  /** The first large image on the page: load right away instead of lazily */
  priority?: boolean
  width?: number
  height?: number
}

/**
 * An image that keeps its space while loading: the frame shows a warm shimmer, then the photo fades in.
 * Lazy by default, so photos below the fold are fetched only as they come near the screen.
 */
export const Photo = memo(function Photo({
  src,
  alt,
  className = '',
  imgClassName = '',
  priority,
  width,
  height,
}: PhotoProps) {
  const [loaded, setLoaded] = useState(false)
  return (
    <span className={`photo ${loaded ? 'is-loaded' : ''} ${className}`}>
      <img
        // A cached image can finish before React attaches onLoad
        ref={(img) => {
          if (img?.complete && img.naturalWidth) setLoaded(true)
        }}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={imgClassName}
      />
    </span>
  )
})
