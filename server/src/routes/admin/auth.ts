import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { HttpError } from '../../http.ts'
import { endSession, requireAdmin, startSession } from '../../middleware/auth.ts'
import { Admin } from '../../models/index.ts'

export const authRouter = Router()

// Slows down password guessing: 10 failed attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many login attempts. Try again in 15 minutes.' } },
})

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are admins
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = z.object({ email: z.email().toLowerCase(), password: z.string().min(1).max(200) }).parse(req.body)
  const admin = await Admin.findOne({ email }).select('+passwordHash')
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH)
  if (!admin || !ok) throw new HttpError(401, 'invalid_credentials', 'Email or password is incorrect.')

  admin.lastLoginAt = new Date()
  await admin.save()
  startSession(res, String(admin._id))
  res.json({ admin: { email: admin.email } })
})

authRouter.post('/logout', (_req, res) => {
  endSession(res)
  res.json({ ok: true })
})

authRouter.get('/me', requireAdmin, (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ admin: { email: res.locals.admin.email } })
})
