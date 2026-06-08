# Athletic Labs Production Runbook

This project is deployed as a low-cost, migration-safe production MVP:

- Frontend: Vercel, `https://panel.athleticlabs.com.tr`
- Backend: Render Web Service, `https://api.athleticlabs.com.tr`
- Database: Render PostgreSQL `basic-256mb`, provisioned from `render.yaml`
- Future migration path: move PostgreSQL to AWS RDS, keep the same API and frontend env contract.

## Deployment Rules

1. Never run `npm run sync-db` against production. It uses `sequelize.sync({ force: true })` and is blocked when `NODE_ENV=production`.
2. Every database structure change must be a new file under `src/migrations`.
3. Production runs `npm run db:migrate` as Render's pre-deploy command, so deploy fails fast if schema migration fails.
4. Frontend must use `NEXT_PUBLIC_API_BASE_URL=https://api.athleticlabs.com.tr/api`.
5. Backend must use `CORS_ORIGIN=https://panel.athleticlabs.com.tr`.

## Render Backend Setup

Create a new Render Blueprint from this backend repository. Render reads `render.yaml` and creates:

- `athletic-labs-api`
- `athletic-labs-db`

Fill the secret values Render prompts for:

- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `YOUJIU_APP_ID`
- `YOUJIU_APP_SECRET`
- `YOUJIU_PUSH_INGEST_TOKEN`
- `YOUJIU_PUSH_SECRET_KEY`

After deploy, verify:

```bash
curl https://api.athleticlabs.com.tr/health
```

Expected: HTTP 200 with `status: "OK"`.

## Frontend Setup

Use Vercel for the frontend. Required environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.athleticlabs.com.tr/api
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=athletic-labs-97470.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=athletic-labs-97470
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=athletic-labs-97470.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Connect `panel.athleticlabs.com.tr` to Vercel.

## Release Flow

Use two tracks:

- `main`: production
- feature branches: development work

Before merging to `main`:

```bash
npm run build
npm run db:migrate:status
```

If a migration exists, test it on staging or a database snapshot before production.

## Field Test Checklist

Run this before each field test:

1. Open `https://panel.athleticlabs.com.tr` on one laptop, one iPad/tablet, and two phones.
2. Login with a real Firebase user.
3. Create a test session.
4. Import at least 5 athletes.
5. Enter measurements from two devices at the same time.
6. Mark one athlete `absent` and one `skipped`.
7. Import one X-One QR if available.
8. Generate a report.
9. Refresh all devices and confirm data persists.
10. Switch one device to cellular/hotspot and repeat a measurement save.

## Next Schema Step

Current measurements are fixed columns. That is stable for the first field test.

For changing performance parameters per test, add this next:

- `metric_definitions`: configurable metrics, units, ranges, direction, required flag
- `test_session_metric_definitions`: which metrics are active for a session
- `athlete_metric_values`: flexible values per athlete test

Keep the current `measurements` table during transition and migrate gradually.
