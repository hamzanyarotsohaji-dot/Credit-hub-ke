# Credit Hub KE

A Kenyan airtime / data bundle reseller app inspired by MySafaricom. Users log in with their phone number + OTP, browse airtime/data/SMS bundles, and pay via M-Pesa STK Push (Daraja). Admins manage bundles, transactions, and users.

## Stack

- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter + TanStack Query
- **Backend**: Express 5 (TypeScript) on Node, Pino logging
- **Database**: PostgreSQL via Drizzle ORM
- **API contract**: OpenAPI 3 (`lib/api-spec/openapi.yaml`) → Orval generates Zod schemas (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`)
- **Payments**: M-Pesa Daraja STK Push (sandbox / production via `MPESA_ENV`)
- **Auth**: Phone + 4-digit OTP, httpOnly cookie session (`ch_session`, 30 days). In dev mode the OTP is returned in the response as `devOtp` for testing.

## Artifacts

- `artifacts/credit-hub` — customer + admin web UI (mobile-first, root path `/`)
- `artifacts/api-server` — REST API mounted at `/api`
- `artifacts/mockup-sandbox` — design sandbox (workspace tooling)

## Key paths

- Customer: `/` login, `/home`, `/buy/:bundleId`, `/transactions/:id`, `/wallet`, `/profile`
- Admin (gated by `isAdmin`): `/admin`, `/admin/bundles`, `/admin/transactions`, `/admin/users`
- API: `/api/auth/*`, `/api/users/me`, `/api/bundles`, `/api/transactions`, `/api/mpesa/stk-push`, `/api/mpesa/callback`, `/api/admin/*`

## Admin

The admin user is seeded on the phone number `254700000000`. Log in with that phone, request OTP (returned in dev), then access `/admin`.

## Environment variables

- `DATABASE_URL` — Postgres connection string (provisioned)
- `SESSION_SECRET` — cookie signing secret
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_ENV` (`sandbox` | `production`)

The M-Pesa callback URL is derived automatically from `REPLIT_DOMAINS` and posts to `/api/mpesa/callback`.

## Seed data

Bundles and the admin user are inserted directly into the DB at provisioning time (airtime KSh 50–1000, daily/weekly/monthly data bundles, SMS packs).
