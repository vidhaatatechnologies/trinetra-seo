import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Banner,
  TextField,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

interface Redirect {
  id: string;
  path: string;
  target: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query Redirects {
        urlRedirects(first: 100, sortKey: PATH) {
          nodes { id path target }
        }
      }`,
  );
  const json = await response.json();
  const redirects: Redirect[] = json.data?.urlRedirects?.nodes ?? [];
  return { redirects };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "create") {
    let path = String(form.get("path") ?? "").trim();
    let target = String(form.get("target") ?? "").trim();
    if (!path || !target) {
      return { ok: false, error: "Both 'from' and 'to' paths are required." };
    }
    if (!path.startsWith("/")) path = "/" + path;

    const response = await admin.graphql(
      `#graphql
        mutation CreateRedirect($redirect: UrlRedirectInput!) {
          urlRedirectCreate(urlRedirect: $redirect) {
            urlRedirect { id path target }
            userErrors { field message }
          }
        }`,
      { variables: { redirect: { path, target } } },
    );
    const json = await response.json();
    const ue = json.data?.urlRedirectCreate?.userErrors ?? [];
    if (ue.length) return { ok: false, error: ue.map((e: any) => e.message).join(", ") };
    return { ok: true, error: null };
  }

  if (intent === "delete") {
    const id = String(form.get("id"));
    const response = await admin.graphql(
      `#graphql
        mutation DeleteRedirect($id: ID!) {
          urlRedirectDelete(id: $id) {
            deletedUrlRedirectId
            userErrors { field message }
          }
        }`,
      { variables: { id } },
    );
    const json = await response.json();
    const ue = json.data?.urlRedirectDelete?.userErrors ?? [];
    if (ue.length) return { ok: false, error: ue.map((e: any) => e.message).join(", ") };
    return { ok: true, error: null };
  }

  return { ok: false, error: "Unknown action" };
};

export default function Redirects() {
  const { redirects } = useLoaderData<typeof loader>();
  const createFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [path, setPath] = useState("");
  const [target, setTarget] = useState("");

  const submitCreate = useCallback(() => {
    if (!path.trim() || !target.trim()) return;
    createFetcher.submit(
      { intent: "create", path, target },
      { method: "POST" },
    );
    setPath("");
    setTarget("");
    shopify.toast.show("Creating redirect…");
  }, [path, target, createFetcher, shopify]);

  const submitDelete = useCallback(
    (id: string) => {
      deleteFetcher.submit({ intent: "delete", id }, { method: "POST" });
      shopify.toast.show("Deleting redirect…");
    },
    [deleteFetcher, shopify],
  );

  const createBusy = createFetcher.state !== "idle";

  const rows = redirects.map((r, index) => (
    <IndexTable.Row id={r.id} key={r.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="semibold">
          {r.path}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{r.target}</IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          size="slim"
          tone="critical"
          variant="plain"
          onClick={() => submitDelete(r.id)}
        >
          Delete
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title="Redirects" />
      <BlockStack gap="400">
        {createFetcher.data?.error && (
          <Banner tone="critical" title={createFetcher.data.error} />
        )}
        {deleteFetcher.data?.error && (
          <Banner tone="critical" title={deleteFetcher.data.error} />
        )}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Create a 301 redirect
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Recover SEO value from removed or renamed pages by redirecting old
              URLs to a relevant page.
            </Text>
            <InlineStack gap="300" blockAlign="end" wrap>
              <TextField
                label="Redirect from (old path)"
                value={path}
                onChange={setPath}
                placeholder="/old-product"
                autoComplete="off"
              />
              <TextField
                label="Redirect to"
                value={target}
                onChange={setTarget}
                placeholder="/products/new-product"
                autoComplete="off"
              />
              <Button
                variant="primary"
                onClick={submitCreate}
                loading={createBusy}
                disabled={createBusy}
              >
                Add redirect
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card padding="0">
          {redirects.length === 0 ? (
            <EmptyState
              heading="No redirects yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Create your first 301 redirect above to fix broken links.</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={{ singular: "redirect", plural: "redirects" }}
              itemCount={redirects.length}
              selectable={false}
              headings={[
                { title: "From" },
                { title: "To" },
                { title: "" },
              ]}
            >
              {rows}
            </IndexTable>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
