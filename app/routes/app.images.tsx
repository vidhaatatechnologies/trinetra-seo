import { useCallback, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Banner,
  TextField,
  Box,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getSeoSettings,
  updateSeoSettings,
  renderTemplate,
} from "../models/seo.server";

interface ImageRow {
  id: string; // product id
  title: string;
  vendor: string;
  productType: string;
  imagesCount: number;
  missingCount: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getSeoSettings(session.shop);

  const response = await admin.graphql(
    `#graphql
      query AltProducts {
        products(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            vendor
            productType
            media(first: 50) {
              nodes {
                ... on MediaImage { id alt }
              }
            }
          }
        }
      }`,
  );
  const json = await response.json();
  const products: ImageRow[] = (json.data?.products?.nodes ?? []).map((n: any) => {
    const media = (n.media?.nodes ?? []).filter((m: any) => m && m.id);
    const missing = media.filter(
      (m: any) => !m.alt || m.alt.trim().length === 0,
    ).length;
    return {
      id: n.id,
      title: n.title,
      vendor: n.vendor ?? "",
      productType: n.productType ?? "",
      imagesCount: media.length,
      missingCount: missing,
    };
  });

  return { products, altTemplate: settings.altTemplate };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "saveTemplate") {
    await updateSeoSettings(session.shop, {
      altTemplate: String(form.get("altTemplate") ?? ""),
    });
    return { ok: true, errors: [], updated: 0, message: "Template saved." };
  }

  // intent === "fill"
  const ids = JSON.parse(String(form.get("ids") ?? "[]")) as string[];
  const altTemplate = String(form.get("altTemplate") ?? "");

  const shopRes = await admin.graphql(`#graphql { shop { name } }`);
  const shopName = (await shopRes.json()).data?.shop?.name ?? "";

  let updated = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const res = await admin.graphql(
      `#graphql
        query ProdMedia($id: ID!) {
          product(id: $id) {
            title vendor productType
            media(first: 50) { nodes { ... on MediaImage { id alt } } }
          }
        }`,
      { variables: { id } },
    );
    const p = (await res.json()).data?.product;
    if (!p) continue;

    const ctx = {
      product: { title: p.title, type: p.productType, vendor: p.vendor },
      shop: { name: shopName },
    };
    const altValue = renderTemplate(altTemplate, ctx);

    const toFix = (p.media?.nodes ?? []).filter(
      (m: any) => m && m.id && (!m.alt || m.alt.trim().length === 0),
    );
    if (toFix.length === 0) continue;

    const files = toFix.map((m: any) => ({ id: m.id, alt: altValue }));
    const upd = await admin.graphql(
      `#graphql
        mutation FixAlt($files: [FileUpdateInput!]!) {
          fileUpdate(files: $files) {
            files { id }
            userErrors { field message }
          }
        }`,
      { variables: { files } },
    );
    const updJson = await upd.json();
    const ue = updJson.data?.fileUpdate?.userErrors ?? [];
    if (ue.length) errors.push(`${p.title}: ${ue.map((e: any) => e.message).join(", ")}`);
    else updated += toFix.length;
  }

  return {
    ok: errors.length === 0,
    errors,
    updated,
    message: `Updated alt text on ${updated} image(s).`,
  };
};

export default function ImageAltOptimizer() {
  const { products, altTemplate } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const templateFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const withMissing = useMemo(
    () => products.filter((p) => p.missingCount > 0),
    [products],
  );
  const totalMissing = withMissing.reduce((s, p) => s + p.missingCount, 0);

  const [tpl, setTpl] = useState(altTemplate);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products as unknown as { [key: string]: unknown }[]);

  const fill = useCallback(
    (scopeMissingOnly: boolean) => {
      const ids = selectedResources.length
        ? selectedResources
        : scopeMissingOnly
          ? withMissing.map((p) => p.id)
          : products.map((p) => p.id);
      fetcher.submit(
        { intent: "fill", ids: JSON.stringify(ids), altTemplate: tpl },
        { method: "POST" },
      );
      shopify.toast.show(`Filling alt text on ${ids.length} products…`);
    },
    [selectedResources, withMissing, products, tpl, fetcher, shopify],
  );

  const busy = fetcher.state !== "idle";
  const result = fetcher.data;

  const rows = products.map((p, index) => (
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
      <IndexTable.Cell>{String(p.imagesCount)}</IndexTable.Cell>
      <IndexTable.Cell>
        {p.imagesCount === 0 ? (
          <Badge>No images</Badge>
        ) : p.missingCount === 0 ? (
          <Badge tone="success">All set</Badge>
        ) : (
          <Badge tone="critical">{`${p.missingCount} missing`}</Badge>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title="Image alt text" />
      <BlockStack gap="400">
        {result?.message && result.updated > 0 && (
          <Banner tone="success" title={result.message} />
        )}
        {result && result.errors.length > 0 && (
          <Banner tone="critical" title="Some updates failed">
            <ul>
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Alt-text template
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Variables: {"{{ product.title }}"}, {"{{ product.vendor }}"},{" "}
              {"{{ product.type }}"}, {"{{ shop.name }}"}
            </Text>
            <InlineStack gap="200" blockAlign="end">
              <Box width="100%">
                <TextField
                  label="Template"
                  labelHidden
                  autoComplete="off"
                  value={tpl}
                  onChange={setTpl}
                />
              </Box>
              <Button
                loading={templateFetcher.state !== "idle"}
                onClick={() =>
                  templateFetcher.submit(
                    { intent: "saveTemplate", altTemplate: tpl },
                    { method: "POST" },
                  )
                }
              >
                Save template
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text as="h2" variant="headingMd">
                  Products ({products.length})
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {totalMissing} image(s) missing alt text across{" "}
                  {withMissing.length} product(s).
                </Text>
              </BlockStack>
              <InlineStack gap="200">
                <Button
                  variant="primary"
                  onClick={() => fill(true)}
                  loading={busy}
                  disabled={busy || (totalMissing === 0 && !selectedResources.length)}
                >
                  {selectedResources.length
                    ? "Fill selected"
                    : "Fill all missing"}
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
                { title: "Images" },
                { title: "Alt status" },
              ]}
            >
              {rows}
            </IndexTable>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
