import express, { type RequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import { connectDb } from './db.ts'
import { apiNotFound, errorHandler } from './middleware/errors.ts'
import { adminRouter } from './routes/admin/index.ts'
import { publicRouter } from './routes/public.ts'
import { LOCAL_UPLOAD_DIR } from './services/storage.ts'
import { env } from './env.ts'

/** The Express app without listen(), so Vercel can wrap it as a function and local dev can serve it */
export const app = express()

// Vercel (and the Vite dev proxy) sit in front; trust one hop so req.ip is the visitor's address
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(express.json({ limit: '50kb' }))
app.use(cookieParser())

// Locally uploaded photos (dev). Stays on after switching to Blob so older local photos keep loading;
// on Vercel the folder doesn't exist and every photo URL points at Blob instead.
if (env.VERCEL !== '1') app.use('/api/uploads', express.static(LOCAL_UPLOAD_DIR, { fallthrough: false, maxAge: '1d' }))

// Lazily connect on the first request of a cold function instance; reused afterwards
const withDb: RequestHandler = async (_req, _res, next) => {
  await connectDb()
  next()
}

app.use('/api/admin', withDb, adminRouter)
app.use('/api', withDb, publicRouter)
app.use('/api', apiNotFound)
app.use(errorHandler)
