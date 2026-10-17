import { useRef, useState } from 'react'
import { ApiError, api, type FragrancePhoto } from './api.ts'
import { resizeLogo } from './processImage.ts'
import { Button, Card } from './ui.tsx'

/**
 * One banner logo (desktop or phone). The preview sits on the shop's banner colour, the way shoppers see it.
 * Your own upload keeps its shape (no cropping) and any transparency.
 */
export default function LogoCard({
  title,
  hint,
  logo,
  fallback,
  importing,
  onChange,
}: {
  title: string
  hint: string
  logo: FragrancePhoto | null
  /** Shown faded when this logo is empty but the shop will use another one instead */
  fallback?: FragrancePhoto | null
  importing: boolean
  onChange: (logo: FragrancePhoto | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const shown = logo ?? fallback

  const upload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const { blob, width, height } = await resizeLogo(file)
      const r = await api<{ url: string; pathname: string }>('/uploads', { body: blob, contentType: blob.type })
      onChange({ url: r.url, pathname: r.pathname, width, height })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t upload that logo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card title={title}>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      <div className="flex h-32 items-center justify-center rounded-lg bg-panel p-4">
        {shown ? (
          <img
            src={shown.url}
            alt=""
            className={`max-h-full max-w-full object-contain mix-blend-multiply ${logo ? '' : 'opacity-40'}`}
          />
        ) : (
          <span className="text-sm text-muted">{importing ? 'Adding the logo…' : 'No logo yet'}</span>
        )}
      </div>
      {!logo && fallback && <p className="mt-2 text-xs text-muted">Using the desktop logo until you add one.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" busy={uploading} disabled={importing} onClick={() => input.current?.click()}>
          {logo ? 'Replace with my own' : 'Upload my own'}
        </Button>
        {logo && (
          <Button variant="ghost" disabled={importing || uploading} onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-medium text-error">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void upload(file)
        }}
      />
    </Card>
  )
}
