import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Button,
  Badge,
  Box,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, PRO_PLAN } from "../shopify.server";
import { coreConfigured, geoHtml, productToHtml } from "../lib/core.server";

const isTest = process.env.NODE_ENV !== "production";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing } = await authenticate.admin(request);
  const res = await admin.graphql(
    `#graphql
      query GeoProducts {
        products(first: 50, sortKey: UPDATED_AT, reverse: true) {
          nodes { id title }
        }
      }`,
  );
  const json = await res.json();
  const products = json.data?.products?.nodes ?? [];
  let isPro = false;
  try {
    const check = await billing.check({ plans: [PRO_PLAN], isTest });
    isPro = check.hasActivePayment;
  } catch { /* billing not available — treat as free */ }
  return { products, configured: coreConfigured(), isPro };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  if (!coreConfigured()) {
    return { error: "Trinetra Core is not configured. Set TRINETRA_CORE_URL in the app environment." };
  }
  const form = await request.formData();
  const productId = String(form.get("productId") || "");
  if (!productId) return { error: "Pick a product to analyze." };

  const res = await admin.graphql(
    `#graphql
      query GeoProduct($id: ID!) {
        product(id: $id) {
          title
          descriptionHtml
          seo { title description }
        }
      }`,
    { variables: { id: productId } },
  );
  const json = await res.json();
  const p = json.data?.product;
  if (!p) return { error: "Product not found." };

  const html = productToHtml({
    title: p.title,
    seoTitle: p.seo?.title,
    seoDescription: p.seo?.description,
    descriptionHtml: p.descriptionHtml,
  });

  try {
    const geo = await geoHtml(html);
    return { geo, productTitle: p.title };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed." };
  }
};

function gradeTone(grade: string): "success" | "attention" | "warning" | "critical" {
  if (grade === "A" || grade === "B") return "success";
  if (grade === "C") return "attention";
  if (grade === "D") return "warning";
  return "critical";
}

export default function GeoPage() {
  const { products, configured, isPro } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const [productId, setProductId] = useState(products[0]?.id ?? "");

  const options = products.map((p: { id: string; title: string }) => ({ label: p.title, value: p.id }));
  const geo = actionData && "geo" in actionData ? actionData.geo : null;
  const error = actionData && "error" in actionData ? actionData.error : null;

  return (
    <Page>
      <TitleBar title="AI Citation (GEO)" />
      <Layout>
        <Layout.Section>
          {!isPro && (
            <Box paddingBlockEnd="400">
              <Banner
                tone="info"
                title="Free plan"
                action={{ content: "Upgrade to Pro", url: "/app/billing" }}
              >
                <p>You’re on the free plan. Upgrade to Pro for unlimited GEO scans and all premium SEO features.</p>
              </Banner>
            </Box>
          )}

          {!configured && (
            <Box paddingBlockEnd="400">
              <Banner tone="warning" title="Trinetra Core not connected">
                <p>Set <code>TRINETRA_CORE_URL</code> (and <code>TRINETRA_API_KEY</code>) in the app environment to enable GEO analysis via the shared engine.</p>
              </Banner>
            </Box>
          )}

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">AI-Citation Readiness</Text>
              <Text as="p" tone="subdued">
                Score how citable a product page is for ChatGPT, Perplexity & Google AI Overviews — powered by the same Trinetra Core engine used on WordPress.
              </Text>
              <Form method="post">
                <BlockStack gap="300">
                  <Select
                    label="Product"
                    options={options}
                    value={productId}
                    onChange={setProductId}
                    name="productId"
                    disabled={!products.length}
                  />
                  <InlineStack>
                    <Button submit variant="primary" loading={busy} disabled={!configured || !products.length}>
                      Analyze GEO
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>

          {error && (
            <Box paddingBlockStart="400">
              <Banner tone="critical" title="Could not analyze">{error}</Banner>
            </Box>
          )}

          {geo && (
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingMd">
                      {actionData && "productTitle" in actionData ? actionData.productTitle : "Result"}
                    </Text>
                    <Badge tone={gradeTone(geo.grade)} size="large">{`Grade ${geo.grade} · ${geo.score}/100`}</Badge>
                  </InlineStack>
                  <ProgressBar progress={geo.score} tone={geo.score >= 70 ? "success" : "primary"} />
                  <Text as="p" tone="subdued">{`${geo.passed} of ${geo.total} citation signals passing.`}</Text>
                  <BlockStack gap="200">
                    {geo.signals.map((s: any) => (
                      <Box key={s.id} padding="300" background={s.pass ? "bg-surface-success" : "bg-surface-warning"} borderRadius="200">
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center" wrap={false}>
                            <Badge tone={s.pass ? "success" : "warning"}>{s.pass ? "Pass" : "Improve"}</Badge>
                            <Text as="span" variant="bodyMd" fontWeight="semibold">{s.label}</Text>
                          </InlineStack>
                          {!s.pass && <Text as="span" tone="subdued" variant="bodySm">{s.tip}</Text>}
                        </BlockStack>
                      </Box>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
