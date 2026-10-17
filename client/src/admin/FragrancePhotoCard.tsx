import { useRef, useState } from 'react'
import BottleArt from '../components/BottleArt.tsx'
import CropDialog from './CropDialog.tsx'
import { ApiError, api, type FragrancePhoto } from './api.ts'
import { cropAndResize } from './processImage.ts'
import { isFragplacePhoto } from './format.ts'
import { Button, Card } from './ui.tsx'

/**
 * The fragrance's own bottle photo. Listings without photos of their own show it in the shop.
 * Comes from Fragplace when you pick a match; you can replace it with your own (framed in the cropper).
 */
export default function FragrancePhotoCard({
  photo,
  tint,
  importing,
  onChange,
}: {
  photo: FragrancePhoto | null
  tint: string
  importing: boolean
  onChange: (photo: FragrancePhoto | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File>()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (f: File, area: Parameters<typeof cropAndResize>[1], orientation: 'landscape' | 'portrait') => {
    setUploading(true)
    setError('')
    try {
      const { blob, width, height } = await cropAndResize(f, area, orientation)
      const r = await api<{ url: string; pathname: string }>('/uploads', { body: blob, contentType: blob.type })
      onChange({ url: r.url, pathname: r.pathname, width, height })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t upload that photo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card title="Bottle photo">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-white sm:w-40">
          {photo ? (
            <img src={photo.url} alt="" className="aspect-[3/4] w-full object-contain" />
          ) : (
            <BottleArt tint={tint} variant="bottle" className="aspect-[3/4]" />
          )}
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-sm text-muted">
            {importing
              ? 'Copying the photo from Fragplace…'
              : photo
                ? isFragplacePhoto(photo)
                  ? 'From Fragplace. Wrong bottle? Upload your own instead.'
                  : 'Your own photo.'
                : 'No photo yet. Pick a Fragplace match or upload your own.'}
          </p>
          <p className="mt-1 text-xs text-muted">Shown in the shop for listings that don’t have photos of their own.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" busy={uploading} disabled={importing} onClick={() => input.current?.click()}>
              {photo ? 'Replace with my own' : 'Upload my own'}
            </Button>
            {photo && (
              <Button variant="ghost" disabled={importing || uploading} onClick={() => onChange(null)}>
                Remove
              </Button>
            )}
          </div>
          {error && <p className="mt-2 text-sm font-medium text-error">{error}</p>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) setFile(e.target.files[0])
          e.target.value = ''
        }}
      />
      {file && (
        <CropDialog
          key={`${file.name}-${file.lastModified}`}
          file={file}
          onConfirm={(area, orientation) => {
            void upload(file, area, orientation)
            setFile(undefined)
          }}
          onSkip={() => setFile(undefined)}
          onCancelAll={() => setFile(undefined)}
        />
      )}
    </Card>
  )
}
