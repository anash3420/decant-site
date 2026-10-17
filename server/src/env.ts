import { z } from 'zod'

// Fail fast on startup instead of on the first request that needs a missing variable
const schema = z.object({
  MONGODB_URI: z.string().startsWith('mongodb'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET should be at least 32 characters'),
  PORT: z.coerce.number().default(5050),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Vercel Blob store token. Optional locally (photos then go to ./.uploads), required on Vercel. */
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .trim()
    .regex(/^vercel_blob_rw_\w+$/, 'BLOB_READ_WRITE_TOKEN looks wrong; copy it again from the Blob store page')
    .optional()
    // An empty `BLOB_READ_WRITE_TOKEN=` line means "not set"
    .or(z.literal('').transform(() => undefined)),
  /** RapidAPI key for the Fragplace Fragrance API (admin fragrance lookup). Optional: without it the lookup is off. */
  RAPIDAPI_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  /** Set to "1" by Vercel on every deployment */
  VERCEL: z.string().optional(),
})

const parsed = schema
  // Vercel's disk is read-only, so without Blob every photo upload would fail. Refuse to start instead.
  .refine((e) => e.VERCEL !== '1' || e.BLOB_READ_WRITE_TOKEN, {
    path: ['BLOB_READ_WRITE_TOKEN'],
    message: 'Required on Vercel: connect a Blob store to the project (Storage → Blob)',
  })
  .safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
