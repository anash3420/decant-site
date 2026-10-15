/**
 * Prepares a database for the app without touching existing data. Safe to run any number of times,
 * including against production:
 *  - checks the connection, and that it's a replica set (inquiries need transactions)
 *  - creates every collection's indexes (unique slugs and references, query indexes)
 *  - creates the settings document (shipping options, Facebook link) only if it doesn't exist yet
 * It never deletes or overwrites anything, and adds no sample listings (that's `npm run seed`, dev only).
 *
 *   npm run db:setup         # local database (.env)
 *   npm run db:setup:prod    # production database (.env.production)
 */
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../db.ts'
import { env } from '../env.ts'
import { Admin, Brand, Fragrance, Inquiry, Listing, Settings } from '../models/index.ts'
import { defaultSettings } from './seed-data.ts'

const step = (label: string) => process.stdout.write(`  ${label}… `)

try {
  step('Connecting')
  await connectDb()
  const db = mongoose.connection.db!
  const hello = await db.admin().command({ hello: 1 })
  const host = new URL(env.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).hostname
  console.log(`ok · ${host} · database "${db.databaseName}" · ${env.NODE_ENV}`)

  step('Checking transactions are available')
  if (!hello.setName) throw new Error('Not a replica set: stock holds on inquiries need transactions.')
  console.log(`ok (replica set "${hello.setName}")`)

  step('Creating indexes')
  // syncIndexes builds what's declared in the models and drops indexes the models no longer declare
  for (const model of [Brand, Fragrance, Listing, Inquiry, Admin, Settings] as const)
    await (model as typeof Brand).syncIndexes()
  console.log('ok')

  step('Settings document')
  const existing = await Settings.exists({ key: 'site' })
  if (existing) console.log('already there, left unchanged')
  else {
    await Settings.create(defaultSettings)
    console.log('created with defaults (edit them in /admin → Settings)')
  }

  const counts = {
    brands: await Brand.countDocuments(),
    fragrances: await Fragrance.countDocuments(),
    listings: await Listing.countDocuments(),
    inquiries: await Inquiry.countDocuments(),
    admins: await Admin.countDocuments(),
  }
  console.log('\n  Current contents:', counts)
  if (counts.admins === 0) {
    const flag = env.NODE_ENV === 'production' ? ':prod' : ''
    console.log(`  No admin account yet: npm run create-admin${flag} -- you@example.com`)
  }
} catch (err) {
  console.log('failed')
  console.error(`\n${(err as Error).message}`)
  process.exitCode = 1
} finally {
  await disconnectDb()
}
