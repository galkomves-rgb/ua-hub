# Backend API Deployment

## Recommended service

This document describes the current non-serverless FastAPI deployment shape. For a real shared staging cycle, keep these boundaries explicit:

- frontend on Vercel
- backend on a dedicated host or container service
- Supabase can back `DATABASE_URL` and other data services where adopted later, but the current auth flow remains backend-owned OIDC until a separate migration is done

Use a dedicated backend host, not Vercel Functions, for the current FastAPI app.

Recommended baseline:
- dedicated backend host for `app/backend`
- managed PostgreSQL for `DATABASE_URL` such as Supabase Postgres
- Vercel only for `app/frontend`

This matches the current repository architecture:
- frontend is already deployed as SPA on Vercel
- backend is a long-running FastAPI service with DB initialization, auth callbacks, and async SQLAlchemy

## Included deployment file

The repository now contains [render.yaml](/Users/mikehalko/Documents/UAHUB/ua-hub/render.yaml).

That file is still useful as a reference for a long-running backend service, but it is not the source of truth for a Supabase plus Vercel staging setup and still contains legacy variable names.

It provisions:
- `ua-hub-api` web service
- `ua-hub-db` PostgreSQL database

## Render setup

1. In Render, create a new Blueprint from the GitHub repository.
2. Confirm `render.yaml` is detected.
3. Create the stack.
4. After first deploy, open the `ua-hub-api` service settings.
5. Set these required environment variables:

### Core
- `APP_ENV=staging` for a shared staging stack or `APP_ENV=production` for live
- `BACKEND_PUBLIC_URL=https://<your-backend-domain>`
- `FRONTEND_PUBLIC_URL=https://<your-vercel-frontend-domain>`
- `DATABASE_URL=<your-managed-postgres-connection-string>`

### Auth provider
- `OIDC_ISSUER_URL`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_EMAIL_CONNECTION`
- `OIDC_GOOGLE_CONNECTION` if Google login is enabled
- `OIDC_APPLE_CONNECTION` if Apple login is enabled
- `OIDC_PHONE_CONNECTION` if phone auth is enabled

### Human verification
- `TURNSTILE_SECRET_KEY`

### Optional admin bootstrap
- `ADMIN_USER_ID`
- `ADMIN_USER_EMAIL`

## Vercel setup

In the Vercel project, set:

- `VITE_PUBLIC_APP_ENV=staging` for shared staging or `production` for live
- `VITE_API_BASE_URL=https://<your-backend-domain>`
- `VITE_PUBLIC_SITE_URL=https://<your-vercel-frontend-domain>`
- `VITE_TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>`

Then redeploy the frontend.

## Verification checklist

After deploy, these URLs must work:

- `GET https://<your-render-backend-domain>/health`
- `GET https://<your-render-backend-domain>/docs`
- `GET https://<your-render-backend-domain>/api/v1/auth/capabilities`

Then verify frontend integration from Vercel:

- `/auth`
- `/account?tab=dashboard`
- `/account?tab=profile`
- `/account?tab=saved`
- `/account?tab=listings`
- `/account?tab=messages`
- `/account?tab=business`
- `/account?tab=settings`

## Important notes

- Mock data loading is disabled in the Render blueprint by default.
- The frontend must point to the public backend URL through `VITE_API_BASE_URL`.
- Keep one auth system only for this phase: the current hosted OIDC provider plus backend app JWT. Do not start a parallel Supabase Auth rollout inside staging prep.
*** Add File: d:\Personal for DELETE\web proj\Ukrainians in Spain Platform_v7\app\backend\.env.staging.example
APP_ENV=staging
DEBUG=false
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/uahub_staging
JWT_SECRET_KEY=replace-in-staging-secret-store
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
BACKEND_PUBLIC_URL=https://api-staging.example.com
FRONTEND_PUBLIC_URL=https://staging.example.com
ALLOWED_DOMAINS=staging.example.com,api-staging.example.com

# Auth / OIDC secrets
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=

# Billing secrets
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Supabase secret placeholders
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Staging safety defaults
DEV_AUTH_ENABLED=false
MGX_LOAD_MOCK_DATA=false
*** Add File: d:\Personal for DELETE\web proj\Ukrainians in Spain Platform_v7\app\frontend\.env.staging.example
VITE_PUBLIC_APP_ENV=staging
VITE_API_BASE_URL=https://api-staging.example.com
VITE_PUBLIC_SITE_URL=https://staging.example.com
VITE_TURNSTILE_SITE_KEY=

# Supabase public placeholders
VITE_PUBLIC_SUPABASE_URL=
VITE_PUBLIC_SUPABASE_ANON_KEY=
