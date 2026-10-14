import express, { type RequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import { connectDb } from './db.ts'
import { apiNotFound, errorHandler } from './middleware/errors.ts'
import { adminRouter } from './routes/admin/index.ts'
import { publicRouter } from './routes/public.ts'
import { LOCAL_UPLOAD_DIR, usingBlob } from './services/storage.ts'

/** The Express app without listen(), so Vercel can wrap it as a function and local dev can serve it */
export const app = express()

// Vercel (and the Vite dev proxy) sit in front; trust one hop so req.ip is the visitor's address
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(express.json({ limit: '50kb' }))
app.use(cookieParser())

// Dev only: photos saved to ./.uploads when there's no Vercel Blob token
if (!usingBlob) app.use('/api/uploads', express.static(LOCAL_UPLOAD_DIR, { fallthrough: false, maxAge: '1d' }))

// Lazily connect on the first request of a cold function instance; reused afterwards
const withDb: RequestHandler = async (_req, _res, next) => {
  await connectDb()
  next()
}

app.use('/api/admin', withDb, adminRouter)
app.use('/api', withDb, publicRouter)
app.use('/api', apiNotFound)
app.use(errorHandler)
