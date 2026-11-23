# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A retail decant shop ("Anash's Fragrances"). **It is being rebuilt.** The old React shop, admin panel and Express API
were removed (they are in git history, on `main`). What exists now:

- `server/src/models/`: the MongoDB schema (Mongoose 9). This is kept and is the base for the new backend.
- `server/src/db.ts` (cached Mongoose connection) and `server/src/env.ts` (zod-validated environment).
- `shared/`: types, stock maths, the lettermail rule, validation regexes and slugs, for both backend and frontend.
- `client/`: the new frontend (Vite + React 19 + Tailwind v4 + React Router). The homepage, All decants, All houses, the
  house (brand) page and the fragrance page are built; every other route shows a lazy-loaded "coming soon" page.

The new backend will be written from scratch as separate services; their layout isn't decided yet. The new frontend
follows the "Storefront redesign" section below.

**Frontend layout (`client/src`).**

- `content/site.json`: shop text and rules that change with the business (email, location, shipping costs and
  free-shipping levels, ticker messages, the owner's note, footer links). Text may use `{lettermailFree}`,
  `{trackedFree}`, `{lettermailCost}`, `{trackedCost}`, filled by `lib/content.ts` `fill()`, so a price is written
  once. This moves to the database and admin later.
- `api/shop.ts`: the only data layer. It serves `data/mock/*.json` (already in the shopper shape, no bottles; a snapshot of the 13 live decants and 11 houses,
  plus homepage content: spotlight slides, featured houses, moods) after a short delay. Swap each function for a
  `fetch()` when the services exist. Each resource is one cached promise, read in components with React's `use()`
  inside `<Suspense>` with a same-size skeleton, so nothing shifts while loading.
- Mock images are in `public/mock/` (product photos 720×900, spotlight crops desktop 1410×900 and phone 618×840,
  house logos).
- `components/ProductCard.tsx` is the one product card (props: `listing`, `priority`), memoised; the heart uses
  `lib/wishlist.ts` (a `useSyncExternalStore` store in localStorage) so hearting re-renders only that button.
  `Photo.tsx` keeps an image's frame with a shimmer until it loads, lazy by default.
- Effects Tailwind can't express (ticker, scent trail, light pools, burgundy glow, outlined numbers, spotlight pool
  and reflection, reveal-on-scroll) are classes in `index.css` under `@layer components`. Reveal uses CSS
  scroll-driven animations (no JavaScript) and everything respects `prefers-reduced-motion`.
- Top bar hover menus (desktop): `components/MegaMenu.tsx`, opened from `SiteHeader.tsx` (hover with a short intent
  delay, keyboard focus, Escape, closes on scroll or link click, dims the page). Their content is **hardcoded** in
  `data/mock/menus.json` (owner, 2026-11-22): lists, counts, families and photos. It was generated from the mock
  catalogue, so its counts don't update by themselves; it moves to the API later. The Houses tiles show the four
  spotlight houses (Nishane, Roja Dove, Essential Parfums, Sospiro) with the owner's photos.
- Phone menu: `components/PhoneMenu.tsx`, a drawer from the left opened by the header's menu button. It stays
  mounted (inert while closed) so it slides both ways; one accordion open at a time (grid-rows animation); Escape,
  the dimmed page or any link closes it and focus returns to the menu button. It reads the same `menus.json`.
- All decants (`pages/Decants.tsx`, route `/decants`): filter and sort state lives in the URL (`lib/filters.ts`), using
  the params the menus link with (`accord`, `price`, `size`, `mood`, `house`, `type`, `worn`, `sort`). Within a group
  choices widen the results, across groups they narrow them; option counts are whole-catalogue totals. Filter & Sort
  (`components/catalogue/FilterPanel.tsx`) is one component: a left drawer on desktop, a bottom sheet on phones, both
  portalled to `body` (`lib/useModal.ts` handles Escape, scroll lock and focus). Page copy is in `site.json` `catalogue`.
- Drawers and sheets (filters, sort, quick buy, bag) share their motion through `lib/overlay.ts`: open 400 ms
  `ease-lux`, close 260 ms `ease-out`, and with reduced motion a 200 ms fade instead of the slide. Quick buy and the
  bag hand over to each other without the dim fading (`handOffQuickBuy`, `handOffBag`). On touch, the phone sheets
  and the bag can be dragged away (`lib/useDragDismiss.ts`).
- Quick buy (desktop, mouse only): `components/QuickBuy.tsx`, a 500 px drawer from the right mounted once in the
  layout and opened from any card through `lib/quickBuy.ts`. Add to bag closes it and opens the bag.
- Bag: `components/Bag.tsx` (`BagPanel`, mounted once in the layout) with its state in `lib/bag.ts`: lines of slug,
  size and quantity in localStorage, capped by `shared/stock.ts` `maxQty`; `addToBag` opens the panel and marks the
  line "Just added". The header's "Bag (n)" (phone: a badge) and the phone menu open it. The free-shipping levels come
  from `site.json` `shipping`, its text from `site.json` `bag` (words in [brackets] are set in burgundy). "You may
  also like" picks in-stock decants not in the bag by shared accords. Checkout links to `/checkout` (not built).
- Fragrance page (`pages/Product.tsx`, route `/fragrance/:slug`): `components/product/Gallery.tsx` (desktop stack,
  phone swipe strip), `PhotoViewer.tsx` (full screen; zoom to 2× on desktop, the browser's pinch on phones),
  `BuyCard.tsx` (size tiles with cost per ml, total, stepper, Add to bag, and the phone's sticky bar). "You may also
  like" uses `similar()` in `lib/catalog.ts` (shared with the bag); recently viewed is `lib/recent.ts`. Copy is in
  `site.json` `product`. Interlude M's four mock photos are linked from the web (brand CDN and Unsplash), not stored.
- All houses (`pages/AllHouses.tsx`, route `/houses`): A to Z letter sections of house tiles; a sticky letter rail
  (desktop) or round letter buttons (phone) that follow the scroll; type chips (`?type=niche`) using `typeOf` from
  `lib/filters.ts`. Only houses with decants appear (`lib/houses.ts` `housesOf`). Shop pages share their head
  (`components/PageHead.tsx`).
- House page (`pages/Brand.tsx`, route `/houses/:slug`): photo banner with the name (the owner hasn't picked name or
  logo; name is built), then `Listings` from `pages/Decants.tsx` (the same Filter & Sort and grid as All decants,
  with `house` set: no House filter, accord pills or mood tile), a "Want another…" note tile (mailto) and four other
  houses (`components/HouseTile.tsx`, `compact`). The banner uses `brand.banner` when the owner uploads one, else
  the house's first decant photo, blurred behind and sharp on the right.
- Dropdowns use `components/Dropdown.tsx` (the shop's pill button and white menu; Escape, click outside, arrow keys;
  opens upwards when there isn't room). Used by the sort menu and the bag's size menu; don't use a native `<select>`.
- Desktop styles start at `lg` (1024 px); below that is the phone layout.

## Commands

Run from the repo root:

- `npm run setup` installs root tooling, client and server
- `npm run check` runs typecheck + lint + format:check + tests + client build (use this as the "done" check). Untracked
  folders (`design-previews/`, `.agents/`, `.impeccable/`) fail format:check; they aren't part of the code.
- `npm run typecheck`, `npm run lint` / `lint:fix`, `npm run format` / `format:check`
- `npm run build:vercel` writes `.vercel/output` (Build Output API, static frontend only for now).
  `npm run preview:vercel` serves it on :3000.

Local database (needs MongoDB 7+ with `mongod` and `mongosh` on PATH), in `server/`:

- `cp .env.example .env`. `env.ts` exits on invalid env; it still requires the old API's `JWT_SECRET` (min 32 chars)
  until the new services decide what they need.
- `npm run db`: local replica set on :27018, data in `server/.mongo`. It must be a replica set because stock holds
  use transactions. `npm run db:init` once to initiate it.
- Production DB settings are in `server/.env.production` (git-ignored).

In `client/`, `npm run dev` serves http://localhost:5173 and proxies `/api` to :5050.

`npm test` runs the tests (`node --test`, no framework): `shared/**/*.test.ts` and `client/src/**/*.test.ts`.
`scripts/test-hooks.mjs` lets them resolve `@shared/*`. Client tests are typechecked by `client/tsconfig.node.json`.

## Schema (server/src/models)

- **One `listings` collection with three kinds**, Mongoose discriminators on `kind`: `decant` | `catch-release` |
  `full-bottle` (`Listing.ts`). The shop is now decants only (see below), but removing the other kinds from the schema
  is a separate change; ask before starting it.
- A listing points to a `Fragrance` (the scent: notes, accords, category, concentration, gender, year). That
  reference is `immutable` once created, because inquiries and price history point at the listing.
- `brandSlug` is copied from the brand onto each listing so brand filtering needs no `$lookup`. Renaming a brand slug
  must update its listings.
- Decant listings hold `bottles` (`sizeMl`, `remainingMl`, admin-only `batchCode`, `acquiredAt`, `costPaid`) and
  `prices` per size. Admin-only fields (`costPaid`, `sourcedFrom`, `batchCode`) must never reach shoppers, and
  neither may ml left (see "Never show" below).
- `Inquiry.ts`: line snapshots (name, option, unit price), `heldFrom` per decant line (which bottles the held ml came
  from, so a cancellation can put it back), status history (`new → contacted → confirmed → fulfilled`, or
  `cancelled`), `stockHeld`. The redesign moves to paid orders, so this model will change.
- `Settings.ts`: one document (`key: 'site'`) with delivery options, lettermail limits and `deductStock`.
- `Brand.ts` (name, slug, description, `logo`, `logoMobile`), `Admin.ts` (email + password hash).
- Typed `.lean()` shapes are in `lean.ts`.

Rules the old API enforced and the new backend should keep: the server prices everything (the browser sends only
slug, size and quantity); stock is held inside a MongoDB transaction when an order is placed (decants take ml from
the fullest bottle first); stock maths on bottles is in `shared/stock.ts` (`getOptions`, `maxQty`, `isSoldOut`).
**Shoppers never get bottles.** The API sends each decant through `toShopListing` (`shared/shop.ts`): the listing
without bottles, each size carrying `maxQty`, the most a shopper can add, capped at 10 so it never gives away the ml
left. The shop works only from that (`shared/shop.ts` `getOptions`, `isSoldOut`, `fromOption`); each size is capped
on its own, so checkout on the server must recheck stock across sizes.

**Shared imports.** The client uses the `@shared/*` alias (Vite + tsconfig); server code uses relative paths with
the `.ts` extension (`'../../../shared/stock.ts'`). Change a rule in `shared/`, never in only one place.

## Conventions

- **Mobile first.** Most traffic is from phones. Check UI at 375px and 320px: no horizontal scroll, 44px tap
  targets, 16px form inputs.
- Style comes from theme tokens defined in `client/src/index.css` and used as Tailwind classes, not raw colours.
  The tokens are to be rewritten for the redesign's visual system.
- Prettier sets no semicolons, single quotes, 120 columns and Tailwind class sorting. ESLint enforces
  `consistent-type-imports`, and `_`-prefixed names may go unused.
- Concentrations and fragrance categories are fixed lists in `shared/types.ts`, and the schema rejects anything else.
- Prices are in CAD (`formatPrice` in `shared/stock.ts`).

## Storefront redesign (owner's decisions)

The shop is being redesigned. Everything below was decided with the owner; build to it without re-asking. The
mockups in `design-previews/` are the visual spec. Each `.html` is self-contained (its CSS holds exact sizes, colours
and spacing), and each `.jpg` is a render of it. Read the matching `.jpg` first, then the `.html` for exact values.

### Mockup index (all approved unless noted)

| Page                                      | Files                                                                                                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage, desktop                         | `final-home-desktop.html`, `final-home-desktop-*.jpg`                                                                                                                             |
| Homepage, phone (draft, not reviewed yet) | `draft-home-phone.html` / `.jpg`                                                                                                                                                  |
| Top bar menus, desktop                    | `topbar-houses.jpg`, `topbar-all-decants.jpg`, `topbar-fragrances.jpg` (source `topbar-menus.html`, `topbar-fragrances-shop-all.html`; use only the chosen variants listed below) |
| Top bar menu, phone                       | `topbar-phone-menu.html` / `.jpg`                                                                                                                                                 |
| All decants (catalogue)                   | `catalogue-final-desktop.*` (+ `-drawer`, `-filtered` jpgs), `catalogue-final-phone.*`                                                                                            |
| Quick buy (desktop only)                  | `catalogue-quick-buy.*`                                                                                                                                                           |
| All houses                                | `houses-az3-desktop.jpg`; phone is the third frame of `houses-az-phone.jpg` (source `houses-az-*.html`, idea "Z3")                                                                |
| Brand (house) page                        | `brand-banner-name-desktop.jpg`, `brand-banner-logo-desktop.jpg`, `brand-banner-phone.jpg`                                                                                        |
| Bag (side panel) and free shipping        | `bag-desktop.jpg`, `bag-phone.jpg`, `bag-free-shipping.jpg`                                                                                                                       |
| Fragrance (product) page                  | `product-final-desktop*.jpg` (+ `-scrolled`, `-hover`), `product-final-phone.jpg`, viewer `product-photo-viewer-*.jpg`                                                            |
| "From me to you" band (homepage)          | `home-note-pour.jpg` (idea 3 in `note-ideas.html#3`); saved alternative to revisit: `idea-note-the-bench.jpg` (`#4`)                                                              |
| Homepage module ideas (optional extras)   | `idea-*.jpg`                                                                                                                                                                      |

### What the shop is

- A **retail decant shop**: decants only. No Catch & Release, no full bottles, no "Samples" in nav, chips, counts
  or footer. All counts come from decant listings only. Removing the other listing kinds from code is a separate
  change; ask before starting it.
- **The whole store will be restocked with different perfumes.** Only the four spotlight fragrances stay: Roja
  Dove Burlington 1819, Essential Parfums Bois Impérial, Nishane Favonius and Sospiro Vibrato. Every other decant
  in the mock data (and the moods, featured houses and counts built from them) is temporary. Never hardcode product
  names, house names or counts in components; derive them from the data.
- **Spotlight photos are the owner's.** Don't retouch them. When a square or portrait photo is too narrow for the
  wide desktop slide (about 3:2), the owner prefers keeping the whole bottle: place the photo at full height in the
  centre and fill the sides with the same photo stretched and heavily blurred, with the photo's left and right edges
  feathered into it (as done for Sospiro Vibrato). A tight crop that cuts the bottle was rejected as "too zoomed in".
- **Never show** ml left in a bottle ("92 ml left", "Only 20 ml left", the old shop's ml-left card badge,
  "Fill level" photos) or **spray counts**. Availability is only in stock or sold out. **Cost per ml** appears only
  on the fragrance page's size tiles (owner's later decision); cards, menus and the quick buy show prices only.
- **Brand voice, never first person singular** (owner, 2026-11-22): the site speaks as a brand, not a sole owner.
  Never write "I", "me", "my" or "mine" in any shop text (content, components, meta tags, alt text). Use the brand
  voice ("we", "our" sparingly) or neutral wording ("poured from authentic full bottles", not "from my own bottles").
  The homepage band's kicker reads "From us to you"; "From me to you" below is only the section's working name.
- **No personal name on the site** (owner, 2026-11-22): the owner's first name must not appear in the note, footer,
  links ("Write to us", not "Write to Anash") or anywhere else. The shop name "Anash's Fragrances" and the A.S. logo
  stay for now; the shop will be renamed to a brand without the owner's name (a candidate is "Niche Decants",
  nichedecants.ca / .com), which only changes `shopName` in `content/site.json` plus the logo.
- The look is luxury but shop-first (Holt Renfrew / Harrods feeling) and must be original: don't copy reference
  sites. Rejected directions were generic, discount-looking, playful, "funky" loud colours, and dark "Maison" heroes.

### Visual system

- Accent **burgundy `#6d1f33`**; plum is not the primary colour. Use soft, low-saturation, warm neutrals. The page
  background is warm ivory (`#f5efe7` to `#f2e9e4`), with white cards and text `#0f1720`. Muted text is `#6e645b`.
- Burgundy panels use a deep burgundy-black radial gradient `#4a1626 → #2a0d16 → #170709` (lit from the top right, the same as the
  All decants menu; owner, 2026-11-22) with a soft white sheen. On burgundy panels the headings stay ivory and the small links ("Shop all new in →", "Browse") are gold `#e2c79c`
  (`text-gold`, underline `border-gold/60`); big gold headings were rejected (owner, 2026-11-22). The two homepage tiles among the product cards (the shelf tile and "All N houses") use `.burgundy-mid`, a
  lighter burgundy `#6a2238 → #4a1628 → #2e0d18`, so they don't pull too much attention. A page that ends with a burgundy band sits flush on the footer.
- Type: **Fraunces** for display and names, **Schibsted Grotesk** for UI. Italic Fraunces is for quotes and links
  like "Make it yours". Use US spelling ("cozy").
- "Atelier light" art: warm light pools and grain in the background, a fine burgundy scent-trail line running down
  the page to the footer, and big outlined numbers behind headings with a numbered kicker above them. **On the
  homepage the number is the section's count, from the data** (owner, 2026-11-22), and it appears **only once, as
  the outlined number behind the heading**: the shelf shows the number of decants, Discover houses the number of
  houses, Shop by mood the number of moods, padded to two digits ("06"). The kicker ("The collection") and the link
  ("All decants", "All houses", "All moods") carry no number. The shelf has filter chips but no sort control. The empty space right of a heading holds a hairline ending in a
  dot, an italic line and the section link. Don't repeat the same information on both sides.
- Announcement ticker: burgundy, scrolling, champagne sparkle separators, pauses on hover, static with reduced
  motion, hidden when no message is enabled.
- Logos: brand logos are multiplied onto white. On photos or dark panels they are reversed to white, which needs a
  white or clean logo version per house (Roja's and Essential Parfums' logos read faintly).

### Header and top bar

- Desktop header (owner, 2026-11-21): **one row**. The A.S. seal and "Anash's Fragrances" on the left, the nav in
  the centre, and on the right a search icon (icon only) then account, wishlist and Bag (n). The search icon will
  open a search panel sliding down from the top (to be designed). No second nav row.
- **Nav: New in · All decants · Fragrances · Houses.** Moods is not in the top bar.
- **New in ("Arrivals wall", owner chose C, 2026-11-22; `topbar-new-in.jpg`, source `topbar-new-in-ideas.html#C`):**
  the newest arrival as a large photo tile ("Newest arrival", no date; name, "From $X for N ml · Discover"), the
  next two as cards, and a burgundy "This month · N new decants · Shop all new in" tile. On phones it is the first
  accordion: the newest as a wide photo, two small cards, then the burgundy button. New = added in the last 30 days.
  **Every New in photo is designed art, never the listing photo** (owner's rule): each new decant needs a wide and a
  tall art image. Vibrato uses the owner's spotlight photo; Blue Talisman and French Defense have designed stand-ins
  (the bottle on a moody backdrop in its colour) in `client/public/mock/art/` until the owner's art arrives.
- Hovering a nav item opens a full-width white panel under the header and dims the page. **Photo cards zoom their
  photo outwards on hover** (scale about 1.08, ~0.6s ease), and the tile lifts slightly.
  - **Houses (M1):** "Top houses" list (the seven with the most decants, ties A to Z; owner, 2026-11-22) with counts and "View all N houses" on the left, then four tall photo tiles,
    each with the house logo in white near the bottom. No "Shop the house" text.
  - **All decants (M2 "Salon"):** a dark burgundy-black panel with ivory Fraunces columns (Accord, Worn by, Type,
    Size, Shop by) and counts. The hovered link turns gold `#e2c79c`. One lit featured photo with a caption.
  - **Fragrances (F1 + Shop all tile):** Worn by and Strength lists on the left, four scent-family photo tiles
    (Woody & Oud, Amber & Spice, Fresh & Citrus, Floral & Fruity; families are grouped from existing accords),
    then a burgundy **"Not sure yet? Shop all 13 decants · Browse the catalogue"** tile that links to All decants.
    Sweet & Gourmand / vanilla is left out until the owner stocks one, so families must be easy to add or remove.
- **Phone:** a hamburger, the logo and the bag in the header. The hamburger opens a drawer from the left (dimmed
  page) with close, name, bag and search. Below that: New in →, then one-open-at-a-time accordions:
  - **All decants:** Shop all button, then Accord, Size and Type chips.
  - **Fragrances:** 2×2 family tiles, the burgundy Shop all bar, then Worn by chips.
  - **Houses:** round A to Z letters, 2-column logo tiles, then View all.

  At the bottom are Account, Wishlist and the customer-service email. Phones have no hover effects.

### Homepage (desktop settled)

Order:

1. Ticker and header.
2. **Spotlight carousel** ("Pool of light"): photos fill the slide with a vignette, and the colour pools down onto a
   glass shelf with a faint reflection. A white caption card at the bottom left shows house, name, "From $X" and
   Discover. No buy bar.
3. **01 The shelf:** product grid.
4. **02 Discover houses:** logo tiles, with the last tile opening all houses.
5. **03 Shop by mood:** "the list", all six moods typeset like a wine list. Moods: Cold evenings, Long summer days,
   Nine to five, Date night, Weddings and parties, Cozy nights in.
6. **"From me to you" (owner chose idea 3, "the pour", 2026-11-22):** a full-width burgundy band that closes the
   page. The kicker, the italic quote in ivory, and the A.S. seal reversed to ivory with "Calgary, Alberta" (no name).
   Below, three steps (Poured · Labelled and packed · Posted, with the shipping prices) joined by a fine line with
   champagne dots: a row on desktop, a column down the left on phones. No icons. The steps' text is in
   `content/site.json` `note.steps`. The "bench" idea (a photo of the owner's pouring bench with the quote on a
   caption card) is saved to revisit if the owner sends a bench photo.
7. Footer: four stacked columns.

Phone: a single-slide spotlight, a 2-column shelf, three moods plus "3 more moods", and a 2-column footer.

### Product card (everywhere)

- **No card box.** The photo **fills a 4:5 frame** (cover, 14 px radius on desktop, 12 px on phone). The details
  sit straight on the page background below it: house (small), name (Fraunces), "From $X / for N ml", and an
  italic burgundy **"Make it yours →"** link to the product page (desktop).
- **Phone card ("C"):** house (12 px), then the name (Fraunces 17 px, at most 2 lines, no reserved height). Below
  them, one row: the price on the left ("From $12" with "for 5 ml" under it) and a 40 px round outline arrow button
  on the right that opens the product page. There's no "Make it yours" text on phone, and the whole card is
  tappable. Rows of cards are 22 px apart.
- On the photo: the heart top right (in a white circle) and an optional "New" tag top left. No "Add" or "Add to bag"
  button on cards.
- **Desktop only:** on hover a round burgundy bag button appears on the photo's corner (with a "Quick buy" tooltip).
  It opens the **quick-buy drawer from the right** (500 px):
  - a photo mosaic (one large, two small), house, name, concentration and gender, and one italic line of the story
  - the accords, typeset with dots
  - a segmented size picker ("3 ml $14 | 5 ml $20 | 10 ml $35")
  - a quantity stepper and a sticky "Add to bag" button. The price shows only once, in the size picker, never
    again in the button.

  No delivery or trust notes in the drawer. **Phones have no quick buy;** the card links to the full page.

### All decants page

- Page head: crumb, a kicker, "All decants", and an italic line. The right fill holds an italic line and a "How
  decants are poured" link.
- **Desktop:** full-width 4-column grid with no fixed sidebar.
  - A burgundy **Filter & Sort** button (showing the active count) opens a **440 px drawer from the left**. Sort by
    is first (radio: Newest, Price low to high, Price high to low, Name A to Z), then Price, Accord and Size open,
    with Mood, House and Type collapsed. Clear all, and a sticky "Show N decants" button.
  - Price uses **bands** (Under $10, $10 to $15, Over $15), never a slider.
  - Active filters show as white chips with a burgundy outline.
  - Short results get an "Only N match, widen your search" box.
  - "Not sure where to start? Shop by mood" is the **8th card**. No note tile ends the grid (owner removed it, 2026-11-22).
- **Phone:** under the heading, a scrolling row of accord pills (Everything 13, Woody 10…). Then a row with a burgundy
  "Filter (n)" button and a "Sort Newest" button. Filter opens a bottom sheet: accord tiles (three round bottle
  thumbnails, name and count) in 2 columns, then Price, Size and Mood, Clear all, and a sticky "Show N decants" button.

### All houses page ("Z3")

- Page head like the catalogue's. The right fill is "Browse by letter" plus type chips (All, Niche, Designer, Dupe).
- **Desktop:** a sticky vertical A to Z rail (white pill, round letters, current letter burgundy). Each letter is a
  section with a big burgundy letter, a fading hairline and "N houses". Below it, a 3-column grid of white tiles:
  - the logo large on white
  - the name, "Niche · 1 decant"
  - small round bottle thumbnails
  - "from $X" and "Shop →"

  The hovered tile lifts.

- **Phone:** round 44 px letter buttons, then the letter sections with 2-column logo tiles. Only letters that have
  houses appear. A tile opens the brand page.

### Brand (house) page

- A full-width **photo banner** (about 480 px desktop, 300 px phone) using a photo the owner uploads per house, with a
  dark left-to-right scrim. Over it:
  - a white crumb and a kicker ("The houses — Niche · 2 decants")
  - the house **name** in large white Fraunces, _or_ the house **logo** reversed to white (both mocked; owner hasn't
    picked)
  - one italic line from the brand description (on phone, this sits under the banner)
- Below: Filter & Sort (desktop drawer / phone sheet) **without a House group, so no brand filter on a brand page**.
  Then "Sorted by…", "N decants", the card grid, a "Want another <house>?" note tile, and an "Other houses" row of
  logo tiles.

### Fragrance (product) page

- **Desktop, top:** the crumb, then two columns.
  - **Left: the photos stacked and scrolling.** Each photo **fills its frame** (cover, about 780 px tall, rounded) with
    no captions or "1 / 4" counters. A round outline **bubble** (expand icon only, white hairline, light blur) sits
    bottom right and opens the viewer.
  - **Right: a sticky white buy card ("R2").** It holds the house logo, the name in Fraunces, then "Concentration ·
    Gender · Year", one italic line of the story, and the accords with dots. Below those:
    - "Choose your size": tiles showing only the size (big Fraunces "5 ml") and its **cost per ml** ("$4.00 / ml").
      The selected tile is filled burgundy.
    - **The price shows once**: "5 ml decant / $20" as the total, with the quantity stepper on the right.
    - **Add to bag** is an **outline** burgundy button that fills burgundy on hover, with no price in it. The heart
      sits beside it.
    - "In stock".
- **Below the top**, in order:
  - **01 The notes:** a horizontal burgundy trail with Top / Heart / Base and big outlined 01 02 03.
  - **The story:** the full description beside the house tile (logo, one line, "Meet the house").
  - **02 You may also like:** 4 standard cards, chosen by shared accords.
  - **03 Recently viewed:** the **same standard cards**, kept in localStorage, with a "Clear" link.
- **Photo viewer:** takes 100% of the screen on warm ivory.
  - Desktop has house and name, "2 / 4 · Box", zoom − / Fit / +, close, arrows and thumbnails. Zoom goes up to 2×,
    with a minimap and "drag to look closer".
  - Phone has close, swipe, dots and pinch to zoom.
- **Phone** (synced to desktop):
  - The photos are a swipe strip (about 300 px tall) with dots and the same bubble.
  - Next is the **same R2 white card**, reordered so buying comes first: logo, name and sub; the size tiles with
    cost per ml; the total with the stepper; then a filled Add to bag (phones have no hover) and the heart; In
    stock. The story line and accords close the card.
  - Then the notes trail, the story and house, and You may also like and Recently viewed as swipe rows of cards.
  - Once the card's button scrolls out of view, a sticky bar appears showing "5 ml decant / $20" and Add to bag.
    The price is still shown only once on screen.
- **Photos:** every current store photo will be replaced. Mockups use photos of the fragrance from the web (brand
  shots, Unsplash mood shots). Card photos fill their frames too (see Product card).

### Bag (cart)

There is no bag page: the bag is a **side panel**. It ends in **Checkout** (paying online). The checkout itself will
be designed later and may be replaced by a hosted shop checkout.

- **Desktop:** Add to bag opens a 480 px panel from the right and dims the page. From top to bottom:
  - "Your bag (n)" and close.
  - The **free-shipping bar** (see below).
  - One row per line:
    - a cover photo (88×110)
    - "Just added" on the newest line
    - the house and the name in Fraunces
    - a size menu ("5 ml ⌄") and a quantity stepper
    - the line price on the right, with "Remove" under it
  - **No "Pairs well".**
  - A sticky foot with "Subtotal $42", "Delivery and taxes are worked out at checkout." and a filled
    **Checkout** button.
- **You may also like (desktop):** about **350 ms after the bag opens**, a second 290 px white panel slides out to
  the bag's left. It holds two picks as tall cover photos (house, name, "From $X for N ml", Make it yours, and a
  quick-buy bag on the photo), then a burgundy "Shop all 13 decants" button. Picks come from shared accords with
  what's in the bag.
- **Phone:** the bag is a sheet from the right that covers **90% of the width** (the dimmed page shows on the left).
  - The rows are compact: a 64 px photo, the price beside the name, and the size menu and stepper underneath.
    There's no Remove link; at quantity 1 the stepper's minus becomes a bin.
  - "You may also like" becomes a **swipe row of small cards just above the subtotal**.
  - The foot is the same as desktop.
- **Free shipping:** **$50 for free lettermail, $75 for free tracked.**
  - The bag shows **one bar running to $75**, with a stop at $50 and one at $75, labelled "$50 Lettermail" and
    "$75 Tracked" (on phone, just "$50" and "$75").
  - The line above the bar changes with the subtotal:
    - under $50: "You're $8 away from free lettermail"
    - $50 to $74: "Lettermail is free. Add $21 for free tracked shipping"
    - $75 and over: "Free tracked shipping unlocked"
  - **At checkout**, the delivery list (lettermail $4 / tracked $20, from settings) strikes each price through to
    "Free" once its level is reached. The cheapest free option is picked, and a one-line hint shows what's left.
  - Mockups: `bag-desktop.*`, `bag-phone.*`, `bag-free-shipping.*`.
- **Delivery is lettermail or tracked shipping only. Pickup is being removed.**
  - Drop the `pickup` fulfilment option from settings, the admin and the checkout.
  - Remove pickup wording elsewhere: the "Free collection in Calgary" ticker message and the "Collection and post"
    footer link.
  - Decants over the lettermail limit (`shared/shipping.ts`) can only go tracked.

### Data and admin needed when building

- Content the owner changes often lives in the DB with admin forms, never hardcoded, so changes need no deploy:
  - ticker messages (ordered, each with on/off)
  - spotlight slides (photo, fragrance, order)
  - moods (name, line, fragrances)
  - the "From me to you" note
  - the two free-shipping levels: free lettermail from $50 and free tracked from $75. These are used by the
    ticker, the bag's bar and checkout.

  Store these in the `Settings` singleton or a new config collection, validate with zod, and expose them through
  a public settings endpoint.

- Spotlight photos are cropped in admin with a **live preview** (the caption card, vignette, glow and reflection,
  for desktop about 3:2 and phone about 3:4), then saved and published. The old admin's cropper
  (`CropDialog.tsx`, `processImage.ts`, in git history on `main`) is a starting point.
- New brand fields: **banner photo** (desktop wide crop about 3:1 and a phone crop, with preview), an optional
  **white logo**, and (optional, only mocked so far) **origin** and **founded year**.
- Scent families map from accords (see Fragrances above). Moods map to fragrances through the mood lists.
- **Build in code only after the full design is settled.** All pages are designed except the checkout (later,
  possibly a hosted shop checkout). The phone homepage still needs review.

### Rules for working on the design

- Show real data (the shop's live decants, houses and logos), never placeholders, and keep counts accurate. For
  product photos, use web photos of that fragrance, not the store's current photos.
- Check every phone design at 375 and 320 px: no sideways scroll, 44 px tap targets, 16 px inputs.
- Put superseded mockups in the macOS Trash and keep `design-previews/` to approved files.
