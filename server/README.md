# Decants — server

The MongoDB schema (Mongoose 9 + TypeScript) for the shop. The old Express API was removed (it's in git history on
`main`); the new backend will be written as separate services on top of these models.

## What's here

| File                 | What it is                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- |
| `src/models/*.ts`    | The schema: brands, fragrances, listings (three kinds), inquiries, admins, settings |
| `src/models/lean.ts` | Typed shapes for `.lean()` reads                                                    |
| `src/db.ts`          | `connectDb()` / `disconnectDb()`, with the connection cached between calls          |
| `src/env.ts`         | Environment variables, validated with zod at startup (exits on anything invalid)    |

Rules shared with the frontend (option list, stock maths, lettermail limits, slugs) live in `../shared/`.

## Local database

```bash
npm install
cp .env.example .env        # env.ts still requires JWT_SECRET (openssl rand -base64 48)
npm run db                  # keep running: local MongoDB replica set on :27018 (data in ./.mongo)
npm run db:init             # once: turns it into a replica set (needed for transactions)
```

Browse the data with MongoDB Compass at `mongodb://127.0.0.1:27018/?replicaSet=rs0`, database `decants`.

## Collections

| Collection   | What it holds                                                              |
| ------------ | -------------------------------------------------------------------------- |
| `brands`     | House names, slugs, description and logos                                  |
| `fragrances` | The scent itself (notes, accords, description), shared by all its listings |
| `listings`   | What's for sale; `kind` is `decant` \| `catch-release` \| `full-bottle`    |
| `inquiries`  | Submitted inquiries with price snapshots; stock was held on creation       |
| `admins`     | The admin login (bcrypt hash)                                              |
| `settings`   | One document: delivery options, lettermail limits, stock deduction switch  |
