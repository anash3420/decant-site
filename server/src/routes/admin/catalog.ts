import { Router } from 'express'
import { z } from 'zod'
import { slugify } from '../../../../shared/slug.ts'
import { CONCENTRATIONS, FRAGRANCE_CATEGORIES } from '../../../../shared/types.ts'
import { HttpError, notFound } from '../../http.ts'
import { findFragrances, importFragplacePhoto } from '../../services/fragplace.ts'
import { deleteImage } from '../../services/storage.ts'
import { Brand, Fragrance, Listing } from '../../models/index.ts'
import type { LeanFragrance } from '../../models/lean.ts'
import { objectId, searchRegex } from '../../validation.ts'

/** Brands and fragrances: the reference data listings point at */
export const catalogRouter = Router()

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,120}$/, 'Use lowercase letters, numbers and dashes')

// ── Brands ─────────────────────────────────────────────────────────────────────

catalogRouter.get('/brands', async (_req, res) => {
  const [brands, counts] = await Promise.all([
    Brand.find().sort({ name: 1 }).lean(),
    Fragrance.aggregate<{ _id: unknown; count: number }>([{ $group: { _id: '$brand', count: { $sum: 1 } } }]),
  ])
  res.json({
    brands: brands.map((b) => ({
      id: String(b._id),
      name: b.name,
      slug: b.slug,
      fragranceCount: counts.find((c) => String(c._id) === String(b._id))?.count ?? 0,
    })),
  })
})

const brandInput = z.object({ name: z.string().trim().min(1).max(80), slug: slugField.optional() })

catalogRouter.post('/brands', async (req, res) => {
  const input = brandInput.parse(req.body)
  const slug = input.slug ?? slugify(input.name)
  if (await Brand.exists({ slug })) throw new HttpError(409, 'slug_taken', 'A brand with that name already exists.')
  const brand = await Brand.create({ name: input.name, slug })
  res.status(201).json({ brand: { id: String(brand._id), name: brand.name, slug: brand.slug, fragranceCount: 0 } })
})

catalogRouter.patch('/brands/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const input = brandInput.parse(req.body)
  const brand = await Brand.findById(id)
  if (!brand) throw notFound('Brand')
  const slug = input.slug ?? brand.slug
  if (slug !== brand.slug && (await Brand.exists({ slug })))
    throw new HttpError(409, 'slug_taken', 'Another brand uses that link.')
  const oldSlug = brand.slug
  brand.set({ name: input.name, slug })
  await brand.save()
  // Listings carry a copy of the brand slug for filtering
  if (slug !== oldSlug) await Listing.updateMany({ brandSlug: oldSlug }, { brandSlug: slug })
  res.json({ brand: { id: String(brand._id), name: brand.name, slug: brand.slug } })
})

catalogRouter.delete('/brands/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  if (await Fragrance.exists({ brand: id }))
    throw new HttpError(409, 'in_use', 'Move or delete this brand’s fragrances first.')
  const deleted = await Brand.findByIdAndDelete(id)
  if (!deleted) throw notFound('Brand')
  res.json({ ok: true })
})

// ── Fragrances ────────────────────────────────────────────────────────────────

const notesList = z.array(z.string().trim().min(1).max(40)).max(20).default([])
const fragranceInput = z.object({
  name: z.string().trim().min(1).max(120),
  brand: objectId,
  slug: slugField.optional(),
  concentration: z.enum(CONCENTRATIONS, 'Pick a concentration'),
  year: z
    .number()
    .int()
    .min(1800)
    .max(2100)
    .nullish()
    .transform((v) => v ?? undefined),
  gender: z.enum(['Feminine', 'Masculine', 'Unisex']),
  category: z.enum(FRAGRANCE_CATEGORIES),
  accords: notesList,
  notes: z.object({ top: notesList, heart: notesList, base: notesList }).default({ top: [], heart: [], base: [] }),
  description: z.string().trim().max(2000).default(''),
  photo: z
    .object({
      url: z.string().min(1).max(1000),
      pathname: z.string().max(500).optional(),
      width: z.number().int().positive().max(20_000).optional(),
      height: z.number().int().positive().max(20_000).optional(),
    })
    .nullish()
    .transform((v) => v ?? undefined),
  fragplaceId: z
    .number()
    .int()
    .positive()
    .nullish()
    .transform((v) => v ?? undefined),
  tint: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default('#B8A88A'),
})

catalogRouter.get('/fragrances', async (req, res) => {
  const { search } = z.object({ search: z.string().trim().max(100).optional() }).parse(req.query)
  const filter = search ? { name: searchRegex(search) } : {}
  const [docs, counts] = await Promise.all([
    Fragrance.find(filter).populate('brand', 'name slug').sort({ name: 1 }).lean<LeanFragrance[]>(),
    Listing.aggregate<{ _id: unknown; count: number }>([{ $group: { _id: '$fragrance', count: { $sum: 1 } } }]),
  ])
  res.json({
    fragrances: docs.map((f) => ({
      ...toAdminFragrance(f),
      listingCount: counts.find((c) => String(c._id) === String(f._id))?.count ?? 0,
    })),
  })
})

catalogRouter.get('/fragrances/:id', async (req, res) => {
  const doc = await Fragrance.findById(objectId.parse(req.params.id))
    .populate('brand', 'name slug')
    .lean<LeanFragrance>()
  if (!doc) throw notFound('Fragrance')
  res.json({ fragrance: toAdminFragrance(doc) })
})

catalogRouter.post('/fragrances', async (req, res) => {
  const input = fragranceInput.parse(req.body)
  const brand = await Brand.findById(input.brand)
  if (!brand) throw new HttpError(400, 'invalid_request', 'Pick a brand.')
  const slug = input.slug ?? slugify(`${brand.name} ${input.name}`)
  if (await Fragrance.exists({ slug })) throw new HttpError(409, 'slug_taken', 'That fragrance already exists.')
  const created = await Fragrance.create({ ...input, slug })
  const doc = await Fragrance.findById(created._id).populate('brand', 'name slug').lean<LeanFragrance>()
  res.status(201).json({ fragrance: toAdminFragrance(doc!) })
})

catalogRouter.patch('/fragrances/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const input = fragranceInput.parse(req.body)
  const fragrance = await Fragrance.findById(id)
  if (!fragrance) throw notFound('Fragrance')
  const brand = await Brand.findById(input.brand)
  if (!brand) throw new HttpError(400, 'invalid_request', 'Pick a brand.')
  const slug = input.slug ?? fragrance.slug
  if (slug !== fragrance.slug && (await Fragrance.exists({ slug })))
    throw new HttpError(409, 'slug_taken', 'Another fragrance uses that link.')
  const brandChanged = String(fragrance.brand) !== input.brand
  const oldPhoto = fragrance.photo?.url !== input.photo?.url ? fragrance.photo : undefined
  // set() leaves a field alone when it's undefined, so clear removed ones explicitly
  fragrance.set({ ...input, slug, photo: input.photo ?? null, fragplaceId: input.fragplaceId ?? null })
  await fragrance.save()
  if (oldPhoto?.url) await deleteImage(oldPhoto)
  if (brandChanged) await Listing.updateMany({ fragrance: id }, { brandSlug: brand.slug })
  const doc = await Fragrance.findById(id).populate('brand', 'name slug').lean<LeanFragrance>()
  res.json({ fragrance: toAdminFragrance(doc!) })
})

catalogRouter.delete('/fragrances/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  if (await Listing.exists({ fragrance: id }))
    throw new HttpError(409, 'in_use', 'Delete or archive this fragrance’s listings first.')
  const deleted = await Fragrance.findByIdAndDelete(id)
  if (!deleted) throw notFound('Fragrance')
  if (deleted.photo?.url) await deleteImage(deleted.photo)
  res.json({ ok: true })
})

// ── Fragplace lookup ──────────────────────────────────────────────────────────

/** Up to 5 Fragplace matches for a brand + name, with year, notes, accords and a preview image */
catalogRouter.get('/fragplace', async (req, res) => {
  const { brand, name } = z
    .object({ brand: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(120) })
    .parse(req.query)
  res.json({ matches: await findFragrances(brand, name) })
})

/** Copies a match's bottle photo into our storage; attach the result to the fragrance as `photo` */
catalogRouter.post('/fragplace/photo', async (req, res) => {
  const { thumb } = z.object({ thumb: z.string().url().max(2000) }).parse(req.body)
  res.status(201).json(await importFragplacePhoto(thumb))
})

function toAdminFragrance(f: LeanFragrance) {
  return {
    id: String(f._id),
    slug: f.slug,
    name: f.name,
    brand: f.brand ? { id: String(f.brand._id), name: f.brand.name, slug: f.brand.slug } : null,
    concentration: f.concentration,
    year: f.year ?? null,
    gender: f.gender,
    category: f.category ?? 'designer',
    accords: f.accords,
    notes: f.notes,
    description: f.description,
    photo: f.photo
      ? { url: f.photo.url, pathname: f.photo.pathname, width: f.photo.width, height: f.photo.height }
      : null,
    fragplaceId: f.fragplaceId ?? null,
    tint: f.tint,
  }
}
