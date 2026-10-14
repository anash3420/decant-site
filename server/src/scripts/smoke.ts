/**
 * End-to-end checks against a running API (`npm run dev`) on freshly seeded data.
 * It creates inquiries and holds stock, so run `npm run seed` again afterwards.
 *
 *   npm run seed && npm run smoke && npm run seed
 */
import assert from 'node:assert/strict'

const API = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 5050}/api`
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

// Each call looks like a different visitor so the per-IP inquiry limit doesn't interfere
let visitor = 0
async function api(path: string, init?: RequestInit & { json?: unknown }) {
  const res = await fetch(API + path, {
    ...init,
    method: init?.method ?? (init?.json ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++visitor % 250}` },
    body: init?.json ? JSON.stringify(init.json) : undefined,
  })
  return { status: res.status, body: (await res.json()) as any }
}

const contact = { name: 'Smoke Test', facebook: 'https://www.facebook.com/profile.php?id=100000000000001' }

console.log(`Smoke testing ${API}\n`)

console.log('Catalog')
await check('GET /catalog returns 15 listings in the client shape', async () => {
  const { status, body } = await api('/catalog')
  assert.equal(status, 200)
  assert.equal(body.listings.length, 15)
  const santal = body.listings.find((l: any) => l.slug === 'le-labo-santal-33')
  assert.equal(santal.kind, 'decant')
  assert.equal(santal.house, 'Le Labo')
  assert.deepEqual(
    santal.prices.map((p: any) => p.sizeMl),
    [2, 5, 10, 15, 30],
  )
})
await check('admin-only fields are never exposed', async () => {
  const { body } = await api('/catalog')
  const text = JSON.stringify(body)
  for (const field of ['costPaid', 'sourcedFrom', 'batchCode', '__v', 'brandSlug'])
    assert.ok(!text.includes(field), `found "${field}" in public catalog`)
})
await check('?kind and ?brand filter', async () => {
  assert.equal((await api('/catalog?kind=full-bottle')).body.listings.length, 4)
  const creed = (await api('/catalog?brand=creed')).body.listings
  assert.deepEqual(creed.map((l: any) => l.kind).sort(), ['catch-release', 'full-bottle'])
})
await check('bad ?kind is a 400, unknown slug is a 404', async () => {
  assert.equal((await api('/catalog?kind=perfume')).status, 400)
  assert.equal((await api('/catalog/nope-not-real')).status, 404)
})
await check('GET /catalog/:slug returns one listing', async () => {
  const { body } = await api('/catalog/creed-aventus-100ml')
  assert.equal(body.listing.kind, 'full-bottle')
  assert.equal(body.listing.sold, false)
})
await check('GET /brands lists 13 brands with per-kind counts', async () => {
  const { body } = await api('/brands')
  assert.equal(body.brands.length, 13)
  const creed = body.brands.find((b: any) => b.slug === 'creed')
  assert.deepEqual(creed.byKind, { 'catch-release': 1, 'full-bottle': 1 })
})
await check('GET /settings/public has shipping options and limits', async () => {
  const { body } = await api('/settings/public')
  assert.deepEqual(
    body.fulfilment.map((f: any) => [f.id, f.cost]),
    [
      ['pickup', 0],
      ['lettermail', 4],
      ['tracked', 20],
    ],
  )
  assert.deepEqual(body.lettermail, { maxDecantMl: 10, maxCatchReleaseMl: 20 })
})

console.log('\nInquiries')
let reference = ''
await check('valid inquiry is created and priced by the server', async () => {
  const { status, body } = await api('/inquiries', {
    json: {
      contact,
      fulfilment: 'tracked',
      location: 'Edmonton, T5J 0N3',
      items: [
        { slug: 'le-labo-santal-33', optionId: '5ml', qty: 2 },
        { slug: 'creed-aventus-100ml', optionId: 'bottle', qty: 1 },
      ],
      expectedTotal: 22 * 2 + 360 + 20,
    },
  })
  assert.equal(status, 201, JSON.stringify(body))
  assert.match(body.inquiry.reference, /^D-[A-Z2-9]{6}$/)
  assert.equal(body.inquiry.subtotal, 404)
  assert.equal(body.inquiry.estimatedTotal, 424)
  reference = body.inquiry.reference
})
await check('stock is held immediately (bottle sold, ml deducted)', async () => {
  assert.equal((await api('/catalog/creed-aventus-100ml')).body.listing.sold, true)
  const santal = (await api('/catalog/le-labo-santal-33')).body.listing
  assert.equal(santal.bottles[0].remainingMl, 81 - 10)
})
await check('the same full bottle cannot be inquired twice', async () => {
  const { status, body } = await api('/inquiries', {
    json: { contact, fulfilment: 'pickup', items: [{ slug: 'creed-aventus-100ml', optionId: 'bottle', qty: 1 }] },
  })
  assert.equal(status, 409)
  assert.equal(body.error.code, 'unavailable')
})
await check('status lookup shows status only', async () => {
  const { status, body } = await api(`/inquiries/${reference}/status`)
  assert.equal(status, 200)
  assert.deepEqual(Object.keys(body).sort(), ['reference', 'status', 'updatedAt'])
  assert.equal(body.status, 'new')
  assert.equal((await api('/inquiries/D-ZZZZZZ/status')).status, 404)
  assert.equal((await api('/inquiries/not-a-ref/status')).status, 400)
})
await check('client prices are ignored; a stale total is rejected', async () => {
  const { status, body } = await api('/inquiries', {
    json: {
      contact,
      fulfilment: 'pickup',
      items: [{ slug: 'diptyque-philosykos', optionId: '2ml', qty: 1 }],
      expectedTotal: 1,
    },
  })
  assert.equal(status, 409)
  assert.equal(body.error.code, 'price_changed')
  assert.equal(body.error.details.estimatedTotal, 8)
})
await check('lettermail rules are enforced on the server', async () => {
  const { status, body } = await api('/inquiries', {
    json: {
      contact,
      fulfilment: 'lettermail',
      location: 'Regina, S4P 3Y2',
      items: [{ slug: 'le-labo-santal-33', optionId: '15ml', qty: 1 }],
    },
  })
  assert.equal(status, 409)
  assert.equal(body.error.code, 'lettermail_unavailable')
})
await check('validation: bad Facebook link, missing location, empty items', async () => {
  const bad = await api('/inquiries', {
    json: { contact: { name: 'x', facebook: 'instagram.com/x' }, fulfilment: 'tracked', items: [] },
  })
  assert.equal(bad.status, 400)
  const fields = Object.keys(bad.body.error.details.fieldErrors)
  for (const f of ['contact', 'items', 'location']) assert.ok(fields.includes(f), `expected an error on ${f}`)
})
await check('asking for more than exists is refused with what is available', async () => {
  const naxos = (await api('/catalog/xerjoff-naxos-cr')).body.listing
  const sample = naxos.vials.find((v: any) => v.sizeMl === 2) // seeded with qty 1
  const { status, body } = await api('/inquiries', {
    json: { contact, fulfilment: 'pickup', items: [{ slug: 'xerjoff-naxos-cr', optionId: sample.id, qty: 2 }] },
  })
  assert.equal(status, 409)
  assert.deepEqual(body.error.details[0], {
    slug: 'xerjoff-naxos-cr',
    optionId: sample.id,
    reason: 'insufficient',
    available: 1,
  })
})
await check('an option id that does not exist is refused as not found', async () => {
  const { status, body } = await api('/inquiries', {
    json: { contact, fulfilment: 'pickup', items: [{ slug: 'xerjoff-naxos-cr', optionId: 'v2', qty: 1 }] },
  })
  assert.equal(status, 409)
  assert.equal(body.error.details[0].reason, 'not_found')
})

console.log('\nRace: 4 visitors want the last Baccarat Rouge 540 (6ml left), 5ml each')
await check('exactly one wins, the rest get 409, no overselling', async () => {
  const attempts = await Promise.all(
    Array.from({ length: 4 }, () =>
      api('/inquiries', {
        json: { contact, fulfilment: 'pickup', items: [{ slug: 'mfk-baccarat-rouge-540', optionId: '5ml', qty: 1 }] },
      }),
    ),
  )
  const statuses = attempts.map((a) => a.status).sort()
  assert.deepEqual(statuses, [201, 409, 409, 409], `got ${statuses.join(', ')}`)
  const br = (await api('/catalog/mfk-baccarat-rouge-540')).body.listing
  const left = br.bottles.reduce((n: number, b: any) => n + b.remainingMl, 0)
  assert.equal(left, 1)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
