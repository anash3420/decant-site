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
| `GET /api/brands`                      | Brands with published listings, counts per kind                                                           |
| `GET /api/settings/public`             | Enabled shipping options, lettermail limits, Facebook link                                                |
| `POST /api/inquiries`                  | Prices, shipping rules and stock checked server-side; stock is held in a transaction. 5 per 10 min per IP |
| `GET /api/inquiries/:reference/status` | `{ reference, status, updatedAt }` only                                                                   |

Errors are always `{ error: { code, message, details? } }`. Codes: `invalid_request` (400), `not_found` (404),
`unavailable` / `lettermail_unavailable` / `price_changed` (409), `rate_limited` (429).

## Admin API (`/api/admin`, needs the session cookie from login)

| Endpoint                                                      | Notes                                                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`     | HttpOnly, SameSite=Strict cookie, 7 days. 10 failed logins / 15 min per IP                                                                                 |
| `GET /stats`                                                  | Inquiry counts, open value, fulfilled last 30 days, low stock                                                                                              |
| `GET /inquiries?status=&search=&page=` · `GET /inquiries/:id` |                                                                                                                                                            |
| `PATCH /inquiries/:id`                                        | `{ status?, note?, adminNotes? }`. new → contacted → confirmed → fulfilled; cancel from any open status releases held stock. Fulfilled/cancelled are final |
| `GET/POST /listings` · `GET/PATCH/DELETE /listings/:id`       | All three kinds, costs included. PATCH takes the full listing (as GET returns it). Delete only if never inquired; otherwise archive                        |
| `POST /uploads`                                               | Raw image body (JPEG/PNG/WebP/AVIF, ≤4MB) → `{ url, pathname }`                                                                                            |
| `GET/POST /brands` · `PATCH/DELETE /brands/:id`               | Renaming a slug updates listings' brand filter                                                                                                             |
| `GET/POST /fragrances` · `GET/PATCH/DELETE /fragrances/:id`   |                                                                                                                                                            |
| `GET/PUT /settings`                                           | Shipping options, lettermail limits, Facebook link, tagline                                                                                                |

Admin mutations from another site's pages are refused (Origin check) on top of the SameSite cookie.

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
