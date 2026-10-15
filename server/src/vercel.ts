import { app } from './app.ts'

/**
 * Vercel function entry. scripts/vercel-build.mjs bundles this file into the `api` function, and every /api/*
 * request is routed here with its original URL, so Express routes exactly as it does locally.
 * The database connects lazily per request (see `withDb` in app.ts) and is reused while the instance is warm.
 */
export default app
