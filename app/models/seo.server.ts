import db from "../db.server";

export type SeoSettingsRecord = Awaited<ReturnType<typeof getSeoSettings>>;

/**
 * Fetch the SEO settings for a shop, creating a default row on first access.
 */
export async function getSeoSettings(shop: string) {
  const existing = await db.seoSettings.findUnique({ where: { shop } });
  if (existing) return existing;
  return db.seoSettings.create({ data: { shop } });
}

export async function updateSeoSettings(
  shop: string,
  data: Partial<{
    schemaProduct: boolean;
    schemaOrganization: boolean;
    schemaBreadcrumb: boolean;
    schemaArticle: boolean;
    schemaFaq: boolean;
    orgName: string | null;
    orgLogo: string | null;
    orgTwitter: string | null;
    titleTemplate: string;
    descTemplate: string;
    altTemplate: string;
  }>,
) {
  return db.seoSettings.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
}

/* --------------------------- Template rendering --------------------------- */

export interface TemplateContext {
  product?: { title?: string; description?: string; type?: string; vendor?: string };
  shop?: { name?: string };
}

/**
 * Tiny Liquid-ish renderer supporting `{{ a.b }}` and a `truncate: N` filter.
 * Deliberately minimal — enough for SEO meta/alt templates, no eval.
 */
export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr: string) => {
      const [pathPart, ...filters] = expr.split("|").map((s) => s.trim());
      let value = resolvePath(pathPart, ctx) ?? "";
      for (const f of filters) {
        const truncate = f.match(/^truncate:\s*(\d+)$/);
        if (truncate) {
          const n = parseInt(truncate[1], 10);
          if (value.length > n) value = value.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
        }
        if (f === "strip_html") value = value.replace(/<[^>]+>/g, "");
      }
      return value;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePath(path: string, ctx: TemplateContext): string | undefined {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur == null ? undefined : String(cur);
}

/* ----------------------------- SEO scoring ----------------------------- */

export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  hint: string;
}

export interface ProductSeoInput {
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  descriptionHtml?: string | null;
  handle: string;
  featuredImageAlt?: string | null;
  imagesCount: number;
  imagesWithAltCount: number;
}

/**
 * Score a single product's on-page SEO out of 100.
 * Mirrors the spirit of the CPW SEO Booster real-time score, adapted to the
 * fields Shopify actually exposes for products.
 */
export function scoreProduct(p: ProductSeoInput): {
  score: number;
  checks: SeoCheck[];
} {
  const titleLen = (p.seoTitle || p.title || "").length;
  const descLen = (p.seoDescription || "").length;
  const bodyText = (p.descriptionHtml || "").replace(/<[^>]+>/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  const checks: SeoCheck[] = [
    {
      id: "seo-title",
      label: "SEO title is set",
      passed: !!p.seoTitle && p.seoTitle.trim().length > 0,
      weight: 15,
      hint: "Add a custom search-engine title under 60 characters.",
    },
    {
      id: "title-length",
      label: "Title length 30–60 chars",
      passed: titleLen >= 30 && titleLen <= 60,
      weight: 10,
      hint: `Current title length is ${titleLen}. Aim for 30–60 characters.`,
    },
    {
      id: "meta-desc",
      label: "Meta description is set",
      passed: descLen > 0,
      weight: 15,
      hint: "Add a meta description so search engines show a compelling snippet.",
    },
    {
      id: "desc-length",
      label: "Meta description 120–160 chars",
      passed: descLen >= 120 && descLen <= 160,
      weight: 10,
      hint: `Current description length is ${descLen}. Aim for 120–160 characters.`,
    },
    {
      id: "body-content",
      label: "Product description ≥ 100 words",
      passed: wordCount >= 100,
      weight: 15,
      hint: `Description has ${wordCount} words. Thin content ranks poorly; aim for 100+.`,
    },
    {
      id: "handle",
      label: "Clean URL handle (no numbers/IDs)",
      passed: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.handle) && !/^\d+$/.test(p.handle),
      weight: 10,
      hint: "Use a readable, keyword-rich URL handle.",
    },
    {
      id: "images",
      label: "Has at least one image",
      passed: p.imagesCount > 0,
      weight: 10,
      hint: "Add product images — they drive image-search traffic.",
    },
    {
      id: "alt-text",
      label: "All images have alt text",
      passed: p.imagesCount > 0 && p.imagesWithAltCount === p.imagesCount,
      weight: 15,
      hint: `${p.imagesWithAltCount}/${p.imagesCount} images have alt text.`,
    },
  ];

  const earned = checks.reduce((s, c) => (c.passed ? s + c.weight : s), 0);
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / total) * 100);
  return { score, checks };
}

export { db };
