# Trinetra SEO — Setup & Run Guide

A Shopify SEO app (Remix + Polaris + GraphQL Admin API). Built as the Shopify
counterpart to the CPW SEO Booster WordPress plugin.

## Features (v1)

- **Dashboard** — store-wide SEO health score, issue counts, quick actions.
- **Meta editor** — per-product SEO title & meta description editing with live
  Google preview, length checks, and bulk template apply.
- **Image alt text** — detect missing alt text and bulk-fill from a template.
- **Structured data** — JSON-LD (Product, Organization, WebSite, Breadcrumb,
  Article, FAQ) injected via a theme app extension (no extra API scopes).
- **Redirects** — create/delete 301 URL redirects synced with Shopify.

## Prerequisites

- Node.js 20.19+ or 22.12+ (you have v24 ✓)
- Shopify CLI 4.x (installed globally ✓)
- A **Shopify Partner account** + a **development store**

## One-time: create Partner account + dev store

1. Sign up (free): https://partners.shopify.com/signup
2. Verify email, log in.
3. Stores → **Add store** → **Create development store** →
   "Build a new app or theme for the Shopify App Store" → name it → Create.

## Run the app locally (dev + Cloudflare tunnel)

From this folder:

```bash
npm run dev
```

The first run will (interactively, in your browser):

1. Log you into Shopify Partners.
2. Create the app in your Partner org and write `client_id` into
   `shopify.app.toml`.
3. Ask which development store to use, then install the app on it.
4. Start a Cloudflare tunnel and set `application_url` automatically.
5. Print a URL — press `p` to open the app in the dev store admin.

> Keep this terminal running. Code changes hot-reload.

## Activate structured data on the storefront

In the dev store: **Online Store → Themes → Customize → App embeds →
Trinetra SEO – Structured Data → toggle on**. Then validate a product page
with Google's Rich Results Test.

## Access scopes used

`read_products, write_products, read_content, write_content,
read_online_store_navigation, write_online_store_navigation`

## Going live on the Shopify App Store (later)

1. `npm run deploy` to push app config + the theme extension version.
2. In the Partner dashboard, complete the **App listing** (name, icon,
   screenshots, description, pricing).
3. Add **billing** (Shopify Billing API) if charging — see App Store
   requirements.
4. Submit for review (typically 1–3 weeks). GDPR/compliance webhooks are
   already wired at `/webhooks/compliance`.

## Project layout

```
app/
  models/seo.server.ts        # settings, SEO scoring, template renderer
  routes/app._index.tsx       # Dashboard
  routes/app.meta.tsx         # Meta editor
  routes/app.images.tsx       # Image alt text
  routes/app.schema.tsx       # Structured data control panel
  routes/app.redirects.tsx    # Redirects
  routes/webhooks.compliance.tsx   # GDPR mandatory webhooks
extensions/
  trinetra-seo-schema/        # Theme app extension (JSON-LD)
prisma/schema.prisma          # Session + SeoSettings + Redirect models
```
