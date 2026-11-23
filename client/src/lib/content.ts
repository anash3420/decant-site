// Shop text and rules that change with the business (email, shipping, announcements) live in content/site.json.
// Text there can use {lettermailFree}, {trackedFree}, {lettermailCost}, {trackedCost} and {location}, so a shipping
// price or the city is only ever written once.
import { formatPrice } from '@shared/stock.ts'
import site from '../content/site.json'

export { site }

const tokens: Record<string, string> = {
  lettermailFree: formatPrice(site.shipping.lettermail.freeFrom),
  trackedFree: formatPrice(site.shipping.tracked.freeFrom),
  lettermailCost: formatPrice(site.shipping.lettermail.cost),
  trackedCost: formatPrice(site.shipping.tracked.cost),
  location: site.location,
}

export const fill = (text: string) => text.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match)
