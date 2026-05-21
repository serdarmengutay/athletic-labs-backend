# Athletic Labs Deployment + Youjiu Setup

## Youjiu Panel

Use the service provider panel to configure the API and push integration.

- Device type: select the real device family used in the field, for example `XONE PRO` or `XONE+`.
- Interface version: select `V3 File`.
- AppID: copy this into `YOUJIU_APP_ID`.
- AppSecret: click `Regenerate`, copy it immediately, and save it as `YOUJIU_APP_SECRET`.
- Secret Key: use a long random value and save the same value as `YOUJIU_PUSH_SECRET_KEY`.
- Push address: set this after the backend is live:

```txt
https://api.athleticlabs.com/api/youjiu/push/report?token=<YOUJIU_PUSH_INGEST_TOKEN>
```

`localhost` cannot be used as a push address because Youjiu's servers cannot reach a local computer.

## Backend Environment

Set these variables in the backend deployment provider:

```env
NODE_ENV=production
PORT=5017
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/athletic_labs
CORS_ORIGIN=https://panel.athleticlabs.com

FIREBASE_PROJECT_ID=athletic-labs-97470
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

YOUJIU_APP_ID=...
YOUJIU_APP_SECRET=...
YOUJIU_API_BASE_URL=https://open.youjiuhealth.com/mch/v3
YOUJIU_ACCEPT_LANGUAGE=tr
YOUJIU_ACCEPT_MEDIA_TYPE=application/vnd.XoneAPI.v3+json
YOUJIU_DEFAULT_AGENT_ID=3
YOUJIU_DEBUG=false
YOUJIU_PUSH_INGEST_TOKEN=...
YOUJIU_PUSH_SECRET_KEY=...
```

Build and start commands:

```bash
npm install
npm run build
npm start
```

First production deploy schema command:

```bash
npm run sync-schema
```

Run this once after connecting the production database, and again only when schema changes are intentionally introduced. Do not use `npm run sync-db` in production because it recreates tables with sample data.

Health check:

```txt
GET /health
```

## Frontend Environment

Set these variables in the frontend deployment provider:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.athleticlabs.com/api
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=athletic-labs-97470.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=athletic-labs-97470
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=athletic-labs-97470.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Build and start commands:

```bash
npm install
npm run build
npm start
```

## Recommended Hosting Layout

- Frontend: Vercel or equivalent Next.js hosting.
- Backend: Render, Railway, Fly.io, or any Node.js host with a public HTTPS URL.
- Database: managed PostgreSQL.
- Domain:
  - `panel.athleticlabs.com` -> frontend
  - `api.athleticlabs.com` -> backend

## Smoke Test Order

1. Open `https://api.athleticlabs.com/health`.
2. Log in to the frontend.
3. Create a test session and add one athlete.
4. Scan a Youjiu QR from the test data entry screen.
5. In the Youjiu panel, set the push address and run one measurement.
6. Check backend logs for `Youjiu push received`.
7. Confirm that the QR import can fetch `/session`, `/reports`, and `/reports/{measurementId}` without auth errors.

## Notes

The push endpoint stores raw payloads first. After the first real push arrives, inspect the payload shape and then map the exact report fields into athlete measurements.
