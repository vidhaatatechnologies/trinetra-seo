import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  ProgressBar,
  Box,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSeoSettings, scoreProduct } from "../models/seo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await getSeoSettings(session.shop);

  const response = await admin.graphql(
    `#graphql
      query DashboardProducts {
        productsCount { count }
        products(first: 50, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            handle
            descriptionHtml
            seo { title description }
            featuredImage { altText }
            images(first: 50) { nodes { altText } }
          }
        }
      }`,
  );
  const json = await response.json();
  const data = json.data;
  const nodes = data?.products?.nodes ?? [];
  const totalProducts = data?.productsCount?.count ?? nodes.length;

  let scoreSum = 0;
  let missingTitle = 0;
  let missingDesc = 0;
  let missingAlt = 0;

  for (const n of nodes) {
    const images = n.images?.nodes ?? [];
    const imagesWithAlt = images.filter(
      (i: { altText?: string | null }) => i.altText && i.altText.trim().length > 0,
    ).length;
    const { score } = scoreProduct({
      title: n.title,
      seoTitle: n.seo?.title,
      seoDescription: n.seo?.description,
      descriptionHtml: n.descriptionHtml,
      handle: n.handle,
      imagesCount: images.length,
      imagesWithAltCount: imagesWithAlt,
    });
    scoreSum += score;
    if (!n.seo?.title) missingTitle++;
    if (!n.seo?.description) missingDesc++;
    if (images.length > 0 && imagesWithAlt < images.length) missingAlt++;
  }

  const sampled = nodes.length;
  const avgScore = sampled ? Math.round(scoreSum / sampled) : 0;

  return {
    shop: session.shop,
    totalProducts,
    sampled,
    avgScore,
    missingTitle,
    missingDesc,
    missingAlt,
  };
};

function scoreTone(score: number): "success" | "attention" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "attention";
  return "critical";
}

export default function Dashboard() {
  const { totalProducts, sampled, avgScore, missingTitle, missingDesc, missingAlt } =
    useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Trinetra SEO" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Store SEO health
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      Based on your {sampled} most recently updated products
                      {totalProducts > sampled ? ` of ${totalProducts} total` : ""}.
                    </Text>
                  </BlockStack>
                  <Badge tone={scoreTone(avgScore)} size="large">
                    {`${avgScore}/100`}
                  </Badge>
                </InlineStack>
                <ProgressBar
                  progress={avgScore}
                  tone={
                    avgScore >= 80 ? "success" : avgScore >= 50 ? "primary" : "critical"
                  }
                  size="large"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <InlineStack gap="400" wrap>
              <IssueCard
                count={missingTitle}
                label="Missing SEO titles"
                to="/app/meta"
                cta="Fix titles"
              />
              <IssueCard
                count={missingDesc}
                label="Missing meta descriptions"
                to="/app/meta"
                cta="Fix descriptions"
              />
              <IssueCard
                count={missingAlt}
                label="Products with missing image alt text"
                to="/app/images"
                cta="Fix alt text"
              />
            </InlineStack>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Quick actions
                </Text>
                <Divider />
                <ActionRow
                  title="Bulk-edit meta titles & descriptions"
                  desc="Apply templates across all products in one click."
                  to="/app/meta"
                />
                <ActionRow
                  title="Generate JSON-LD structured data"
                  desc="Enable Product, Organization, Breadcrumb, Article & FAQ schema."
                  to="/app/schema"
                />
                <ActionRow
                  title="Fix missing image alt text"
                  desc="Auto-fill alt text from a template for better image SEO."
                  to="/app/images"
                />
                <ActionRow
                  title="Manage URL redirects"
                  desc="Create 301 redirects to recover link equity from 404s."
                  to="/app/redirects"
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function IssueCard({
  count,
  label,
  to,
  cta,
}: {
  count: number;
  label: string;
  to: string;
  cta: string;
}) {
  return (
    <Box minWidth="220px">
      <Card>
        <BlockStack gap="200">
          <Text as="span" variant="heading2xl">
            {String(count)}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {label}
          </Text>
          <Button url={to} variant="plain">
            {cta}
          </Button>
        </BlockStack>
      </Card>
    </Box>
  );
}

function ActionRow({
  title,
  desc,
  to,
}: {
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <InlineStack align="space-between" blockAlign="center" gap="400">
      <BlockStack gap="050">
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {title}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {desc}
        </Text>
      </BlockStack>
      <Button url={to}>Open</Button>
    </InlineStack>
  );
}
