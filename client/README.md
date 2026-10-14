# Decants — client

React + Vite + TypeScript + Tailwind v4, themed with the Fig leaf palette.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Requests to `/api/*` are proxied to `http://localhost:5050` (the Express server; 5000 is taken by macOS AirPlay).
The shop has no catalog data of its own: listings, shipping options and rates, the tagline and the Facebook link
all come from the API and are edited in `/admin`. Run the server (see `../server/README.md`) before `npm run dev`.

## Structure

```
src/
  config.ts          site name only (branding)
  api/shop.ts        public API client (catalog, settings, inquiries, status)
  context/           ShopContext (catalog + settings, refreshed on tab focus), InquiryContext (saved picks), ToastContext
  layouts/           SiteLayout (loads the shop data, header, footer)
  pages/             Home, CategoryPage, FragranceDetail, Inquiry, History, NotFound
  components/        cards, rows, carousel, brand sidebar, skeletons
  lib/               catalog helpers, History storage, reduced-motion helper
  admin/             /admin panel (lazy-loaded; never in the shop bundle)
../shared/           types, stock maths, lettermail rule, validation; shared with the server
```

## Theme tokens

Use as Tailwind classes: `bg-bg`, `bg-surface`, `text-text`, `text-muted`, `border-border`,
`bg-accent`, `hover:bg-accent-hover`, `bg-accent-soft`, `text-on-accent`,
`bg-instock-soft text-instock`, `bg-soldout-soft text-soldout`, `font-display`.
