/**
 * End-to-end checks for the admin API against a running server on freshly seeded data.
 * Creates and cancels inquiries and edits listings, so re-seed afterwards.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run smoke:admin
 */
import assert from 'node:assert/strict'

const API = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 5050}/api`
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD')
  process.exit(1)
}

let passed = 0
let failed = 0
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ✗ ${name}\n    ${(err as Error).message.split('\n').join('\n    ')}`)
  }
}

let cookie = ''
let visitor = 0
async function api(
  path: string,
  init: {
    method?: string
    json?: unknown
    body?: string | Buffer
    headers?: Record<string, string>
    auth?: boolean
  } = {},
) {
  const headers: Record<string, string> = { 'x-forwarded-for': `10.1.0.${++visitor % 250}`, ...init.headers }
  if (init.json !== undefined) headers['content-type'] = 'application/json'
  if (init.auth !== false && cookie) headers.cookie = cookie
  const res = await fetch(API + path, {
    method: init.method ?? (init.json !== undefined || init.body ? 'POST' : 'GET'),
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })
  const setCookie = res.headers.get('set-cookie')
  // A cleared cookie comes back as "decants_admin=; Expires=<past>"
  if (setCookie) cookie = setCookie.split(';')[0]!.endsWith('=') ? '' : setCookie.split(';')[0]!
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null, setCookie }
}

const contact = { name: 'Admin Smoke', facebook: 'https://www.facebook.com/profile.php?id=100000000000002' }
const catalog = async (slug: string) => (await api(`/catalog/${slug}`, { auth: false })).body.listing
const totalMl = (l: any) => l.bottles.reduce((n: number, b: any) => n + b.remainingMl, 0)

console.log(`Admin smoke testing ${API}\n`)

console.log('Auth')
await check('admin routes need a login', async () => {
  assert.equal((await api('/admin/stats', { auth: false })).status, 401)
})
await check('wrong password is refused without saying which part was wrong', async () => {
  const { status, body } = await api('/admin/auth/login', { json: { email: EMAIL, password: 'nope-nope-nope' } })
  assert.equal(status, 401)
  assert.equal(body.error.message, 'Email or password is incorrect.')
  const unknown = await api('/admin/auth/login', { json: { email: 'nobody@example.com', password: 'whatever-123' } })
  assert.equal(unknown.body.error.message, 'Email or password is incorrect.')
})
await check('login sets an HttpOnly, SameSite=Strict session cookie', async () => {
  const { status, body, setCookie } = await api('/admin/auth/login', { json: { email: EMAIL, password: PASSWORD } })
  assert.equal(status, 200, JSON.stringify(body))
  assert.match(setCookie!, /decants_admin=/)
  assert.match(setCookie!, /HttpOnly/i)
  assert.match(setCookie!, /SameSite=Strict/i)
  assert.match(setCookie!, /Path=\/api/i)
  assert.equal((await api('/admin/auth/me')).body.admin.email, EMAIL)
})
await check('requests from another website are blocked even with the cookie', async () => {
  const { status } = await api('/admin/brands', { json: { name: 'Evil' }, headers: { origin: 'https://evil.example' } })
  assert.equal(status, 403)
})

console.log('\nInquiries: cancelling releases held stock')
async function inquire(items: unknown[]) {
  const { status, body } = await api('/inquiries', { json: { contact, fulfilment: 'pickup', items }, auth: false })
  assert.equal(status, 201, JSON.stringify(body))
  const list = await api(`/admin/inquiries?search=${body.inquiry.reference}`)
  return list.body.inquiries[0].id as string
}
await check('decant: ml goes back to the bottle it came from', async () => {
  const before = totalMl(await catalog('le-labo-santal-33'))
  const id = await inquire([{ slug: 'le-labo-santal-33', optionId: '10ml', qty: 2 }])
  assert.equal(totalMl(await catalog('le-labo-santal-33')), before - 20)
  const { status, body } = await api(`/admin/inquiries/${id}`, {
    method: 'PATCH',
    json: { status: 'cancelled', note: 'Buyer changed mind' },
  })
  assert.equal(status, 200, JSON.stringify(body))
  assert.equal(body.inquiry.stockHeld, false)
  assert.deepEqual(body.inquiry.nextStatuses, [])
  assert.equal(totalMl(await catalog('le-labo-santal-33')), before)
})
await check('catch & release: vial count is restored', async () => {
  const naxos = await catalog('xerjoff-naxos-cr')
  const vial = naxos.vials.find((v: any) => v.sizeMl === 5)
  const id = await inquire([{ slug: 'xerjoff-naxos-cr', optionId: vial.id, qty: 2 }])
  assert.equal((await catalog('xerjoff-naxos-cr')).vials.find((v: any) => v.id === vial.id).qty, vial.qty - 2)
  await api(`/admin/inquiries/${id}`, { method: 'PATCH', json: { status: 'cancelled' } })
  assert.equal((await catalog('xerjoff-naxos-cr')).vials.find((v: any) => v.id === vial.id).qty, vial.qty)
})
await check('full bottle: becomes available again', async () => {
  const id = await inquire([{ slug: 'initio-side-effect-90ml', optionId: 'bottle', qty: 1 }])
  assert.equal((await catalog('initio-side-effect-90ml')).sold, true)
  await api(`/admin/inquiries/${id}`, { method: 'PATCH', json: { status: 'cancelled' } })
  assert.equal((await catalog('initio-side-effect-90ml')).sold, false)
})
await check('status flow is enforced; fulfilled and cancelled are final', async () => {
  const id = await inquire([{ slug: 'diptyque-philosykos', optionId: '2ml', qty: 1 }])
  for (const s of ['contacted', 'confirmed', 'fulfilled']) {
    const r = await api(`/admin/inquiries/${id}`, { method: 'PATCH', json: { status: s } })
    assert.equal(r.status, 200, `${s}: ${JSON.stringify(r.body)}`)
  }
  const back = await api(`/admin/inquiries/${id}`, { method: 'PATCH', json: { status: 'cancelled' } })
  assert.equal(back.status, 409)
  assert.equal(back.body.error.code, 'invalid_transition')
  const detail = (await api(`/admin/inquiries/${id}`)).body.inquiry
  assert.deepEqual(
    detail.statusHistory.map((h: any) => h.status),
    ['new', 'contacted', 'confirmed', 'fulfilled'],
  )
  assert.equal(detail.stockHeld, true, 'fulfilled keeps the stock deducted')
})
await check('admin notes save; list filters by status and search', async () => {
  const list = await api('/admin/inquiries?status=fulfilled')
  assert.ok(list.body.inquiries.length >= 1)
  const id = list.body.inquiries[0].id
  const r = await api(`/admin/inquiries/${id}`, { method: 'PATCH', json: { adminNotes: 'Paid by e-transfer' } })
  assert.equal(r.body.inquiry.adminNotes, 'Paid by e-transfer')
  assert.equal((await api('/admin/inquiries?search=Admin%20Smoke')).body.total >= 4, true)
})
await check('the visitor’s status lookup reflects admin changes', async () => {
  const list = await api('/admin/inquiries?status=fulfilled')
  const ref = list.body.inquiries[0].reference
  assert.equal((await api(`/inquiries/${ref}/status`, { auth: false })).body.status, 'fulfilled')
})

console.log('\nBrands, fragrances, listings')
let brandId = ''
let fragranceId = ''
let listingId = ''
await check('create brand and fragrance', async () => {
  const b = await api('/admin/brands', { json: { name: 'Smoke Test House' } })
  assert.equal(b.status, 201, JSON.stringify(b.body))
  brandId = b.body.brand.id
  assert.equal((await api('/admin/brands', { json: { name: 'Smoke Test House' } })).status, 409)
  const f = await api('/admin/fragrances', {
    json: {
      name: 'Test Accord',
      brand: brandId,
      concentration: 'Eau de Parfum',
      gender: 'Unisex',
      category: 'dupe',
      accords: ['Woody'],
      notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Musk'] },
      tint: '#336699',
    },
  })
  assert.equal(f.status, 201, JSON.stringify(f.body))
  fragranceId = f.body.fragrance.id
  assert.equal(f.body.fragrance.slug, 'smoke-test-house-test-accord')
  assert.equal(f.body.fragrance.category, 'dupe')
  const noCategory = await api('/admin/fragrances', {
    json: { name: 'No Category', brand: brandId, concentration: 'Eau de Parfum', gender: 'Unisex' },
  })
  assert.equal(noCategory.status, 400, 'category is required')
  const freeText = await api('/admin/fragrances', {
    json: { name: 'Free Text', brand: brandId, concentration: 'EDP', gender: 'Unisex', category: 'niche' },
  })
  assert.equal(freeText.status, 400, 'only listed concentrations are accepted')
  assert.ok(freeText.body.error.details.fieldErrors.concentration, 'error points at the concentration field')
})
await check('create a draft decant listing with a cost; drafts stay off the public catalog', async () => {
  const r = await api('/admin/listings', {
    json: {
      kind: 'decant',
      fragrance: fragranceId,
      bottles: [{ sizeMl: 50, remainingMl: 40, costPaid: 120 }],
      prices: [
        { sizeMl: 5, price: 15 },
        { sizeMl: 2, price: 7 },
      ],
    },
  })
  assert.equal(r.status, 201, JSON.stringify(r.body))
  listingId = r.body.listing.id
  assert.equal(r.body.listing.slug, 'smoke-test-house-test-accord')
  assert.equal(r.body.listing.status, 'draft')
  assert.deepEqual(
    r.body.listing.prices.map((p: any) => p.sizeMl),
    [2, 5],
    'prices sorted by size',
  )
  assert.equal(r.body.listing.bottles[0].costPaid, 120)
  assert.equal((await api('/catalog/smoke-test-house-test-accord', { auth: false })).status, 404)
})
await check('validation catches impossible stock', async () => {
  const r = await api(`/admin/listings/${listingId}`, {
    method: 'PATCH',
    json: { fragrance: fragranceId, bottles: [{ sizeMl: 50, remainingMl: 60 }], prices: [{ sizeMl: 2, price: 7 }] },
  })
  assert.equal(r.status, 400)
})
await check('a listing’s fragrance is fixed after creation', async () => {
  const current = (await api(`/admin/listings/${listingId}`)).body.listing
  const other = (await api('/admin/fragrances')).body.fragrances.find((f: any) => f.id !== fragranceId)
  const swap = await api(`/admin/listings/${listingId}`, {
    method: 'PATCH',
    json: { ...current, fragrance: other.id },
  })
  assert.equal(swap.status, 409)
  assert.equal(swap.body.error.code, 'fragrance_locked')
  // Leaving it out is fine: the existing fragrance is kept
  const { fragrance: _omit, ...withoutFragrance } = current
  const ok = await api(`/admin/listings/${listingId}`, { method: 'PATCH', json: withoutFragrance })
  assert.equal(ok.status, 200, JSON.stringify(ok.body))
  assert.equal(ok.body.listing.fragrance.id, fragranceId)
})
await check('publish + log stock; public catalog hides the cost', async () => {
  const current = (await api(`/admin/listings/${listingId}`)).body.listing
  const r = await api(`/admin/listings/${listingId}`, {
    method: 'PATCH',
    json: { ...current, status: 'published', bottles: [{ ...current.bottles[0], remainingMl: 33 }] },
  })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  assert.equal(r.body.listing.bottles[0]._id, current.bottles[0]._id, 'bottle id kept')
  const pub = await catalog('smoke-test-house-test-accord')
  assert.equal(pub.bottles[0].remainingMl, 33)
  assert.ok(!JSON.stringify(pub).includes('costPaid'))
  const brands = (await api('/brands', { auth: false })).body.brands
  assert.ok(brands.some((b: any) => b.slug === 'smoke-test-house'))
})
await check('changing a fragrance’s category moves its listings between category pages', async () => {
  const inDupes = async () =>
    (await api('/catalog?category=dupe', { auth: false })).body.listings.some(
      (l: any) => l.slug === 'smoke-test-house-test-accord',
    )
  assert.equal(await inDupes(), true)
  const current = (await api(`/admin/fragrances/${fragranceId}`)).body.fragrance
  const r = await api(`/admin/fragrances/${fragranceId}`, {
    method: 'PATCH',
    json: { ...current, brand: current.brand.id, category: 'niche' },
  })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  assert.equal(await inDupes(), false)
  assert.equal((await catalog('smoke-test-house-test-accord')).category, 'niche')
})
await check('renaming a brand updates its listings’ brand filter', async () => {
  const r = await api(`/admin/brands/${brandId}`, {
    method: 'PATCH',
    json: { name: 'Smoke House', slug: 'smoke-house' },
  })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const pub = (await api('/catalog?brand=smoke-house', { auth: false })).body.listings
  assert.equal(pub.length, 1)
  assert.equal(pub[0].house, 'Smoke House')
})

console.log('\nPhotos')
// 1×1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
let photoUrl = ''
await check('upload an image and attach it to the listing', async () => {
  const up = await api('/admin/uploads', { body: PNG, headers: { 'content-type': 'image/png' } })
  assert.equal(up.status, 201, JSON.stringify(up.body))
  photoUrl = up.body.url
  const served = await fetch(new URL(photoUrl, API).href)
  assert.equal(served.status, 200)
  const current = (await api(`/admin/listings/${listingId}`)).body.listing
  const r = await api(`/admin/listings/${listingId}`, {
    method: 'PATCH',
    json: {
      ...current,
      photos: [
        // A portrait (3:4) photo: its size travels with it so the shop can frame it tall
        { url: up.body.url, pathname: up.body.pathname, width: 1200, height: 1600, label: 'Front', order: 0 },
      ],
    },
  })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const pub = await catalog('smoke-test-house-test-accord')
  assert.deepEqual(pub.photos, [{ label: 'Front', src: photoUrl, width: 1200, height: 1600 }])
  const admin = (await api(`/admin/listings/${listingId}`)).body.listing
  assert.equal(admin.photos[0].height, 1600, 'admin view keeps the size too')
})
await check('non-images are refused', async () => {
  const r = await api('/admin/uploads', { body: 'hello', headers: { 'content-type': 'text/plain' } })
  assert.equal(r.status, 415)
})
await check('removing a photo deletes the file', async () => {
  const current = (await api(`/admin/listings/${listingId}`)).body.listing
  await api(`/admin/listings/${listingId}`, { method: 'PATCH', json: { ...current, photos: [] } })
  assert.equal((await fetch(new URL(photoUrl, API).href)).status, 404)
})
await check('a fragrance photo stands in for listings without photos; removing it deletes the file', async () => {
  const fragranceId = (await api(`/admin/listings/${listingId}`)).body.listing.fragrance.id
  const f = (await api(`/admin/fragrances/${fragranceId}`)).body.fragrance
  const up = (await api('/admin/uploads', { body: PNG, headers: { 'content-type': 'image/png' } })).body
  const photo = { url: up.url, pathname: up.pathname, width: 900, height: 1200 }
  const saved = await api(`/admin/fragrances/${fragranceId}`, {
    method: 'PATCH',
    json: { ...f, brand: f.brand.id, photo, fragplaceId: 169 },
  })
  assert.equal(saved.status, 200, JSON.stringify(saved.body))
  assert.deepEqual(saved.body.fragrance.photo, photo)
  assert.equal(saved.body.fragrance.fragplaceId, 169)
  const pub = await catalog('smoke-test-house-test-accord')
  assert.deepEqual(pub.photos, [{ label: 'Bottle', src: up.url, width: 900, height: 1200 }])

  // A listing gets its own copy of the bottle photo; removing that copy leaves the fragrance's photo alone
  const copy = await api(`/admin/fragrances/${fragranceId}/photo/copy`, { json: {} })
  assert.equal(copy.status, 201, JSON.stringify(copy.body))
  assert.notEqual(copy.body.url, up.url)
  assert.equal(copy.body.height, 1200)
  const current = (await api(`/admin/listings/${listingId}`)).body.listing
  const withCopy = { ...current, photos: [{ ...copy.body, label: 'Bottle', order: 0 }] }
  assert.equal((await api(`/admin/listings/${listingId}`, { method: 'PATCH', json: withCopy })).status, 200)
  assert.equal((await catalog('smoke-test-house-test-accord')).photos[0].src, copy.body.url)
  await api(`/admin/listings/${listingId}`, { method: 'PATCH', json: { ...current, photos: [] } })
  assert.equal((await fetch(new URL(copy.body.url, API).href)).status, 404, 'the listing copy is deleted')
  assert.equal((await fetch(new URL(up.url, API).href)).status, 200, 'the fragrance photo is untouched')

  // Saving without the photo removes it everywhere
  const cleared = await api(`/admin/fragrances/${fragranceId}`, {
    method: 'PATCH',
    json: { ...f, brand: f.brand.id, photo: null, fragplaceId: null },
  })
  assert.equal(cleared.body.fragrance.photo, null)
  assert.equal(cleared.body.fragrance.fragplaceId, null)
  assert.equal((await catalog('smoke-test-house-test-accord')).photos, undefined)
  assert.equal((await fetch(new URL(up.url, API).href)).status, 404)
})
await check('the Fragplace lookup validates its input', async () => {
  assert.equal((await api('/admin/fragplace?brand=Creed')).status, 400)
  const foreign = await api('/admin/fragplace/photo', { json: { thumb: 'https://example.com/plain/x.png' } })
  assert.equal(foreign.status, 400)
})

console.log('\nCleanup rules')
await check('a listing in an inquiry can’t be deleted, others can', async () => {
  const santal = (await api('/admin/listings?search=santal')).body.listings[0]
  const inUse = await api(`/admin/listings/${santal.id}`, { method: 'DELETE' })
  assert.equal(inUse.status, 409)
  assert.equal(inUse.body.error.code, 'in_use')
  assert.equal((await api(`/admin/listings/${listingId}`, { method: 'DELETE' })).status, 200)
  assert.equal((await api(`/admin/fragrances/${fragranceId}`, { method: 'DELETE' })).status, 200)
  assert.equal((await api(`/admin/brands/${brandId}`, { method: 'DELETE' })).status, 200)
})

console.log('\nSettings and dashboard')
await check('settings changes reach the public API', async () => {
  const { settings } = (await api('/admin/settings')).body
  const changed = { ...settings, lettermail: { ...settings.lettermail, maxCatchReleaseMl: 25 } }
  assert.equal((await api('/admin/settings', { method: 'PUT', json: changed })).status, 200)
  assert.equal((await api('/settings/public', { auth: false })).body.lettermail.maxCatchReleaseMl, 25)
  await api('/admin/settings', { method: 'PUT', json: settings })
  const allOff = { ...settings, fulfilment: settings.fulfilment.map((f: any) => ({ ...f, enabled: false })) }
  assert.equal((await api('/admin/settings', { method: 'PUT', json: allOff })).status, 400)
})
await check('dashboard stats', async () => {
  const { body } = await api('/admin/stats')
  assert.equal(body.inquiries.cancelled, 3)
  assert.equal(body.inquiries.fulfilled, 1)
  assert.ok(
    body.lowStock.some((l: any) => l.name === 'Baccarat Rouge 540'),
    'BR540 (6ml) is low',
  )
  assert.ok(
    body.lowStock.some((l: any) => l.name === 'Interlude Man'),
    'Interlude vials are gone',
  )
})

await check('with stock deduction off, inquiries leave stock untouched', async () => {
  const { settings } = (await api('/admin/settings')).body
  assert.equal(settings.deductStock, true, 'deduction is on by default')
  assert.equal((await api('/settings/public', { auth: false })).body.deductStock, undefined, 'admin-only')
  assert.equal((await api('/admin/settings', { method: 'PUT', json: { ...settings, deductStock: false } })).status, 200)
  try {
    const before = totalMl(await catalog('le-labo-santal-33'))
    const id = await inquire([{ slug: 'le-labo-santal-33', optionId: '10ml', qty: 1 }])
    assert.equal(totalMl(await catalog('le-labo-santal-33')), before)
    const detail = (await api(`/admin/inquiries/${id}`)).body.inquiry
    assert.equal(detail.stockHeld, false)
    assert.equal(detail.stockSkipped, true)
    // Cancelling must not "give back" stock that was never taken
    await api(`/admin/inquiries/${id}`, { method: 'PATCH', json: { status: 'cancelled' } })
    assert.equal(totalMl(await catalog('le-labo-santal-33')), before)
  } finally {
    await api('/admin/settings', { method: 'PUT', json: settings })
  }
  const before = totalMl(await catalog('le-labo-santal-33'))
  await inquire([{ slug: 'le-labo-santal-33', optionId: '10ml', qty: 1 }])
  assert.equal(totalMl(await catalog('le-labo-santal-33')), before - 10, 'back on: deducts again')
})

console.log('\nLogout')
await check('logout ends the session', async () => {
  await api('/admin/auth/logout', { json: {} })
  assert.equal(cookie, '')
  assert.equal((await api('/admin/stats')).status, 401)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
