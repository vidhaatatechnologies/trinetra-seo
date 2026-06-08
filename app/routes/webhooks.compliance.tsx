import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Mandatory GDPR/CCPA compliance webhooks for public Shopify apps.
 *
 * Trinetra SEO only stores shop-level configuration (SEO settings, redirects)
 * and session data — it does NOT store any customer personal data. So for the
 * customer-facing topics we acknowledge the request without any data to return
 * or delete; for shop/redact we purge everything we hold for the shop.
 *
 * See: https://shopify.dev/docs/apps/build/privacy-law-compliance
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received compliance webhook ${topic} for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // We store no customer personal data — nothing to provide.
      break;

    case "CUSTOMERS_REDACT":
      // We store no customer personal data — nothing to erase.
      break;

    case "SHOP_REDACT": {
      // Purge all data we hold for this shop 48h after uninstall.
      const shopDomain = (payload as { shop_domain?: string })?.shop_domain || shop;
      await db.session.deleteMany({ where: { shop: shopDomain } });
      await db.seoSettings.deleteMany({ where: { shop: shopDomain } }).catch(() => {});
      await db.redirect.deleteMany({ where: { shop: shopDomain } }).catch(() => {});
      break;
    }

    default:
      console.log(`Unhandled compliance topic: ${topic}`);
  }

  return new Response();
};
