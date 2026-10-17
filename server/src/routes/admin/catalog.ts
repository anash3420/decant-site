import { Router } from 'express'
import { z } from 'zod'
import { slugify } from '../../../../shared/slug.ts'
import { CONCENTRATIONS, FRAGRANCE_CATEGORIES } from '../../../../shared/types.ts'
import { HttpError, notFound } from '../../http.ts'
import { findBrands, findFragrances, importFragplaceLogo, importFragplacePhoto } from '../../services/fragplace.ts'
import { copyImage, deleteImage } from '../../services/storage.ts'
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

/** A stored image: a logo or photo already uploaded to our storage */
const storedImage = z.object({
  url: z.string().min(1).max(1000),
  pathname: z.string().max(500).optional(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
})

type BrandDoc = InstanceType<typeof Brand>
const toAdminBrand = (b: BrandDoc | (Record<string, unknown> & { _id: unknown }), fragranceCount?: number) => {
  const d = b as {
    _id: unknown
    name: string
    slug: string
    description?: string | null
    logo?: z.infer<typeof storedImage> | null
    logoMobile?: z.infer<typeof storedImage> | null
    fragplaceId?: number | null
  }
  const image = (i: z.infer<typeof storedImage> | null | undefined) =>
    i?.url ? { url: i.url, pathname: i.pathname, width: i.width, height: i.height } : null
  return {
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    description: d.description ?? '',
    logo: image(d.logo),
    logoMobile: image(d.logoMobile),
    fragplaceId: d.fragplaceId ?? null,
    ...(fragranceCount !== undefined && { fragranceCount }),
  }
}

catalogRouter.get('/brands', async (_req, res) => {
  const [brands, counts] = await Promise.all([
    Brand.find().sort({ name: 1 }).lean(),
    Fragrance.aggregate<{ _id: unknown; count: number }>([{ $group: { _id: '$brand', count: { $sum: 1 } } }]),
  ])
  res.json({
    brands: brands.map((b) => toAdminBrand(b, counts.find((c) => String(c._id) === String(b._id))?.count ?? 0)),
  })
})

catalogRouter.get('/brands/:id', async (req, res) => {
  const brand = await Brand.findById(objectId.parse(req.params.id)).lean()
  if (!brand) throw notFound('Brand')
  res.json({ brand: toAdminBrand(brand, await Fragrance.countDocuments({ brand: brand._id })) })
})

// The extra fields are optional so a plain rename leaves them alone; null clears one
const brandInput = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugField.optional(),
  description: z.string().trim().max(2000).optional(),
  logo: storedImage.nullable().optional(),
  logoMobile: storedImage.nullable().optional(),
  fragplaceId: z.number().int().positive().nullable().optional(),
})

catalogRouter.post('/brands', async (req, res) => {
  const input = brandInput.parse(req.body)
  const slug = input.slug ?? slugify(input.name)
  if (await Brand.exists({ slug })) throw new HttpError(409, 'slug_taken', 'A brand with that name already exists.')
  const brand = await Brand.create({
    name: input.name,
    slug,
    description: input.description ?? '',
    logo: input.logo ?? undefined,
    logoMobile: input.logoMobile ?? undefined,
    fragplaceId: input.fragplaceId ?? undefined,
  })
  res.status(201).json({ brand: toAdminBrand(brand.toObject(), 0) })
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

  // Logo files that are being replaced or removed, deleted once the save succeeds
  const replaced = (['logo', 'logoMobile'] as const).flatMap((k) => {
    const old = brand[k]
    return input[k] !== undefined && old?.url && old.url !== input[k]?.url ? [old] : []
  })
  brand.set({ name: input.name, slug })
  if (input.description !== undefined) brand.set({ description: input.description })
  for (const k of ['logo', 'logoMobile', 'fragplaceId'] as const) if (input[k] !== undefined) brand.set(k, input[k])
  await brand.save()
  await Promise.all(replaced.map((img) => deleteImage(img)))

  // Listings carry a copy of the brand slug for filtering
  if (slug !== oldSlug) await Listing.updateMany({ brandSlug: oldSlug }, { brandSlug: slug })
  res.json({ brand: toAdminBrand(brand.toObject(), await Fragrance.countDocuments({ brand: id })) })
})

catalogRouter.delete('/brands/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  if (await Fragrance.exists({ brand: id }))
    throw new HttpError(409, 'in_use', 'Move or delete this brand’s fragrances first.')
  const deleted = await Brand.findByIdAndDelete(id)
  if (!deleted) throw notFound('Brand')
  await Promise.all([deleted.logo, deleted.logoMobile].flatMap((img) => (img?.url ? [deleteImage(img)] : [])))
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

/**
 * A copy of the fragrance's bottle photo for a listing to use as one of its own photos
 * (its own file, so the listing and the fragrance can each remove theirs safely)
 */
catalogRouter.post('/fragrances/:id/photo/copy', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const fragrance = await Fragrance.findById(id).lean<LeanFragrance>()
  if (!fragrance) throw notFound('Fragrance')
  if (!fragrance.photo?.url) throw new HttpError(404, 'not_found', 'This fragrance has no photo yet.')
  const copied = await copyImage(fragrance.photo)
  res.status(201).json({ ...copied, width: fragrance.photo.width, height: fragrance.photo.height })
})

// ── Fragplace lookup ──────────────────────────────────────────────────────────

/** Up to 5 Fragplace matches for a brand + name, with year, notes, accords and a preview image */
catalogRouter.get('/fragplace', async (req, res) => {
  const { brand, name } = z
    .object({ brand: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(120) })
    .parse(req.query)
  res.json({ matches: await findFragrances(brand, name) })
})

/** Up to 5 Fragplace brands for a name, with description and a preview of the logo */
catalogRouter.get('/fragplace/brands', async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(80) }).parse(req.query)
  res.json({ matches: await findBrands(name) })
})

/** Copies a brand match's logo into our storage, as a desktop and a phone version */
catalogRouter.post('/fragplace/logo', async (req, res) => {
  const { thumb } = z.object({ thumb: z.string().url().max(2000) }).parse(req.body)
  res.status(201).json(await importFragplaceLogo(thumb))
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
