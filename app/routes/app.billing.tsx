import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  List,
  Box,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, PRO_PLAN } from "../shopify.server";

const isTest = process.env.NODE_ENV !== "production";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const check = await billing.check({ plans: [PRO_PLAN], isTest });
  return { isPro: check.hasActivePayment };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing`;
  // Throws a redirect to Shopify's subscription approval screen.
  return billing.request({ plan: PRO_PLAN, isTest, returnUrl });
};

export default function BillingPage() {
  const { isPro } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const busy = nav.state === "submitting";

  return (
    <Page>
      <TitleBar title="Plan & Billing" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">Trinetra SEO Pro</Text>
                {isPro
                  ? <Badge tone="success" size="large">Active</Badge>
                  : <Badge size="large">Free plan</Badge>}
              </InlineStack>

              <InlineStack gap="100" blockAlign="end">
                <Text as="span" variant="heading2xl">$9.99</Text>
                <Text as="span" tone="subdued">/ month · 7-day free trial</Text>
              </InlineStack>

              <Divider />

              <Text as="h3" variant="headingMd">Everything in Pro</Text>
              <List type="bullet">
                <List.Item>Unlimited AI-Citation (GEO) scans via Trinetra Core</List.Item>
                <List.Item>Full on-page SEO analysis &amp; scoring</List.Item>
                <List.Item>All JSON-LD schema types</List.Item>
                <List.Item>Bulk meta &amp; image alt-text optimization</List.Item>
                <List.Item>Unlimited 301 redirects</List.Item>
                <List.Item>Same engine &amp; license across WordPress + Shopify</List.Item>
              </List>

              <Box paddingBlockStart="200">
                {isPro ? (
                  <Text as="p" tone="success" variant="bodyMd">
                    You’re on Pro — all premium features are unlocked. 🎉
                  </Text>
                ) : (
                  <Form method="post">
                    <Button submit variant="primary" size="large" loading={busy}>
                      Start 7-day free trial
                    </Button>
                  </Form>
                )}
              </Box>
              {isTest && (
                <Text as="p" tone="subdued" variant="bodySm">
                  Test mode — charges are simulated (no real money) until the app goes live.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
