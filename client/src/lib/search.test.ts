import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ShopListing } from '@shared/types.ts'
import { highlight, search } from './search.ts'

const listing = (house: string, brandSlug: string, name: string, accords: string[]) =>
  ({ house, brandSlug, name, accords, prices: [{ sizeMl: 5, price: 10, maxQty: 3 }] }) as unknown as ShopListing

const catalog = [
  listing('Amouage', 'amouage', 'Interlude M', ['Woody', 'Amber']),
  listing('Mind Games', 'mind-games', 'French Defense', ['Amber']),
  listing('Essential Parfums', 'essential-parfums', 'Bois Impérial', ['Woody']),
]

test('search suggests houses and accords and finds decants by house or name', () => {
  const r = search(catalog, 'am')
  assert.deepEqual(
    r.suggestions.map((s) => `${s.kind}:${s.label}:${s.count}`),
    ['house:Amouage:1', 'accord:Amber:2'],
  )
  assert.deepEqual(
    r.decants.map((l) => l.name),
    ['Interlude M', 'French Defense'],
  )
  assert.deepEqual(search(catalog, '   ').decants, [])
})

test('highlight marks each word, ignoring case and accents', () => {
  assert.deepEqual(highlight('Bois Impérial', 'imperial'), [
    { text: 'Bois ', match: false },
    { text: 'Impérial', match: true },
  ])
  assert.deepEqual(highlight('Mind Games', 'xyz'), [{ text: 'Mind Games', match: false }])
})
