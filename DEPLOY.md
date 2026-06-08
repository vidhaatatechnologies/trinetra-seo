# Deploying Trinetra SEO to Render + Neon

This hosts the app on a permanent URL so it works for real merchants (and is
required before Shopify App Store submission).

## Overview

- **Neon** — free serverless Postgres (the app's database)
- **Render** — free web service that runs the Remix app 24/7
- **GitHub** — Render deploys from your repo

Predicted app URL: `https://trinetra-seo.onrender.com`

---

## Step 1 — Neon database

1. Sign up: https://neon.tech (free, GitHub login works)
2. Create a project named `trinetra-seo`.
3. Copy the **pooled** connection string (looks like
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`).
4. Send it over — it becomes `DATABASE_URL`. The initial migration is then run
   against it to create the tables.

## Step 2 — Push to GitHub

```bash
git remote add origin https://github.com/<you>/trinetra-seo.git
git push -u origin main
```

## Step 3 — Render web service

1. Sign up: https://render.com (GitHub login)
2. **New → Blueprint**, pick the `trinetra-seo` repo (uses `render.yaml`),
   or **New → Web Service** with:
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && npm run start`
3. Set environment variables:
   | Key | Value |
   |-----|-------|
   | `SHOPIFY_API_KEY` | `0d23254d6f2c819d19e05d61d849d966` (client ID) |
   | `SHOPIFY_API_SECRET` | from Dev Dashboard → app → API credentials |
   | `SHOPIFY_APP_URL` | `https://trinetra-seo.onrender.com` |
   | `SCOPES` | (already in render.yaml) |
   | `DATABASE_URL` | the Neon pooled string |
4. Deploy. Wait for "Live".

## Step 4 — Point Shopify at the hosted URL

In `shopify.app.toml` set `application_url` and the `auth.redirect_urls` to the
Render URL, then:

```bash
npm run deploy
```

## Step 5 — Install & test

Open the dev store admin → Apps → Trinetra SEO. It now loads from Render (no
local terminal needed). Test all five features against the sample products.

> Note: Render free instances sleep after ~15 min idle; first request then
> takes ~50s to wake. Fine for testing; upgrade to a paid instance ($7/mo)
> before public launch for instant loads.
