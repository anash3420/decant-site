/**
 * Serves the built Vercel output (.vercel/output) locally the way Vercel does, so a deploy can be tested
 * before pushing: real files are served as-is, everything else gets index.html.
 *
 *   npm run build:vercel && npm run preview:vercel     # http://localhost:3000
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const OUT = '.vercel/output'
const PORT = Number(process.env.PREVIEW_PORT ?? 3000)

if (!existsSync(`${OUT}/config.json`)) {
  console.error('No build found. Run `npm run build:vercel` first.')
  process.exit(1)
}

const STATIC = join(OUT, 'static')
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
}

const sendFile = (res, file, headers = {}) => {
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', ...headers })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname
  const file = normalize(join(STATIC, decodeURIComponent(path)))
  if (file.startsWith(STATIC) && existsSync(file) && statSync(file).isFile()) {
    const cache = path.startsWith('/assets/') ? { 'cache-control': 'public, max-age=31536000, immutable' } : {}
    return sendFile(res, file, cache)
  }
  sendFile(res, join(STATIC, 'index.html'))
}).listen(PORT, () => console.log(`Vercel build preview on http://localhost:${PORT}`))
