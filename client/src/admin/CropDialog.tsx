import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area, type MediaSize } from 'react-easy-crop'
import { PHOTO_ASPECT, type Orientation } from '../lib/photos.ts'
import type { CropArea } from './processImage.ts'
import { Button } from './ui.tsx'

const MAX_ZOOM = 4

interface Props {
  file: File
  /** e.g. "Photo 2 of 3" when several were picked at once */
  progress?: string
  onConfirm: (area: CropArea, orientation: Orientation) => void
  onSkip: () => void
  onCancelAll: () => void
}

/**
 * Full-screen cropper for one photo. Drag to move, pinch / scroll / slider to zoom.
 * The frame is landscape 4:3 or portrait 3:4 (starts in the photo's own orientation), and what's inside it
 * is exactly what shoppers will see.
 */
export default function CropDialog({ file, progress, onConfirm, onSkip, onCancelAll }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [src] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  /** width / height of the photo, once it has loaded */
  const [photoRatio, setPhotoRatio] = useState<number>()
  const area = useRef<CropArea | null>(null)

  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])

  const onMediaLoaded = useCallback(
    ({ naturalWidth, naturalHeight }: MediaSize) => {
      // The photo is decoded and on screen, so its temporary URL can go. (Not in an effect cleanup:
      // React runs those early in development, which would pull the URL away before it loads.)
      URL.revokeObjectURL(src)
      const ratio = naturalWidth / naturalHeight
      setPhotoRatio(ratio)
      // Start in the photo's own orientation: a bottle shot upright gets a portrait frame
      setOrientation(ratio < 1 ? 'portrait' : 'landscape')
    },
    [src],
  )

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    area.current = pixels
  }, [])

  const aspect = PHOTO_ASPECT[orientation]
  // Zoom at which the whole photo fits inside the frame (below 1 when the photo's shape differs from the frame's)
  const fitZoom = photoRatio ? Math.min(photoRatio / aspect, aspect / photoRatio) : 1
  const minZoom = Math.min(1, fitZoom)

  const switchTo = (next: Orientation) => {
    setOrientation(next)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
  }
  const step = (dir: 1 | -1) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(minZoom, +(z + dir * 0.2).toFixed(2))))

  return (
    <dialog
      ref={dialog}
      aria-labelledby="crop-title"
      // Esc closes a <dialog>; treat it like Cancel
      onCancel={(e) => {
        e.preventDefault()
        onCancelAll()
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-text p-0 text-surface backdrop:bg-text/80 sm:m-auto sm:h-[min(90dvh,760px)] sm:max-w-3xl sm:rounded-xl"
    >
      <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <h2 id="crop-title" className="font-display text-xl">
              Frame the photo
            </h2>
            <p className="text-xs opacity-70">
              {progress ? `${progress} · ` : ''}Drag to move, pinch or slide to zoom. Shoppers see exactly what’s inside
              the frame.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelAll}
            className="min-h-11 shrink-0 px-2 text-sm opacity-80 hover:opacity-100"
          >
            Cancel
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={minZoom}
            maxZoom={MAX_ZOOM}
            // Lets you zoom out past the edges to keep a tall bottle whole; the gap is filled white
            restrictPosition={zoom >= 1}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
            // Theme tokens: the dimmed outside uses --color-text, the frame line --color-surface
            style={{
              cropAreaStyle: {
                color: 'color-mix(in srgb, var(--color-text) 60%, transparent)',
                border: '2px solid var(--color-surface)',
              },
            }}
          />
        </div>

        <footer className="space-y-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div role="radiogroup" aria-label="Photo shape" className="flex justify-center gap-2">
            {(['landscape', 'portrait'] as const).map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={orientation === o}
                onClick={() => switchTo(o)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                  orientation === o
                    ? 'border-surface bg-surface text-text'
                    : 'border-surface/40 opacity-80 hover:opacity-100'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`rounded-[2px] border-2 border-current ${o === 'landscape' ? 'h-3 w-4' : 'h-4 w-3'}`}
                />
                {o === 'landscape' ? 'Landscape 4:3' : 'Portrait 3:4'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => step(-1)} aria-label="Zoom out" className="size-11 shrink-0 text-xl">
              −
            </button>
            <input
              type="range"
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="min-h-11 w-full accent-surface"
            />
            <button type="button" onClick={() => step(1)} aria-label="Zoom in" className="size-11 shrink-0 text-xl">
              +
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setZoom(minZoom)
                  setCrop({ x: 0, y: 0 })
                }}
                className="min-h-11 rounded-md px-3 text-sm opacity-80 hover:opacity-100"
              >
                Whole photo
              </button>
              {progress && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="min-h-11 rounded-md px-3 text-sm opacity-80 hover:opacity-100"
                >
                  Skip this one
                </button>
              )}
            </div>
            <Button
              className="min-h-12 bg-surface px-6 text-text hover:bg-accent-soft"
              onClick={() => area.current && onConfirm(area.current, orientation)}
            >
              Use this crop
            </Button>
          </div>
        </footer>
      </div>
    </dialog>
  )
}
