# Environment Separation

This workspace uses four canonical environments:

- `local`: developer machine only
- `preview`: ephemeral branch or PR deployment
- `staging`: stable shared pre-production environment
- `production`: live user-facing deployment

## Frontend Public Environment

Only browser-safe values belong in frontend env files.

Canonical public variables:

- `VITE_PUBLIC_APP_ENV`: `local` | `preview` | `staging` | `production`
- `VITE_API_BASE_URL`: public backend base URL used by the client
- `VITE_PUBLIC_SITE_URL`: public frontend origin
- `VITE_TURNSTILE_SITE_KEY`: public captcha site key
- `VITE_PUBLIC_SUPABASE_URL`: Supabase project URL placeholder
- `VITE_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key placeholder

Frontend example files:

- `app/frontend/.env.local.example`
- `app/frontend/.env.preview.example`
- `app/frontend/.env.staging.example`
- `app/frontend/.env.production.example`

## Backend Secret Environment

Secrets and server-only integration values belong only in backend runtime env.

Canonical backend variables:

- `APP_ENV`: `local` | `preview` | `staging` | `production`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `BACKEND_PUBLIC_URL`
- `FRONTEND_PUBLIC_URL`
- `OIDC_*`
- `STRIPE_*`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

Backend example files:

- `app/backend/.env.local.example`
- `app/backend/.env.preview.example`
- `app/backend/.env.staging.example`
- `app/backend/.env.production.example`

## Rules

- Never put backend secrets in `VITE_*` variables.
- Never read `VITE_*` variables from backend code.
- Use `BACKEND_PUBLIC_URL` and `FRONTEND_PUBLIC_URL` for deployed origins.
- Use `APP_ENV` on backend and `VITE_PUBLIC_APP_ENV` on frontend instead of ambiguous `dev`/`prod` strings.
- Vercel preview should use the `preview` env examples, not `production`.
- Shared staging should use the `staging` examples, even if its frontend is also hosted on Vercel.

## Supabase Placeholders

Supabase is intentionally defined as placeholders only.

- Frontend uses public placeholders: `VITE_PUBLIC_SUPABASE_URL`, `VITE_PUBLIC_SUPABASE_ANON_KEY`
- Backend uses secret placeholders: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`

If Supabase is enabled later, keep that public/secret split unchanged.

## Deployment Migration Checklist

This repository cannot update Vercel project variables or backend-hosting secrets directly. Apply the following mapping in your provider dashboards or CLIs before deleting legacy keys.

Backend hosting migration:

- set `APP_ENV=preview` for ephemeral review deployments, `APP_ENV=staging` for the shared staging stack, and `APP_ENV=production` for production
- set `BACKEND_PUBLIC_URL` to the deployed backend origin
- set `FRONTEND_PUBLIC_URL` to the matching deployed frontend origin
- keep `DATABASE_URL`, `JWT_SECRET_KEY`, `OIDC_*`, `STRIPE_*`, `SUPABASE_*` in backend secret storage only
- remove legacy keys after cutover: `ENVIRONMENT`, `PYTHON_BACKEND_URL`, `PYTHON_FRONTEND_URL`, and any remaining backend-side `VITE_*`

Vercel frontend migration:

- set `VITE_PUBLIC_APP_ENV=preview` for preview deployments, `VITE_PUBLIC_APP_ENV=staging` for the shared staging frontend, and `VITE_PUBLIC_APP_ENV=production` for production
- set `VITE_API_BASE_URL` to the public backend base URL for that environment
- set `VITE_PUBLIC_SITE_URL` to the deployed frontend origin
- keep only browser-safe keys in Vercel: `VITE_TURNSTILE_SITE_KEY`, `VITE_PUBLIC_SUPABASE_URL`, `VITE_PUBLIC_SUPABASE_ANON_KEY`
- remove legacy frontend keys after cutover: `VITE_API_URL` and any non-public secret values accidentally stored in Vercel

Local checked-in `.env` files in this repository now use canonical names only.

## Manual Expiration Execution

For deterministic expiration testing without cron, run the backend command below from `app/backend`:

```bash
python -m tools.run_expirations --as-of 2026-03-26T09:00:00+00:00
```

The command uses the same expiration service as the admin API, logs affected listings and subscriptions, and prints a JSON summary with the impacted IDs.
*** Add File: d:\Personal for DELETE\web proj\Ukrainians in Spain Platform_v7\app\backend\tools\__init__.py
"""Backend operational commands."""
