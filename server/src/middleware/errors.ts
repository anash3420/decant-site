import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'
import { HttpError } from '../http.ts'

export const apiNotFound: RequestHandler = (req) => {
  throw new HttpError(404, 'not_found', `No route for ${req.method} ${req.originalUrl}`)
}

// Every error leaves as { error: { code, message, details? } }
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: { code: 'invalid_request', message: 'Some fields are missing or invalid.', details: z.flattenError(err) },
    })
    return
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } })
    return
  }
  // express.json() on malformed bodies
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON.' } })
    return
  }
  // Express/http-errors 4xx (e.g. express.static for a missing file, payload too large)
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    const code = err.status === 404 ? 'not_found' : err.status === 413 ? 'too_large' : 'bad_request'
    res.status(err.status).json({ error: { code, message: err.expose ? err.message : 'Bad request.' } })
    return
  }
  console.error(err)
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side.' } })
}
