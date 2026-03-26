# Backend API Deployment

## Recommended service

This document describes the current non-serverless FastAPI deployment shape. For the current shared staging cycle, keep these boundaries explicit:

- frontend on Vercel
- backend on Railway
- Supabase can back `DATABASE_URL` and other data services where adopted later, but the current auth flow remains backend-owned OIDC until a separate migration is done

Use a dedicated backend host, not Vercel Functions, for the current FastAPI app.

Recommended baseline:
- Railway service for `app/backend`
- managed PostgreSQL for `DATABASE_URL` such as Supabase Postgres
- Vercel only for `app/frontend`

This matches the current repository architecture:
- frontend is already deployed as SPA on Vercel
- backend is a long-running FastAPI service with DB initialization, auth callbacks, and async SQLAlchemy

## Railway setup

1. In Railway, deploy `app/backend` using the repository Dockerfile in that folder.
2. Confirm the build log shows Docker-based detection rather than Railpack.
3. After the first deploy, open the `ua-hub-api` service `Variables`.
4. Set these required environment variables:

### Core
- `APP_ENV=staging` for the shared staging stack or `APP_ENV=production` for live
- `BACKEND_PUBLIC_URL=https://ua-hub-api-production.up.railway.app` for the current staging backend
- `FRONTEND_PUBLIC_URL=https://ua-hub.vercel.app` for the current staging frontend
- `DATABASE_URL=<your-managed-postgres-connection-string>`
- `JWT_SECRET_KEY=<generate-a-random-secret-and-store-it-only-in-Railway>`
- `JWT_ALGORITHM=HS256`
- `JWT_EXPIRE_MINUTES=1440`
- `ALLOWED_DOMAINS=ua-hub.vercel.app,ua-hub-api-production.up.railway.app`
- `DEV_AUTH_ENABLED=false`
- `MGX_LOAD_MOCK_DATA=false`

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
- `VITE_API_BASE_URL=https://ua-hub-api-production.up.railway.app` for the current staging backend
- `VITE_PUBLIC_SITE_URL=https://ua-hub.vercel.app` for the current staging frontend
- `VITE_TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>`

Then redeploy the frontend.

## Verification checklist

After deploy, these URLs must work:

- `GET https://ua-hub-api-production.up.railway.app/health`
- `GET https://ua-hub-api-production.up.railway.app/docs`
- `GET https://ua-hub-api-production.up.railway.app/api/v1/auth/capabilities`

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

- If Railway startup logs show `DATABASE_URL environment variable is required`, the service failed before FastAPI could answer `/health` or `/docs`.
- Railway does not read the gitignored `app/backend/.env.staging` file from the repository. Set runtime variables in Railway `Variables` manually.
- The frontend must point to the public backend URL through `VITE_API_BASE_URL`.
- Keep one auth system only for this phase: the current hosted OIDC provider plus backend app JWT. Do not start a parallel Supabase Auth rollout inside staging prep.
