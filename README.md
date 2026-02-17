# Ramadhan Sheet - SMK Diponegoro Karanganyar

A SvelteKit + Cloudflare Pages app to collect daily Ramadhan activity sheets.

## Features

- Student identity lookup by NIS (proxied through server-side API route)
- Auto-filled, disabled identity fields (`nama lengkap`, `rombel`) after NIS is found
- Daily input fields for:
  - tanggal
  - sholat fardhu (multiple)
  - status puasa (with required reason if not full)
  - ibadah sunnah (multiple)
  - tadarus al-qur'an
  - 7 kebiasaan anak indonesia hebat (multiple)
- Data stored in Cloudflare D1

## Stack

- SvelteKit 2 + Svelte 5
- Bun runtime / package manager
- Cloudflare Pages adapter
- Cloudflare D1

## Setup

1. Copy `wrangler.example.toml` to `wrangler.toml` and fill in your values:

   ```sh
   cp wrangler.example.toml wrangler.toml
   ```

2. Set your D1 database ID, database name, and `IDENTITY_API_URL` in `wrangler.toml`.

3. For Drizzle Kit commands (migrations, introspect), set these environment variables:

   ```sh
   export CLOUDFLARE_ACCOUNT_ID="<your-account-id>"
   export CLOUDFLARE_D1_DATABASE_ID="<your-database-id>"
   export CLOUDFLARE_API_TOKEN="<your-api-token>"
   ```

## Local Development

```sh
bun install
bun run db:apply:local
bun run dev
```

## Validation

```sh
bun run check
bun run build
```

## D1 Database

Apply schema to remote D1:

```sh
bun run db:apply:remote
```

Schema file: `schema.sql`

## Deploy to Cloudflare Pages

```sh
bun run build
bun run deploy
```

Or deploy via Wrangler directly:

```sh
wrangler pages deploy .svelte-kit/cloudflare
```
