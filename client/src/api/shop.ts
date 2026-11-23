// Data for the shop. Until the backend services exist, this serves mock data with a short delay so loading states
// are real. Swap each function body for a fetch() to the service; components don't change.
import type { ShopListing } from '@shared/types.ts'
import catalogData from '../data/mock/catalog.json'
import brandsData from '../data/mock/brands.json'
import homeData from '../data/mock/home.json'

export interface Image {
  src: string
  width: number
  height: number
}

export interface Brand {
  slug: string
  name: string
  description: string
  logo: Image
}

export interface SpotlightSlide {
  slug: string
  desktop: Image
  phone: Image
}

export interface Mood {
  slug: string
  name: string
  line: string
  picks: string[]
}

export interface HomeContent {
  spotlight: SpotlightSlide[]
  spotlightStart: number
  featuredHouses: string[]
  moods: Mood[]
}

const MOCK_DELAY_MS = 350

function mock<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY_MS))
}

// One promise per resource, shared by every component that reads it (React's use() needs a stable promise).
const cache = new Map<string, Promise<unknown>>()
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load())
  return cache.get(key) as Promise<T>
}

export const getCatalog = () => once('catalog', () => mock(catalogData.listings as ShopListing[]))
export const getBrands = () => once('brands', () => mock(brandsData.brands as Brand[]))
export const getHome = () => once('home', () => mock(homeData as HomeContent))
