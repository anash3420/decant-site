// Shared motion for the drawers and sheets (filters, sort, quick buy, bag), so they open and close alike.

/**
 * The dimmed page behind a drawer: fades in over 300 ms and out a little faster (200 ms). `instant` skips the fade
 * when one drawer hands over to another (quick buy to bag), so the dim stays steady instead of flickering.
 */
export const dimClass = (open: boolean, instant = false) =>
  `fixed inset-0 z-40 bg-[rgb(20_8_12/0.42)] transition-opacity ease-out ${instant ? 'duration-0' : open ? 'duration-300' : 'duration-200'} ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`

/**
 * The drawer itself. It opens over 400 ms with the soft drawer curve and closes quicker (260 ms, ease-out), since
 * closing is something people want over with. With reduced motion it doesn't travel; it fades in and out (200 ms).
 * Pair it with the open and closed `translate-*` classes for its side.
 */
export const slideClass = (open: boolean) =>
  `transition-[translate,opacity] motion-reduce:translate-none motion-reduce:duration-200 motion-reduce:ease-out ${open ? 'duration-[400ms] ease-lux' : 'pointer-events-none duration-[260ms] ease-out motion-reduce:opacity-0'}`
