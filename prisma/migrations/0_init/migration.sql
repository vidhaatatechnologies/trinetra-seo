-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "schemaProduct" BOOLEAN NOT NULL DEFAULT true,
    "schemaOrganization" BOOLEAN NOT NULL DEFAULT true,
    "schemaBreadcrumb" BOOLEAN NOT NULL DEFAULT true,
    "schemaArticle" BOOLEAN NOT NULL DEFAULT true,
    "schemaFaq" BOOLEAN NOT NULL DEFAULT false,
    "orgName" TEXT,
    "orgLogo" TEXT,
    "orgTwitter" TEXT,
    "titleTemplate" TEXT NOT NULL DEFAULT '{{ product.title }} | {{ shop.name }}',
    "descTemplate" TEXT NOT NULL DEFAULT '{{ product.description | truncate: 160 }}',
    "altTemplate" TEXT NOT NULL DEFAULT '{{ product.title }} - {{ shop.name }}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "shopifyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoSettings_shop_key" ON "SeoSettings"("shop");

-- CreateIndex
CREATE INDEX "Redirect_shop_idx" ON "Redirect"("shop");
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.3 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

