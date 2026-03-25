# Backend API Deployment

## Recommended service

Use a dedicated backend host, not Vercel Functions, for the current FastAPI app.

Recommended baseline:
- Render Web Service for `app/backend`
- Render PostgreSQL for `DATABASE_URL`
- Vercel only for `app/frontend`

This matches the current repository architecture:
- frontend is already deployed as SPA on Vercel
- backend is a long-running FastAPI service with DB initialization, auth callbacks, and async SQLAlchemy

## Included deployment file

The repository now contains [render.yaml](/Users/mikehalko/Documents/UAHUB/ua-hub/render.yaml).

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
- `PYTHON_BACKEND_URL=https://<your-render-backend-domain>`
- `FRONTEND_URL=https://<your-vercel-frontend-domain>`

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

- `VITE_API_BASE_URL=https://<your-render-backend-domain>`
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
- Keep one auth system only: the current hosted OIDC provider. Do not add Supabase Auth in parallel.
