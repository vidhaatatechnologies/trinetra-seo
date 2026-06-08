import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Checkbox,
  TextField,
  Button,
  Banner,
  List,
  Box,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSeoSettings, updateSeoSettings } from "../models/seo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const s = await getSeoSettings(session.shop);
  return {
    settings: {
      schemaProduct: s.schemaProduct,
      schemaOrganization: s.schemaOrganization,
      schemaBreadcrumb: s.schemaBreadcrumb,
      schemaArticle: s.schemaArticle,
      schemaFaq: s.schemaFaq,
      orgName: s.orgName ?? "",
      orgLogo: s.orgLogo ?? "",
      orgTwitter: s.orgTwitter ?? "",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  await updateSeoSettings(session.shop, {
    schemaProduct: form.get("schemaProduct") === "true",
    schemaOrganization: form.get("schemaOrganization") === "true",
    schemaBreadcrumb: form.get("schemaBreadcrumb") === "true",
    schemaArticle: form.get("schemaArticle") === "true",
    schemaFaq: form.get("schemaFaq") === "true",
    orgName: String(form.get("orgName") ?? "") || null,
    orgTwitter: String(form.get("orgTwitter") ?? "") || null,
  });
  return { ok: true };
};

export default function SchemaSettings() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [state, setState] = useState(settings);
  const set = (k: keyof typeof state) => (v: boolean | string) =>
    setState((prev) => ({ ...prev, [k]: v }));

  const save = useCallback(() => {
    fetcher.submit(
      {
        schemaProduct: String(state.schemaProduct),
        schemaOrganization: String(state.schemaOrganization),
        schemaBreadcrumb: String(state.schemaBreadcrumb),
        schemaArticle: String(state.schemaArticle),
        schemaFaq: String(state.schemaFaq),
        orgName: state.orgName,
        orgTwitter: state.orgTwitter,
      },
      { method: "POST" },
    );
    shopify.toast.show("Preferences saved");
  }, [state, fetcher, shopify]);

  return (
    <Page>
      <TitleBar title="Structured data" />
      <BlockStack gap="400">
        <Banner tone="info" title="Activate structured data in your theme">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              JSON-LD is injected by the <b>Trinetra SEO – Structured Data</b> app
              embed. Open your theme editor, go to <b>App embeds</b>, and turn it
              on. Toggle individual schema types right there in the theme editor.
            </Text>
            <Box>
              <Button
                url="shopify:admin/themes/current/editor?context=apps"
                variant="primary"
                target="_blank"
              >
                Open theme editor → App embeds
              </Button>
            </Box>
          </BlockStack>
        </Banner>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Schema types
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              These preferences are your reference plan. The live on/off switches
              are in the theme editor app embed (kept in sync visually here).
            </Text>
            <Divider />
            <Checkbox
              label="Product schema — rich results with price, availability, brand"
              checked={state.schemaProduct}
              onChange={set("schemaProduct")}
            />
            <Checkbox
              label="Organization schema — logo & social profiles in knowledge panel"
              checked={state.schemaOrganization}
              onChange={set("schemaOrganization")}
            />
            <Checkbox
              label="Breadcrumb schema — breadcrumb trail in search results"
              checked={state.schemaBreadcrumb}
              onChange={set("schemaBreadcrumb")}
            />
            <Checkbox
              label="Article schema — blog posts eligible for article rich results"
              checked={state.schemaArticle}
              onChange={set("schemaArticle")}
            />
            <Checkbox
              label="FAQ schema — from trinetra_seo.faq metafield on products/pages"
              checked={state.schemaFaq}
              onChange={set("schemaFaq")}
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Organization details
            </Text>
            <TextField
              label="Organization name"
              value={state.orgName}
              onChange={set("orgName") as (v: string) => void}
              autoComplete="off"
              helpText="Used in Organization schema. Defaults to your store name."
            />
            <TextField
              label="Twitter / X profile URL"
              value={state.orgTwitter}
              onChange={set("orgTwitter") as (v: string) => void}
              autoComplete="off"
              placeholder="https://twitter.com/yourbrand"
            />
            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={save}
                loading={fetcher.state !== "idle"}
              >
                Save preferences
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Validate your markup
            </Text>
            <List>
              <List.Item>
                Test product pages with Google&apos;s{" "}
                <a
                  href="https://search.google.com/test/rich-results"
                  target="_blank"
                  rel="noreferrer"
                >
                  Rich Results Test
                </a>
                .
              </List.Item>
              <List.Item>
                Validate any URL on{" "}
                <a href="https://validator.schema.org/" target="_blank" rel="noreferrer">
                  schema.org validator
                </a>
                .
              </List.Item>
            </List>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
