# Decants — server

Express 5 + Mongoose 9 + TypeScript (run with `tsx`, no build step).

## First-time setup

```bash
npm install
cp .env.example .env        # then set JWT_SECRET (openssl rand -base64 48)
npm run db                  # terminal 1: local MongoDB replica set on :27018 (data in ./.mongo)
npm run db:init             # once: turns it into a replica set (needed for transactions)
npm run seed                # loads the epic 1 mock catalog + settings
npm run create-admin -- you@example.com
```

Then `npm run dev` serves the API on http://localhost:5050/api (5000 is taken by macOS AirPlay Receiver).
The Vite dev server proxies `/api` there.

## Public API

| Endpoint                               | Notes                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /api/catalog?kind=&brand=`        | Published listings in the client's `Fragrance` shape, newest first                                        |
| `GET /api/catalog/:slug`               | One listing                                                                                               |
| `GET /api/search?q=&limit=`            | Listings whose house or name contain every word of `q`, best first; `{ results, total }`                  |
| `GET /api/brands`                      | Brands with published listings, counts per kind                                                           |
| `GET /api/settings/public`             | Enabled shipping options, lettermail limits, Facebook link                                                |
| `POST /api/inquiries`                  | Prices, shipping rules and stock checked server-side; stock is held in a transaction. 5 per 10 min per IP |
| `GET /api/inquiries/:reference/status` | `{ reference, status, updatedAt }` only                                                                   |

Errors are always `{ error: { code, message, details? } }`. Codes: `invalid_request` (400), `not_found` (404),
`unavailable` / `lettermail_unavailable` / `price_changed` (409), `rate_limited` (429).

## Admin API (`/api/admin`, needs the session cookie from login)

| Endpoint                                                      | Notes                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`     | HttpOnly, SameSite=Strict cookie, 7 days. 10 failed logins / 15 min per IP                                                                                                                                       |
| `GET /stats`                                                  | Inquiry counts, open value, fulfilled last 30 days, low stock                                                                                                                                                    |
| `GET /inquiries?status=&search=&page=` · `GET /inquiries/:id` |                                                                                                                                                                                                                  |
| `PATCH /inquiries/:id`                                        | `{ status?, note?, adminNotes? }`. new → contacted → confirmed → fulfilled; cancel from any open status releases held stock. Fulfilled/cancelled are final                                                       |
| `GET/POST /listings` · `GET/PATCH/DELETE /listings/:id`       | All three kinds, costs included. PATCH takes the full listing (as GET returns it). Delete only if never inquired; otherwise archive                                                                              |
| `POST /uploads`                                               | Raw image body (JPEG/PNG/WebP/AVIF, ≤4MB) → `{ url, pathname }`                                                                                                                                                  |
| `GET/POST /brands` · `GET/PATCH/DELETE /brands/:id`           | `description`, `logo`, `logoMobile` (banner shown when shoppers browse the brand). PATCH leaves them alone when omitted; `null` removes one and deletes its file. Renaming a slug updates listings' brand filter |
| `GET/POST /fragrances` · `GET/PATCH/DELETE /fragrances/:id`   | `photo` is the bottle photo listings without their own photos show; replacing or removing it deletes the old file                                                                                                |
| `GET /fragplace?brand=&name=`                                 | Up to 5 Fragplace matches (year, notes, accords, preview image). Needs `RAPIDAPI_KEY`                                                                                                                            |
| `POST /fragplace/photo`                                       | `{ thumb }` from a match → copies it into storage as a 900×1200 WebP → `{ url, pathname, width, height }`                                                                                                        |
| `GET /fragplace/brands?name=`                                 | Up to 5 brand matches with description and logo preview                                                                                                                                                          |
| `POST /fragplace/logo`                                        | `{ thumb }` → trims the white margin and stores `{ desktop, mobile }` WebP logos                                                                                                                                 |
| `GET/PUT /settings`                                           | Shipping options, lettermail limits, Facebook link, tagline                                                                                                                                                      |

Admin mutations from another site's pages are refused (Origin check) on top of the SameSite cookie.

## Fragrance lookup (Fragplace)

The admin fragrance form looks fragrances up in the [Fragplace Fragrance API](https://rapidapi.com/freeyourmusic-fragplace/api/fragrance-api)
(RapidAPI, free plan: 1,000 requests a month) once a name and brand are filled in, and the brand form looks
brands up by name for their description and logos. Picking a match fills in the
empty year, notes and accords and copies the bottle photo into our storage, so the shop never loads images from
Fragplace. Set `RAPIDAPI_KEY` in `server/.env` and in the Vercel project; without it the lookup shows a
"not set up" message and everything else works.

## Photo storage (Vercel Blob)

Admin photo uploads go to **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set, and to `./.uploads` when it isn't
(local dev only). On Vercel the server refuses to start without the token, because the disk is read-only.

1. In Vercel: **Storage → Create → Blob**, with **Public** access (shoppers load the photos directly).
2. Locally: copy the store's `BLOB_READ_WRITE_TOKEN` into `server/.env`. On Vercel: connect the store to the
   project and the variable is added for you.
3. `npm run blob:check` uploads a test image, downloads it as a shopper would, checks the one-year cache header,
   and deletes it.

Photos get random names and are never edited in place, so they're cached for a year (`cacheControlMaxAge`).
Removing a photo in the admin deletes the file from Blob.

## Checks

Both smoke tests change data, so re-seed after:

```bash
npm run seed && npm run smoke && npm run seed
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run smoke:admin && npm run seed
```

Browse the data with MongoDB Compass at `mongodb://127.0.0.1:27018/?replicaSet=rs0`, database `decants`.

## Collections

| Collection   | What it holds                                                              |
| ------------ | -------------------------------------------------------------------------- |
| `brands`     | House names + slugs used by `?brand=`                                      |
| `fragrances` | The scent itself (notes, accords, description), shared by all its listings |
| `listings`   | What's for sale; `kind` is `decant` \| `catch-release` \| `full-bottle`    |
| `inquiries`  | Submitted inquiries with price snapshots; stock is held on creation        |
| `admins`     | The admin login (bcrypt hash)                                              |
| `settings`   | One document: shipping options, lettermail limits, Facebook link           |

Rules shared with the client (option list, stock maths, lettermail limits) live in `../shared/`.
