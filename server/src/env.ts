import { z } from 'zod'

// Fail fast on startup instead of on the first request that needs a missing variable
const schema = z.object({
  MONGODB_URI: z.string().startsWith('mongodb'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET should be at least 32 characters'),
  PORT: z.coerce.number().default(5050),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Set on Vercel to store photos in Vercel Blob; without it, uploads go to ./.uploads (dev only) */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
