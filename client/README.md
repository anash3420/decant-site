# Decants — client

React 19 + Vite + TypeScript + Tailwind v4. The old shop and admin were removed; `src/` holds only an entry point
and a placeholder page while the new frontend is written to the redesign in `../CLAUDE.md`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Requests to `/api/*` are proxied to `http://localhost:5050` (5000 is taken by macOS AirPlay). Import shared rules
(types, stock maths, lettermail rule, validation) from `@shared/*`, which points at `../shared/`.
