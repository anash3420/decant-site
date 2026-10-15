/**
 * Builds the whole site in Vercel's Build Output API format (https://vercel.com/docs/build-output-api):
 *
 *   .vercel/output/static/          the shop + admin (client/dist)
 *   .vercel/output/functions/api.func/   the Express API, bundled into one file
 *   .vercel/output/config.json      routing: /api/* → the function, files as-is, everything else → index.html
 *
 * Bundling the API with esbuild means Vercel runs exactly the code we tested, with no TypeScript compilation
 * on its side. Run it locally with `npm run build:vercel`, then `npm run preview:vercel` to serve the result.
 */
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { build } from 'esbuild'

const OUT = '.vercel/output'
const FUNC = `${OUT}/functions/api.func`
const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

rmSync(OUT, { recursive: true, force: true })

console.log('\n▸ Building the shop and admin (client/dist)')
run('npm --prefix client run build')
cpSync('client/dist', `${OUT}/static`, { recursive: true })

console.log('\n▸ Bundling the API into one function')
mkdirSync(FUNC, { recursive: true })
const result = await build({
  entryPoints: ['server/src/vercel.ts'],
  outfile: `${FUNC}/index.mjs`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: 'linked',
  // Smaller and faster to start; names kept because Mongoose checks constructor names (e.g. ObjectId)
  minifyWhitespace: true,
  minifySyntax: true,
  keepNames: true,
  metafile: true,
  // Some dependencies use require(); give the ESM bundle a real one
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  // Optional MongoDB driver add-ons (Kerberos, compression, client-side encryption, AWS auth) that we don't use.
  // The driver loads them inside try/catch, so leaving them out of the bundle is safe.
  external: [
    'kerberos',
    'snappy',
    '@mongodb-js/zstd',
    'mongodb-client-encryption',
    '@aws-sdk/credential-providers',
    'gcp-metadata',
    'socks',
    'aws4',
  ],
  logLevel: 'warning',
})
writeFileSync(`${FUNC}/package.json`, JSON.stringify({ type: 'module' }))
writeFileSync(
  `${FUNC}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      // Express parses bodies itself; Vercel's helpers would read the body first
      shouldAddHelpers: false,
      maxDuration: 15,
    },
    null,
    2,
  ),
)
const kb = Math.round(result.metafile.outputs[`${FUNC}/index.mjs`].bytes / 1024)
console.log(`  api.func/index.mjs: ${kb} KB`)

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
        // The API keeps its original URL, so Express sees /api/catalog etc.
        { src: '^/api(?:/.*)?$', dest: '/api' },
        // Real files (index.html, assets, favicon) as they are
        { handle: 'filesystem' },
        // Everything else is a page of the single-page app (/niche, /fragrance/x, /admin/...)
        { src: '^/(.*)$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
)

console.log(`\n✓ Vercel output ready in ${OUT}\n`)
