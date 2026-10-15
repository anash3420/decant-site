# Anash's Fragrances

A decant shop for the CFE Facebook community: browse decants, Catch & Release vials and full bottles,
build an inquiry, and get contacted on Facebook to arrange payment. No checkout or payments on the site.

**Stack:** MongoDB · Express 5 · React 19 (Vite, Tailwind v4) · Node · TypeScript throughout

| Folder                        | What's in it                                                    |
| ----------------------------- | --------------------------------------------------------------- |
| [`client/`](client/README.md) | The shop and the `/admin` panel (React + Vite)                  |
| [`server/`](server/README.md) | REST API, MongoDB models, seed + smoke-test scripts             |
| `shared/`                     | Types, stock maths, lettermail rule and validation used by both |

## Run locally

Needs Node 20.19+ (see `.nvmrc`) and MongoDB 7+ (`mongod` and `mongosh` on your PATH).

```bash
npm run setup                   # installs root tooling, client and server

# API + database
cd server
cp .env.example .env            # then set JWT_SECRET
npm run db                      # leave running (local MongoDB replica set on :27018)
npm run db:init                 # once
npm run seed                    # sample catalog
npm run create-admin -- you@example.com
npm run dev                     # API on http://localhost:5050

# Shop (new terminal)
cd client
npm run dev                     # http://localhost:5173, admin at /admin
```

## Development

Run these from the repo root:

| Command                           | What it does                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run check`                   | Everything CI-worthy: type-check, lint, format check, build |
| `npm run typecheck`               | TypeScript for client and server                            |
| `npm run lint` / `lint:fix`       | ESLint (TypeScript rules, React hooks rules)                |
| `npm run format` / `format:check` | Prettier, including Tailwind class ordering                 |

API behaviour is covered by end-to-end smoke tests that run against a live server (see `server/README.md`):

```bash
cd server && npm run seed && npm run smoke && npm run seed
```

Conventions:

- **One source of truth for rules.** Anything both sides need (types, stock maths, the lettermail rule, validation
  patterns) lives in `shared/`; the server enforces it, the client uses it for instant feedback.
- **The server prices everything.** The browser sends only what was picked; totals and stock checks happen server-side.
- **Mobile first.** Check new UI at 375px and 320px: no sideways scroll, 44px tap targets, 16px form inputs.
- Style is enforced by the tools above (no semicolons, single quotes, 120 columns), so there's nothing to remember.

## Deploying (Vercel + MongoDB Atlas + Vercel Blob)

The whole site deploys as one Vercel project. `scripts/vercel-build.mjs` writes Vercel's
[Build Output API](https://vercel.com/docs/build-output-api) format: the shop as static files, and the Express API
bundled with esbuild into a single function. `/api/*` goes to the function, real files are served as they are, and
every other path gets `index.html`. `vercel.json` only names the install and build commands. They install with
`--include=dev` because `NODE_ENV=production` (needed at runtime) also applies to the build, and npm would otherwise
skip the build tools (Vite, TypeScript, esbuild).

```bash
npm run build:vercel                 # build .vercel/output exactly as Vercel will
npm run preview:vercel               # serve it on http://localhost:3000 (API uses server/.env)
API_URL=http://localhost:3000/api npm --prefix server run smoke    # test the built output
```

**Production database (Atlas).** Put the connection string, with `/decants` before the `?`, plus
`NODE_ENV=production` in `server/.env.production` (git-ignored). Then run:

```bash
cd server
npm run db:setup:prod                          # indexes + default settings; never deletes anything
npm run create-admin:prod -- you@example.com   # your live admin login
```

`npm run seed` refuses to run with `NODE_ENV=production`, so sample data can't overwrite the live database.

**Vercel project settings:**

- Import the GitHub repo; leave Root Directory as the repo root. `vercel.json` handles the build.
- Storage: connect the Blob store. This adds `BLOB_READ_WRITE_TOKEN`.
- Environment variables: `MONGODB_URI`, `JWT_SECRET` (a long random string) and `NODE_ENV=production`.
- Atlas: under Network Access, allow `0.0.0.0/0`, because Vercel functions have no fixed IP. Put the cluster in
  AWS us-east-1, next to Vercel's default `iad1` function region.

## How it works

- Stock is held the moment an inquiry is sent (buy-it-now style) inside a MongoDB transaction, so two buyers
  can't get the last bottle. Cancelling an inquiry in the admin puts the stock back.
- The server prices every inquiry itself and enforces the shipping rules; the browser only sends what was picked.
- Visitors' sent inquiries are kept in their browser's History and show live status from the API.
