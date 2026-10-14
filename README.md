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

## How it works

- Stock is held the moment an inquiry is sent (buy-it-now style) inside a MongoDB transaction, so two buyers
  can't get the last bottle. Cancelling an inquiry in the admin puts the stock back.
- The server prices every inquiry itself and enforces the shipping rules; the browser only sends what was picked.
- Visitors' sent inquiries are kept in their browser's History and show live status from the API.
