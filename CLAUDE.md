# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A decant shop for the CFE Facebook community. Visitors browse decants, Catch & Release vials and full bottles, then send an
**inquiry**. There is no checkout and no payments: the owner contacts the buyer on Facebook. The app has three
parts: `client/` (React 19 + Vite + Tailwind v4, with the shop and a lazy-loaded `/admin`), `server/` (Express 5 +
Mongoose 9, run by `tsx` with no build step) and `shared/` (rules used by both).

## Commands

Run setup and checks from the repo root:

- `npm run setup` installs root tooling, client and server
- `npm run check` runs typecheck + lint + format:check + client build (use this as the "done" check)
- `npm run typecheck`, `npm run lint` / `lint:fix`, `npm run format` / `format:check`
- `npm run build:vercel` writes `.vercel/output` (Build Output API: static shop + one esbuild-bundled API function
  from `server/src/vercel.ts`). `npm run preview:vercel` serves it on :3000 so the smoke tests can target it with
  `API_URL=http://localhost:3000/api`.
- Production DB: `server/.env.production` (git-ignored). `npm run db:setup:prod` creates indexes and default
  settings without deleting anything. `npm run create-admin:prod`. `seed` refuses `NODE_ENV=production`.

Local dev needs Node 20.19+ (`.nvmrc`) and MongoDB 7+ with `mongod` and `mongosh` on PATH. Run these in `server/`:

- `cp .env.example .env` and set `JWT_SECRET` (min 32 chars; `env.ts` exits on invalid env)
- `npm run db`: local replica set on :27018, data in `server/.mongo`. Keep it running. It must be a replica set
  because inquiries use transactions.
- `npm run db:init` (once), `npm run seed`, `npm run create-admin -- you@example.com`
- `npm run dev`: API on http://localhost:5050/api (not 5000, which macOS AirPlay uses)

In `client/`, `npm run dev` serves http://localhost:5173 and proxies `/api` to :5050. The client has no catalog data
of its own, so the server must be running.

### Tests

There is no unit test runner. The tests are end-to-end smoke scripts that run against a live `npm run dev` server.
They change data (they create inquiries and hold stock), so re-seed before and after:

    cd server && npm run seed && npm run smoke && npm run seed
    ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run smoke:admin && npm run seed

You can't run a single check on its own. Each one is a `check(name, fn)` call in `server/src/scripts/smoke*.ts`.
`API_URL` overrides the target.

## Architecture

**Shared rules.** `shared/` holds the catalog types (`types.ts`), stock maths (`stock.ts`: `getOptions`, `maxQty`,
`isSoldOut`), the lettermail rule (`shipping.ts`), validation regexes and slugs. The server enforces these rules and
the client reuses them for instant feedback. Change a rule here, never in only one place. Imports work differently
on each side: the client uses the `@shared/*` alias (Vite + tsconfig), while the server uses relative paths with the
`.ts` extension (`'../../../shared/stock.ts'`).

**The server prices everything.** The browser sends only `{ slug, optionId, qty }` items plus an optional
`expectedTotal`. In `server/src/services/inquiries.ts`, `createInquiry` re-reads listings inside
`mongoose.connection.transaction`. It then checks stock with the shared `maxQty`, applies the lettermail limits from
settings, prices the inquiry (returning 409 `price_changed` if the total differs) and calls `holdStock`.

**Stock is held when an inquiry is created** (buy-it-now style). This happens in `services/stock.ts`:

- Decants take ml from the fullest bottle first and record `heldFrom` so a release can put it back.
- C&R decrements the vial's `qty`.
- Full bottles get `soldAt` set.

When an admin cancels an inquiry, `releaseStock` reverses the hold. Races between buyers show up as transaction
write conflicts, and the transaction retries.

**One `listings` collection with three kinds.** These are Mongoose discriminators on `kind`: `decant` |
`catch-release` | `full-bottle` (`models/Listing.ts`). Key points:

- A listing points to a `Fragrance` (the scent: notes, accords, category, concentration). That reference is
  `immutable` once created.
- `brandSlug` is copied from the brand onto each listing so `?brand=` filtering needs no `$lookup`. Renaming a brand
  slug must update its listings.
- The public API never returns raw documents. `services/catalog.ts` `toCatalogListing` flattens
  listing + fragrance + brand into the shared `Fragrance` type and strips admin-only fields (`costPaid`,
  `sourcedFrom`, `batchCode`). Typed `.lean()` shapes live in `models/lean.ts`.

**Server layout.** `app.ts` exports the Express app without `listen()`, so it can be wrapped as a Vercel function;
`index.ts` is local dev only. The DB connects lazily on each request via `withDb` and the connection is cached in
`db.ts`. Routes are `routes/public.ts` and `routes/admin/*`. The admin router applies `sameOriginOnly` (an Origin
check), then `Cache-Control: no-store`, then `/auth`, then `requireAdmin` (a JWT in an HttpOnly SameSite=Strict
cookie) for everything else. Business logic lives in `services/`. Request bodies are validated with zod.

**Errors.** Throw `HttpError(status, code, message, details?)` from `http.ts`. Express 5 forwards async throws.
`middleware/errors.ts` turns every error, ZodErrors included, into `{ error: { code, message, details? } }`. The
client switches on `code`, so keep codes stable (`unavailable`, `lettermail_unavailable`, `price_changed`,
`rate_limited`, `invalid_request`, `not_found`...). On the client, `admin/api.ts` `ApiError.fieldErrors` maps zod
details to form fields.

**Photos.** `services/storage.ts` stores photos in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. Otherwise it
writes to `server/.uploads`, served at `/api/uploads`. On Vercel the token is required (`env.ts` refuses to start
without it), and `npm run blob:check` verifies a store end to end. The admin crops each photo in the browser
(`admin/CropDialog.tsx`, `admin/processImage.ts`) to landscape 4:3 or portrait 3:4 and stores `width`/`height`. The
shop never crops photos: frames take the cover photo's shape or fit photos whole (`lib/photos.ts`).

**Client.** `ShopContext` loads the catalog and settings and refreshes them when the tab regains focus.
`InquiryContext` holds the visitor's picks. Sent inquiries are kept in localStorage (`lib/history.ts`), and the History
page polls the public status endpoint. `/admin` is `lazy()`-loaded so it stays out of the shop bundle. Both API
clients (`api/shop.ts`, `admin/api.ts`) share one request between overlapping GETs to the same path. The full
endpoint list is in `server/README.md`.

## Conventions

- **Mobile first.** Most traffic is from phones. Check UI at 375px and 320px: no horizontal scroll, 44px tap
  targets, 16px form inputs.
- Style comes from theme tokens in `client/src/index.css`, used as Tailwind classes (`bg-surface`, `text-muted`,
  `bg-accent`, `text-instock`, `font-display`, ...), not raw colours.
- Prettier sets no semicolons, single quotes, 120 columns and Tailwind class sorting. ESLint enforces
  `consistent-type-imports`, and `_`-prefixed names may go unused.
- Concentrations and fragrance categories are fixed lists in `shared/types.ts`, and the server rejects anything else.
- Prices are in CAD (`formatPrice` in `shared/stock.ts`).
