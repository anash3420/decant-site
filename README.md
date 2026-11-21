# Anash's Fragrances

A retail decant shop. **It is being rebuilt:** the old shop, admin panel and API were removed (they're in git history
on `main`). The new frontend follows the redesign in `CLAUDE.md` ("Storefront redesign"), and the new backend will be
written as separate services on top of the existing MongoDB schema.

**Stack:** MongoDB (Mongoose 9) · React 19 (Vite, Tailwind v4) · Node · TypeScript throughout

| Folder                        | What's in it                                                                |
| ----------------------------- | --------------------------------------------------------------------------- |
| [`client/`](client/README.md) | Vite + React + Tailwind setup for the new frontend (placeholder page)       |
| [`server/`](server/README.md) | The MongoDB schema, database connection and environment check               |
| `shared/`                     | Types, stock maths, lettermail rule and validation for backend and frontend |

## Run locally

Needs Node 20.19+ (see `.nvmrc`) and MongoDB 7+ (`mongod` and `mongosh` on your PATH).

```bash
npm run setup                   # installs root tooling, client and server

# Database
cd server
cp .env.example .env
npm run db                      # leave running (local MongoDB replica set on :27018)
npm run db:init                 # once

# Frontend (new terminal)
cd client
npm run dev                     # http://localhost:5173
```

## Development

Run these from the repo root:

| Command                           | What it does                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run check`                   | Everything CI-worthy: type-check, lint, format check, build |
| `npm run typecheck`               | TypeScript for client and server                            |
| `npm run lint` / `lint:fix`       | ESLint (TypeScript rules, React hooks rules)                |
| `npm run format` / `format:check` | Prettier, including Tailwind class ordering                 |

Conventions:

- **One source of truth for rules.** Anything backend and frontend both need (types, stock maths, the lettermail
  rule, validation patterns) lives in `shared/`.
- **The server prices everything.** The browser sends only what was picked; totals and stock checks happen
  server-side.
- **Mobile first.** Check new UI at 375px and 320px: no sideways scroll, 44px tap targets, 16px form inputs.
- Style is enforced by the tools above (no semicolons, single quotes, 120 columns), so there's nothing to remember.

## Deploying (Vercel)

`scripts/vercel-build.mjs` writes Vercel's [Build Output API](https://vercel.com/docs/build-output-api) format. For
now that is only the frontend as static files: real files are served as they are, and every other path gets
`index.html`. The services' deploy is added when they exist. `vercel.json` only names the install and build commands.
They install with `--include=dev` because `NODE_ENV=production` also applies to the build, and npm would otherwise
skip the build tools.

```bash
npm run build:vercel                 # build .vercel/output exactly as Vercel will
npm run preview:vercel               # serve it on http://localhost:3000
```

The production database is MongoDB Atlas; its connection string lives in `server/.env.production` (git-ignored).
