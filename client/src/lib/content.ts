// Shop text and rules that change with the business (email, shipping, announcements) live in content/site.json.
// Text there can use {lettermailFree}, {trackedFree}, {lettermailCost}, {trackedCost}, {location}, {email} and
// {shopName}, so a shipping price, the city, the address or the shop's name is only ever written once.
import { DEFAULT_LETTERMAIL_LIMITS } from '@shared/shipping.ts'
import { formatPrice } from '@shared/stock.ts'
import site from '../content/site.json'

export { site }

const tokens: Record<string, string> = {
  lettermailFree: formatPrice(site.shipping.lettermail.freeFrom),
  trackedFree: formatPrice(site.shipping.tracked.freeFrom),
  lettermailCost: formatPrice(site.shipping.lettermail.cost),
  trackedCost: formatPrice(site.shipping.tracked.cost),
  location: site.location,
  email: site.email,
  shopName: site.shopName,
  // The largest decant lettermail takes; anything bigger goes tracked (shared/shipping.ts)
  lettermailMaxMl: String(DEFAULT_LETTERMAIL_LIMITS.maxDecantMl),
}

export const fill = (text: string) => text.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match)
