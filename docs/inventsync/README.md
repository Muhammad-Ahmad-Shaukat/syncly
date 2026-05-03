# InventSync (Syncly monorepo)

Phased implementation lives across `syncly-frontend` (Expo / React Native) and `syncly-backend` (Express + Sequelize + MySQL).

## Environment variables

### Backend (`syncly-backend`)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Required. Signs mobile access JWTs and validates refresh session flows. |
| `PORT` | HTTP port (default `3000`). |
| `DB_SYNC_ALTER` | Set to `true` in dev to let Sequelize `alter` new InventSync columns/tables. |
| `LOW_STOCK_THRESHOLD` | Integer threshold for dashboard low-stock counts and push alerts (default `10`). |
| `STRIPE_SECRET_KEY` | Stripe API secret for Checkout / Portal. |
| `STRIPE_WEBHOOK_SECRET` | Verifies `POST /api/webhooks/stripe`. |
| `STRIPE_PRICE_BASIC` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_EXTREME` | Price IDs mapped to `tierType` (`basic`, `pro`, `extreme`). |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` / `STRIPE_PORTAL_RETURN_URL` | Redirect URLs for Checkout and Customer Portal. |
| `RESEND_API_KEY` / `RESEND_FROM` | Email marketing sends via Resend. |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | Alternative provider. |
| `GOOGLE_CLIENT_ID` | Optional. When set, Google `id_token` `aud` must match for `/api/mobile/auth/google`. |
| `EXPO_ACCESS_TOKEN` | Optional. Higher rate limits for Expo push HTTP API. |
| `EMAIL_WORKER_INTERVAL_MS` | Campaign send worker poll interval (default `5000`). |
| `SYNC_WORKER_INTERVAL_MS` | Existing sync job worker interval. |

### Mobile (`syncly-frontend`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend origin without trailing slash (e.g. `http://10.0.2.2:3000` for Android emulator). |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Enables “Continue with Google” on the login screen. |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Native Google token exchange (optional). |

## HTTP surface (summary)

- `POST /api/mobile/login`, `POST /api/mobile/refresh`, `POST /api/mobile/auth/google`, `POST /api/mobile/logout`
- `GET /api/mobile/me`, `PUT /api/mobile/me/push-token`
- `GET /api/mobile/stores`, `GET|POST /api/mobile/products`, `GET|PATCH /api/mobile/products/:id`, `POST /api/mobile/products/bulk`
- `GET /api/mobile/orders`, `POST /api/mobile/orders`
- `GET /api/mobile/dashboard/metrics`
- `GET /api/mobile/sync/runs`, `POST /api/mobile/sync/trigger`, `GET /api/mobile/sync/conflicts`, `POST /api/mobile/sync/conflicts/:id/resolve`
- Campaigns, templates, segments, inbox threads (under `/api/mobile/...`)
- `POST /api/billing/checkout-session`, `POST /api/billing/portal-session` (Bearer mobile access token)
- `POST /api/webhooks/stripe` (raw body — mounted before `express.json()` in `index.js`)

## Connector prerequisites

Store catalog truth remains in Shopify / WooCommerce. The mobile app calls the Node API only; connectors continue to use existing Woo plugin and Shopify Laravel flows described in the main repo.

## Dev notes

1. Create a user via existing `POST /api/users/users` (or seed) before signing in on mobile.
2. Set `DB_SYNC_ALTER=true` once when adding new tables (`mobile_sessions`, `sync_conflicts`, email + inbox tables, user columns).
3. Register the Stripe webhook endpoint for your deployed API URL and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
