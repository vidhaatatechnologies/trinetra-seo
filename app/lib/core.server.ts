/**
 * Trinetra Core client — the Shopify app calls the same shared SEO brain
 * the WordPress plugin uses, so scoring / GEO / schema are identical.
 *
 * Config via env:
 *   TRINETRA_CORE_URL   e.g. https://trinetra-core.onrender.com
 *   TRINETRA_API_KEY    sent as x-trinetra-key (the shared license key)
 */
const BASE = (process.env.TRINETRA_CORE_URL || "").replace(/\/$/, "");
const KEY = process.env.TRINETRA_API_KEY || "";

export const coreConfigured = (): boolean => Boolean(BASE);

async function post(path: string, body: unknown): Promise<any> {
  if (!BASE) throw new Error("TRINETRA_CORE_URL is not configured.");
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(KEY ? { "x-trinetra-key": KEY } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Trinetra Core ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

export const analyzeHtml = (html: string, url?: string) => post("/v1/analyze", { html, url });
export const analyzeUrl = (url: string) => post("/v1/analyze", { url });
export const geoHtml = (html: string, url?: string) => post("/v1/geo", { html, url });
export const geoUrl = (url: string) => post("/v1/geo", { url });
export const generateSchema = (type: string, data: unknown) => post("/v1/schema", { type, data });

/** Build a minimal HTML document from product fields for analysis. */
export function productToHtml(p: {
  title?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  descriptionHtml?: string | null;
}): string {
  const title = p.seoTitle || p.title || "";
  const desc = p.seoDescription || "";
  return (
    "<!doctype html><html><head>" +
    `<title>${escapeHtml(title)}</title>` +
    (desc ? `<meta name="description" content="${escapeHtml(desc)}">` : "") +
    "</head><body>" +
    (p.title ? `<h1>${escapeHtml(p.title)}</h1>` : "") +
    (p.descriptionHtml || "") +
    "</body></html>"
  );
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] as string));
}
