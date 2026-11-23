import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PER_SIZE, fromOption, isSoldOut, toShopListing } from './shop.ts'
import type { DecantListing } from './types.ts'

const listing = (remaining: number[]): DecantListing => ({
  slug: 'x',
  kind: 'decant',
  name: 'X',
  house: 'H',
  brandSlug: 'h',
  category: 'niche',
  concentration: 'Eau de Parfum',
  gender: 'Unisex',
  accords: [],
  notes: { top: [], heart: [], base: [] },
  description: '',
  tint: '',
  addedAt: '2026-01-01',
  bottles: remaining.map((ml, i) => ({ id: String(i), sizeMl: 100, remainingMl: ml })),
  prices: [
    { sizeMl: 3, price: 14 },
    { sizeMl: 10, price: 35 },
  ],
})

test('shoppers never get bottles or ml left', () => {
  const shop = toShopListing({ ...listing([40]), sourcedFrom: 'secret' } as DecantListing)
  assert.equal('bottles' in shop, false)
  assert.equal('sourcedFrom' in shop, false)
  assert.equal(JSON.stringify(shop).includes('remainingMl'), false)
})

test('each size gets the most a shopper can add, capped so it hides the ml left', () => {
  const shop = toShopListing(listing([20, 5])) // 25 ml in all
  assert.deepEqual(
    shop.prices.map((p) => p.maxQty),
    [Math.min(MAX_PER_SIZE, 8), 2],
  )
  assert.equal(toShopListing(listing([500])).prices[0].maxQty, MAX_PER_SIZE)
})

test('sold out and "From $X" follow what is in stock', () => {
  const low = toShopListing(listing([5])) // a 3 ml fits, a 10 ml doesn't
  assert.equal(isSoldOut(low), false)
  assert.equal(fromOption(low).sizeMl, 3)
  const empty = toShopListing(listing([2]))
  assert.equal(isSoldOut(empty), true)
  assert.equal(fromOption(empty).price, 14) // cheapest overall when sold out
})
