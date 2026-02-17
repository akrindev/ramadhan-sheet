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

### 1) Prerequisites

- Cloudflare account
- Bun installed
- Wrangler CLI available (`bunx wrangler --version`)

### 2) Configure Wrangler

1. Copy `wrangler.example.toml` to `wrangler.toml`:

   ```sh
   cp wrangler.example.toml wrangler.toml
   ```

2. Update `wrangler.toml`:
   - `name`
   - `[[d1_databases]].database_name`
   - `[[d1_databases]].database_id`

3. Add the external identity API URL in `wrangler.toml` as an env var:

   ```toml
   [vars]
   IDENTITY_API_URL = "https://your-identity-service.example/api/student"
   ```

4. Authenticate Wrangler:

   ```sh
   bunx wrangler login
   ```

### 3) (Optional) Drizzle Kit Environment Variables

For Drizzle Kit commands (migrations, introspect), set:

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

Cloudflare Pages runtime parity (uses Wrangler locally after build):

```sh
bun run dev:wrangler
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

### 1) Create Pages project (first time only)

Create a Pages project named `ramadhan-sheet` from Cloudflare Dashboard or with Wrangler.

If you use Git integration in Dashboard:
- Framework preset: `SvelteKit`
- Build command: `bun run build`
- Build output directory: `.svelte-kit/cloudflare`

### 2) Add production bindings in Pages

In Cloudflare Dashboard -> Workers & Pages -> `ramadhan-sheet` -> Settings:
- Bind your D1 database with binding name: `DB`
- Add env var: `IDENTITY_API_URL`

These names must match server code usage (`platform.env.DB`, `platform.env.IDENTITY_API_URL`).

### 3) Deploy manually with Wrangler

```sh
bun run build
bun run deploy:wrangler
```

Or deploy via Wrangler directly:

```sh
wrangler pages deploy .svelte-kit/cloudflare
```

## Troubleshooting

- `Database tidak tersedia` from API:
  - Ensure D1 binding name is exactly `DB` in Pages settings.
  - Ensure `[[d1_databases]].binding = "DB"` exists in `wrangler.toml`.

- `IDENTITY_API_URL belum dikonfigurasi`:
  - Add `IDENTITY_API_URL` in Pages project environment variables.
  - If testing locally, add `[vars]` with `IDENTITY_API_URL` in `wrangler.toml`.

- Build succeeds but API fails after deploy:
  - Confirm you deployed the latest build (`bun run build` then `bun run deploy`).
  - Re-check Pages production bindings (`DB`, `IDENTITY_API_URL`) after creating new environments.

- `wrangler pages deploy` permission/auth error:
  - Run `bunx wrangler login` again.
  - Verify you are using the correct Cloudflare account.

- D1 schema/table errors at runtime:
  - Apply schema to remote DB: `bun run db:apply:remote`.
  - Verify tables exist in the same D1 database ID configured in `wrangler.toml`.
