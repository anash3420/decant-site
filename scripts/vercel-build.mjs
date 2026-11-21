/**
 * Builds the site in Vercel's Build Output API format (https://vercel.com/docs/build-output-api):
 *
 *   .vercel/output/static/      the frontend (client/dist)
 *   .vercel/output/config.json  routing: files as-is, everything else → index.html
 *
 * The API is being rewritten as separate services; their deploy is added when they exist.
 * Run it locally with `npm run build:vercel`, then `npm run preview:vercel` to serve the result.
 */
import { execSync } from 'node:child_process'
import { cpSync, rmSync, writeFileSync } from 'node:fs'

const OUT = '.vercel/output'
const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

rmSync(OUT, { recursive: true, force: true })

console.log('\n▸ Building the frontend (client/dist)')
run('npm --prefix client run build')
cpSync('client/dist', `${OUT}/static`, { recursive: true })

console.log('\n▸ Writing routes')
writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Vite's hashed asset files never change, so they can be cached for a year
        {
          src: '^/assets/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // Real files (index.html, assets, favicon) as they are
        { handle: 'filesystem' },
        // Everything else is a page of the single-page app
        { src: '^/(.*)$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
)

console.log(`\n✓ Vercel output ready in ${OUT}\n`)
