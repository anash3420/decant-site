import { HeartIcon } from './icons.tsx'

/**
 * The heart inside a save button. When `burst` changes while saved, the save moment plays: the heart springs in, a
 * thin burgundy ring spreads from it and small burgundy and gold sparks fly out and fade (`.heart-burst` in
 * index.css). Unsaving just empties the heart.
 */
export function SavedHeart({ saved, burst, size = 20 }: { saved: boolean; burst: number; size?: number }) {
  return (
    // A new key per save restarts the animation
    <span key={burst} className={`inline-flex ${saved && burst ? 'heart-burst' : ''}`}>
      <HeartIcon size={size} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-wine' : ''} />
    </span>
  )
}
