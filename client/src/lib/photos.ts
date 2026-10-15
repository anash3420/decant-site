/**
 * Listing photos come in two shapes, chosen in the admin cropper:
 * landscape 4:3 (wide shots, boxes) and portrait 3:4 (a bottle standing up).
 * The shop never crops them: frames take the photo's shape, or fit it whole inside a fixed frame.
 * Keep the Tailwind `aspect-[4/3]` / `aspect-[3/4]` classes in sync if these ever change.
 */
export type Orientation = 'landscape' | 'portrait'

export const PHOTO_ASPECT: Record<Orientation, number> = {
  landscape: 4 / 3,
  portrait: 3 / 4,
}

/** Tailwind classes for a frame of each shape (literal strings so Tailwind can see them) */
export const FRAME_CLASS: Record<Orientation, string> = {
  landscape: 'aspect-[4/3]',
  portrait: 'aspect-[3/4]',
}

/** Photos saved before sizes were recorded count as landscape, which is how they were cropped */
export const orientationOf = (photo: { width?: number; height?: number } | undefined): Orientation =>
  photo?.width && photo.height && photo.height > photo.width ? 'portrait' : 'landscape'
