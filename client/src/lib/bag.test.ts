import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ShopListing } from '@shared/types.ts'
import { addToBag, bagLines, reconcile, setSize } from './bag.ts'

const listing = (slug: string, limits: Record<number, number>): ShopListing => ({
  slug,
  kind: 'decant',
  name: slug,
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
  prices: Object.entries(limits).map(([size, maxQty]) => ({ sizeMl: Number(size), price: 10, maxQty })),
})

// The bag is one module-level store, so these run in order on the same bag
const a = listing('a', { 3: 5, 5: 3 })

test('adding never goes past a size limit', () => {
  assert.equal(addToBag(a, 3, 4), 4)
  assert.equal(addToBag(a, 3, 4), 1) // only one more 3 ml fits
})

test('changing a line to a size already in the bag joins them, capped by that size', () => {
  addToBag(a, 5, 2)
  setSize(a, 3, 5) // 5 × 3 ml joins 2 × 5 ml, but only 3 × 5 ml are allowed
  assert.deepEqual(bagLines(), [{ slug: 'a', sizeMl: 5, qty: 3 }])
})

test('reconcile drops decants that are gone or sold out and caps quantities', () => {
  const b = listing('b', { 5: 4 })
  addToBag(b, 5, 4)
  // Restock: "a" is gone, "b" now has room for 2
  reconcile([listing('b', { 5: 2 })])
  assert.deepEqual(bagLines(), [{ slug: 'b', sizeMl: 5, qty: 2 }])
  reconcile([listing('b', { 5: 0 })])
  assert.deepEqual(bagLines(), [])
})
