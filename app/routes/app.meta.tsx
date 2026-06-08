import { useState, useCallback, useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  Modal,
  TextField,
  BlockStack,
  InlineStack,
  Banner,
  Box,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSeoSettings, renderTemplate } from "../models/seo.server";

interface ProductRow {
  id: string;
  title: string;
  handle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getSeoSettings(session.shop);

  const response = await admin.graphql(
    `#graphql
      query MetaProducts {
        shop { name }
        products(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            handle
            description
            productType
            vendor
            seo { title description }
          }
        }
      }`,
  );
  const json = await response.json();
  const shopName = json.data?.shop?.name ?? "";
  const products: ProductRow[] = (json.data?.products?.nodes ?? []).map(
    (n: any) => ({
      id: n.id,
      title: n.title,
      handle: n.handle,
      description: n.description ?? "",
      seoTitle: n.seo?.title ?? "",
      seoDescription: n.seo?.description ?? "",
    }),
  );

  return {
    products,
    shopName,
    titleTemplate: settings.titleTemplate,
    descTemplate: settings.descTemplate,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "save") {
    const id = String(form.get("id"));
    const seoTitle = String(form.get("seoTitle") ?? "");
    const seoDescription = String(form.get("seoDescription") ?? "");
    const result = await updateProductSeo(admin, id, seoTitle, seoDescription);
    return { ok: result.ok, errors: result.errors, updated: result.ok ? 1 : 0 };
  }

  if (intent === "bulk") {
    // Apply templates to selected products that are missing meta.
    const ids = JSON.parse(String(form.get("ids") ?? "[]")) as string[];
    const onlyMissing = form.get("onlyMissing") === "true";
    const settingsTitle = String(form.get("titleTemplate") ?? "");
    const settingsDesc = String(form.get("descTemplate") ?? "");

    // Re-fetch the selected products' data for rendering.
    const map = await fetchProductsForRender(admin, ids);
    let updated = 0;
    const errors: string[] = [];
    for (const p of map) {
      const needTitle = !onlyMissing || !p.seoTitle;
      const needDesc = !onlyMissing || !p.seoDescription;
      const ctx = {
        product: {
          title: p.title,
          description: p.description,
          type: p.productType,
          vendor: p.vendor,
        },
        shop: { name: p.shopName },
      };
      const newTitle = needTitle
        ? renderTemplate(settingsTitle, ctx)
        : p.seoTitle;
      const newDesc = needDesc ? renderTemplate(settingsDesc, ctx) : p.seoDescription;
      const res = await updateProductSeo(admin, p.id, newTitle, newDesc);
      if (res.ok) updated++;
      else errors.push(`${p.title}: ${res.errors.join(", ")}`);
    }
    return { ok: errors.length === 0, errors, updated };
  }

  return { ok: false, errors: ["Unknown action"], updated: 0 };
};

async function updateProductSeo(
  admin: any,
  id: string,
  seoTitle: string,
  seoDescription: string,
) {
  const response = await admin.graphql(
    `#graphql
      mutation UpdateProductSeo($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        product: { id, seo: { title: seoTitle, description: seoDescription } },
      },
    },
  );
  const json = await response.json();
  const userErrors = json.data?.productUpdate?.userErrors ?? [];
  return {
    ok: userErrors.length === 0,
    errors: userErrors.map((e: any) => e.message),
  };
}

async function fetchProductsForRender(admin: any, ids: string[]) {
  if (ids.length === 0) return [];
  const response = await admin.graphql(
    `#graphql
      query RenderProducts($ids: [ID!]!) {
        shop { name }
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            description
            productType
            vendor
            seo { title description }
          }
        }
      }`,
    { variables: { ids } },
  );
  const json = await response.json();
  const shopName = json.data?.shop?.name ?? "";
  return (json.data?.nodes ?? [])
    .filter(Boolean)
    .map((n: any) => ({
      id: n.id,
      title: n.title,
      description: n.description ?? "",
      productType: n.productType ?? "",
      vendor: n.vendor ?? "",
      seoTitle: n.seo?.title ?? "",
      seoDescription: n.seo?.description ?? "",
      shopName,
    }));
}

function lenTone(len: number, min: number, max: number) {
  if (len === 0) return "critical" as const;
  if (len < min || len > max) return "attention" as const;
  return "success" as const;
}

export default function MetaEditor() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  const resourceIDResolver = (p: ProductRow) => p.id;
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products as unknown as { [key: string]: unknown }[], {
      resourceIDResolver: resourceIDResolver as any,
    });

  const openEdit = useCallback((p: ProductRow) => {
    setEditing(p);
    setDraftTitle(p.seoTitle);
    setDraftDesc(p.seoDescription);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editing) return;
    fetcher.submit(
      {
        intent: "save",
        id: editing.id,
        seoTitle: draftTitle,
        seoDescription: draftDesc,
      },
      { method: "POST" },
    );
    setEditing(null);
    shopify.toast.show("Saving SEO meta…");
  }, [editing, draftTitle, draftDesc, fetcher, shopify]);

  const bulkApply = useCallback(
    (onlyMissing: boolean) => {
      const ids = selectedResources.length
        ? selectedResources
        : products.map((p) => p.id);
      fetcher.submit(
        {
          intent: "bulk",
          ids: JSON.stringify(ids),
          onlyMissing: String(onlyMissing),
        },
        { method: "POST" },
      );
      shopify.toast.show(`Applying templates to ${ids.length} products…`);
    },
    [selectedResources, products, fetcher, shopify],
  );

  const busy = fetcher.state !== "idle";
  const result = fetcher.data;

  const rows = useMemo(
    () =>
      products.map((p, index) => {
        const tLen = p.seoTitle.length;
        const dLen = p.seoDescription.length;
        return (
          <IndexTable.Row
            id={p.id}
            key={p.id}
            position={index}
            selected={selectedResources.includes(p.id)}
          >
            <IndexTable.Cell>
              <Text as="span" fontWeight="semibold">
                {p.title}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {p.seoTitle ? (
                <Badge tone={lenTone(tLen, 30, 60)}>{`${tLen} chars`}</Badge>
              ) : (
                <Badge tone="critical">Missing</Badge>
              )}
            </IndexTable.Cell>
            <IndexTable.Cell>
              {p.seoDescription ? (
                <Badge tone={lenTone(dLen, 120, 160)}>{`${dLen} chars`}</Badge>
              ) : (
                <Badge tone="critical">Missing</Badge>
              )}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Button size="slim" onClick={() => openEdit(p)}>
                Edit
              </Button>
            </IndexTable.Cell>
          </IndexTable.Row>
        );
      }),
    [products, selectedResources, openEdit],
  );

  return (
    <Page>
      <TitleBar title="Meta editor" />
      <BlockStack gap="400">
        {result && result.updated > 0 && (
          <Banner tone="success" title={`Updated ${result.updated} product(s).`} />
        )}
        {result && result.errors.length > 0 && (
          <Banner tone="critical" title="Some updates failed">
            <ul>
              {result.errors.slice(0, 5).map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Products ({products.length})
              </Text>
              <InlineStack gap="200">
                <Button
                  onClick={() => bulkApply(true)}
                  loading={busy}
                  disabled={busy}
                >
                  Fill missing from template
                </Button>
                <Button
                  variant="primary"
                  onClick={() => bulkApply(false)}
                  loading={busy}
                  disabled={busy}
                >
                  Apply template to{" "}
                  {selectedResources.length ? "selected" : "all"}
                </Button>
              </InlineStack>
            </InlineStack>

            <IndexTable
              resourceName={{ singular: "product", plural: "products" }}
              itemCount={products.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Product" },
                { title: "SEO title" },
                { title: "Meta description" },
                { title: "" },
              ]}
            >
              {rows}
            </IndexTable>
          </BlockStack>
        </Card>
      </BlockStack>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={`Edit SEO: ${editing.title}`}
          primaryAction={{ content: "Save", onAction: saveEdit }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setEditing(null) },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="SEO title"
                value={draftTitle}
                onChange={setDraftTitle}
                autoComplete="off"
                helpText={`${draftTitle.length} characters (ideal 30–60)`}
                maxLength={70}
                showCharacterCount
              />
              <TextField
                label="Meta description"
                value={draftDesc}
                onChange={setDraftDesc}
                multiline={3}
                autoComplete="off"
                helpText={`${draftDesc.length} characters (ideal 120–160)`}
                maxLength={320}
                showCharacterCount
              />
              <Box
                padding="300"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Google preview
                  </Text>
                  <Text as="span" variant="bodyMd" tone="magic">
                    {draftTitle || editing.title}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {draftDesc || "No meta description set."}
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
