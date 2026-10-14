# Anash's Fragrances

A decant shop for the CFE Facebook community: browse decants, Catch & Release vials and full bottles,
build an inquiry, and get contacted on Facebook to arrange payment. No checkout or payments on the site.

**Stack:** MongoDB · Express 5 · React 19 (Vite, Tailwind v4) · Node · TypeScript throughout

| Folder | What's in it |
|---|---|
| [`client/`](client/README.md) | The shop and the `/admin` panel (React + Vite) |
| [`server/`](server/README.md) | REST API, MongoDB models, seed + smoke-test scripts |
| `shared/` | Types, stock maths, lettermail rule and validation used by both |

## Run locally

Needs Node 20.19+ and MongoDB 7+.

```bash
# API + database
cd server
npm install
cp .env.example .env            # then set JWT_SECRET
npm run db                      # leave running (local MongoDB replica set on :27018)
npm run db:init                 # once
npm run seed                    # sample catalog
npm run create-admin -- you@example.com
npm run dev                     # API on http://localhost:5050

# Shop (new terminal)
cd client
npm install
npm run dev                     # http://localhost:5173, admin at /admin
```

## How it works

- Stock is held the moment an inquiry is sent (buy-it-now style) inside a MongoDB transaction, so two buyers
  can't get the last bottle. Cancelling an inquiry in the admin puts the stock back.
- The server prices every inquiry itself and enforces the shipping rules; the browser only sends what was picked.
- Visitors' sent inquiries are kept in their browser's History and show live status from the API.
