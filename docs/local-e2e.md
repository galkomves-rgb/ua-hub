# Local E2E Setup

Use this setup to test the product in a browser before buying domain or hosting.

## Temporary local QA note

The local auth shortcut added for browser E2E is temporary.

Before release, verify and remove or disable anything that only exists for local QA:

- [ ] `DEV_AUTH_ENABLED` is disabled outside local development
- [ ] test admin identity is not used in shared or production environments
- [ ] temporary local moderation page is either removed or replaced by a full admin center

## Backend env

Set these variables for local testing:

```env
APP_ENV=local
DEV_AUTH_ENABLED=true
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/uahub_local
JWT_SECRET_KEY=change-me-for-local
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
BACKEND_PUBLIC_URL=http://127.0.0.1:8000
FRONTEND_PUBLIC_URL=http://localhost:3000
ADMIN_USER_ID=dev-admin
ADMIN_USER_EMAIL=admin@local.test
MGX_LOAD_MOCK_DATA=true

# Optional for billing tests
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

If you do not want external auth locally, do not configure OIDC variables.

Ready-to-copy template: `app/backend/.env.local.example`

## Frontend env

```env
VITE_PUBLIC_APP_ENV=local
VITE_API_BASE_URL=http://localhost:8000
VITE_PUBLIC_SITE_URL=http://localhost:3000
```

Do not set `VITE_TURNSTILE_SITE_KEY` unless you also configure Turnstile on the backend.

Ready-to-copy template: `app/frontend/.env.local.example`

Legacy note: `ENVIRONMENT=dev` and `PYTHON_FRONTEND_URL` are still accepted as fallbacks in a few runtime paths, but new local and deployed setups should use the canonical variables above.

## Start sequence

1. Start PostgreSQL.
2. Run Alembic migrations.
3. Start backend on port 8000.
4. Start frontend on port 3000.
5. Open `/auth` and use the local development login buttons.

## What this unlocks

- User login and logout in browser
- Admin login and protected admin API access
- Onboarding
- Account center flows
- Listing creation and submission
- Messaging
- Saved items and dashboard checks

## Still blocked after this setup

- Real OIDC provider login
- Stripe payment confirmation without Stripe test account and webhook
- Listing moderation workflow without admin moderation endpoints/UI
- Email notifications without mail service integration
