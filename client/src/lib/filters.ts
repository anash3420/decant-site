// Filtering and sorting for the decant catalogue. The state lives in the URL, so menu links (/decants?accord=Woody)
// and shared links open the same results. Within a group the choices widen the results (Woody or Amber); across
// groups they narrow them (Woody and under $10).
import { CONCENTRATIONS, type ShopListing } from '@shared/types.ts'
import { fromOption } from '@shared/shop.ts'
import { formatPrice } from '@shared/stock.ts'
import type { Mood } from '../api/shop.ts'
import { byNewest, hasSize } from './catalog.ts'

export type GroupKey = 'price' | 'accord' | 'size' | 'mood' | 'house' | 'type' | 'worn' | 'strength'

export interface Option {
  value: string
  label: string
  /** Decants with this option in the whole catalogue (not narrowed by other choices) */
  count: number
}

export interface Group {
  key: GroupKey
  title: string
  options: Option[]
}

export type Filters = Record<GroupKey, string[]>

export const GROUP_KEYS: GroupKey[] = ['accord', 'price', 'size', 'mood', 'house', 'type', 'worn', 'strength']

/* ── Sort ── */

export const SORTS = [
  { value: 'newest', label: 'Newest first', short: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high', short: 'Price ↑' },
  { value: 'price-desc', label: 'Price, high to low', short: 'Price ↓' },
  { value: 'name', label: 'Name, A to Z', short: 'A to Z' },
] as const

export type SortValue = (typeof SORTS)[number]['value']

const price = (l: ShopListing) => fromOption(l).price

const SORTERS: Record<SortValue, (a: ShopListing, b: ShopListing) => number> = {
  newest: byNewest,
  'price-asc': (a, b) => price(a) - price(b) || a.name.localeCompare(b.name),
  'price-desc': (a, b) => price(b) - price(a) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
}

export const sortLabel = (sort: SortValue) => SORTS.find((s) => s.value === sort)!.label

/* ── Price bands (on the "From $X" price, so each decant sits in exactly one band) ── */

const BANDS = [
  { value: 'under-10', label: `Under ${formatPrice(10)}`, test: (p: number) => p < 10 },
  { value: '10-15', label: `${formatPrice(10)} to ${formatPrice(15)}`, test: (p: number) => p >= 10 && p <= 15 },
  { value: 'over-15', label: `Over ${formatPrice(15)}`, test: (p: number) => p > 15 },
]

/* ── Type: the fragrance category, with designer private shown as designer ── */

export const typeOf = (l: ShopListing) => (l.category === 'designer-private' ? 'designer' : l.category)
export const TYPE_LABELS: Record<string, string> = { niche: 'Niche', designer: 'Designer', dupe: 'Dupe' }

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Does the decant match one choice in a group? */
function matches(l: ShopListing, key: GroupKey, value: string, moods: Mood[]): boolean {
  switch (key) {
    case 'price':
      return BANDS.find((b) => b.value === value)?.test(price(l)) ?? false
    case 'accord':
      return l.accords.some((a) => same(a, value))
    case 'size':
      return hasSize(l, Number(value))
    case 'mood':
      return moods.find((m) => m.slug === value)?.picks.includes(l.slug) ?? false
    case 'house':
      return l.brandSlug === value
    case 'type':
      return typeOf(l) === value.toLowerCase()
    case 'worn':
      return same(l.gender, value)
    case 'strength':
      return same(l.concentration, value)
  }
}

export function applyFilters(catalog: ShopListing[], filters: Filters, moods: Mood[], sort: SortValue) {
  return catalog
    .filter((l) =>
      GROUP_KEYS.every((key) => filters[key].length === 0 || filters[key].some((v) => matches(l, key, v, moods))),
    )
    .sort(SORTERS[sort])
}

/** Every group with its options and whole-catalogue counts. Options with no decants are left out. */
export function buildGroups(catalog: ShopListing[], moods: Mood[]): Record<GroupKey, Group> {
  const count = (key: GroupKey, value: string) => catalog.filter((l) => matches(l, key, value, moods)).length
  const withCounts = (key: GroupKey, opts: { value: string; label: string }[]) =>
    opts.map((o) => ({ ...o, count: count(key, o.value) })).filter((o) => o.count > 0)

  const accords = [...new Set(catalog.flatMap((l) => l.accords))]
  const sizes = [...new Set(catalog.flatMap((l) => l.prices.map((p) => p.sizeMl)))].sort((a, b) => a - b)
  const houses = [...new Map(catalog.map((l) => [l.brandSlug, l.house])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  )
  const types = Object.keys(TYPE_LABELS).filter((t) => catalog.some((l) => typeOf(l) === t))
  const worn = ['Unisex', 'Masculine', 'Feminine']
  // Strongest first, only the concentrations the shop has
  const strengths = CONCENTRATIONS.filter((c) => catalog.some((l) => l.concentration === c))

  return {
    price: { key: 'price', title: 'Price', options: withCounts('price', BANDS) },
    accord: {
      key: 'accord',
      title: 'Accord',
      options: withCounts(
        'accord',
        accords.map((a) => ({ value: a, label: a })),
      ).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    },
    size: {
      key: 'size',
      title: 'Size',
      options: withCounts(
        'size',
        sizes.map((s) => ({ value: String(s), label: `${s} ml` })),
      ),
    },
    mood: {
      key: 'mood',
      title: 'Mood',
      options: withCounts(
        'mood',
        moods.map((m) => ({ value: m.slug, label: m.name })),
      ),
    },
    house: {
      key: 'house',
      title: 'House',
      options: withCounts(
        'house',
        houses.map(([value, label]) => ({ value, label })),
      ),
    },
    type: {
      key: 'type',
      title: 'Type',
      options: withCounts(
        'type',
        types.map((t) => ({ value: t, label: TYPE_LABELS[t] })),
      ),
    },
    worn: {
      key: 'worn',
      title: 'Worn by',
      options: withCounts(
        'worn',
        worn.map((w) => ({ value: w.toLowerCase(), label: w })),
      ),
    },
    strength: {
      key: 'strength',
      title: 'Strength',
      options: withCounts(
        'strength',
        strengths.map((c) => ({ value: c, label: c })),
      ),
    },
  }
}

/* ── URL ── */

export function readParams(params: URLSearchParams): { filters: Filters; sort: SortValue } {
  const filters = Object.fromEntries(
    GROUP_KEYS.map((key) => [
      key,
      params
        .getAll(key)
        .flatMap((v) => v.split(','))
        .filter(Boolean),
    ]),
  ) as Filters
  const sortParam = params.get('sort')
  const sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as SortValue) : 'newest'
  return { filters, sort }
}

export function writeParams(filters: Filters, sort: SortValue) {
  const params = new URLSearchParams()
  for (const key of GROUP_KEYS) for (const v of filters[key]) params.append(key, v)
  if (sort !== 'newest') params.set('sort', sort)
  return params
}

export const activeCount = (filters: Filters) => GROUP_KEYS.reduce((n, key) => n + filters[key].length, 0)

export const toggle = (filters: Filters, key: GroupKey, value: string): Filters => {
  const on = filters[key].some((v) => same(v, value))
  return { ...filters, [key]: on ? filters[key].filter((v) => !same(v, value)) : [...filters[key], value] }
}

export const isOn = (filters: Filters, key: GroupKey, value: string) => filters[key].some((v) => same(v, value))

export const emptyFilters = (): Filters => Object.fromEntries(GROUP_KEYS.map((k) => [k, []])) as unknown as Filters

/** The label for an active choice, as shown on its chip ("Woody", "Under $10") */
export function choiceLabel(groups: Record<GroupKey, Group>, key: GroupKey, value: string) {
  return groups[key].options.find((o) => same(o.value, value))?.label ?? value
}

/**
 * For a short result: drop one group at a time and say how many more decants that would show. Only the ones that
 * add something are offered.
 */
export function widenings(
  catalog: ShopListing[],
  filters: Filters,
  moods: Mood[],
  groups: Record<GroupKey, Group>,
  shown: number,
) {
  return GROUP_KEYS.filter((key) => filters[key].length > 0)
    .map((key) => {
      const next = { ...filters, [key]: [] }
      const kept = GROUP_KEYS.flatMap((k) => next[k].map((v) => choiceLabel(groups, k, v)))
      const anyWhat = groups[key].title.toLowerCase()
      const label = kept.length ? `${kept.join(', ')}, any ${anyWhat}` : `Any ${anyWhat}`
      const gain = applyFilters(catalog, next, moods, 'newest').length - shown
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1), gain, filters: next }
    })
    .filter((w) => w.gain > 0)
}
