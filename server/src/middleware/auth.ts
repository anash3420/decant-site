import type { CookieOptions, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env.ts'
import { HttpError } from '../http.ts'
import { Admin } from '../models/index.ts'

const SESSION_COOKIE = 'decants_admin'
const SESSION_DAYS = 7

const cookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript can't read it, so an XSS bug can't steal the session
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict', // never sent on requests started by other sites
  path: '/api',
}

export function startSession(res: Response, adminId: string) {
  const token = jwt.sign({ sub: adminId }, env.JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` })
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DAYS * 86_400_000 })
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions)
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) throw new HttpError(401, 'unauthenticated', 'Please log in.')
  let sub: string
  try {
    sub = (jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload).sub!
  } catch {
    endSession(res)
    throw new HttpError(401, 'session_expired', 'Your session has expired. Please log in again.')
  }
  const admin = await Admin.findById(sub, { email: 1 }).lean()
  if (!admin) {
    endSession(res)
    throw new HttpError(401, 'unauthenticated', 'Please log in.')
  }
  res.locals.admin = { id: String(admin._id), email: admin.email }
  next()
}

/**
 * Belt and braces on top of SameSite=Strict: state-changing admin requests must come from our own pages.
 * Browsers always send Origin on cross-site POST/PATCH/DELETE, so a mismatch means another site.
 */
export const sameOriginOnly: RequestHandler = (req, _res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next()
  const origin = req.get('origin')
  if (!origin) return next() // same-origin fetches from some browsers, curl, tests
  const host = req.get('x-forwarded-host') ?? req.get('host')
  const allowed = origin === env.CLIENT_ORIGIN || new URL(origin).host === host
  if (!allowed) throw new HttpError(403, 'forbidden_origin', 'Request blocked.')
  next()
}
