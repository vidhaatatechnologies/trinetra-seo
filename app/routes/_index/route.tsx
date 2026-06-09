import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Trinetra SEO</h1>
        <p className={styles.text}>
          All-in-one SEO toolkit for Shopify — optimize meta tags, structured
          data, image alt text, and redirects to rank higher and win more
          organic traffic.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Meta editor</strong>. Bulk-edit SEO titles and meta
            descriptions across all products with templates and a live Google
            preview.
          </li>
          <li>
            <strong>Structured data (JSON-LD)</strong>. One-click Product,
            Organization, Breadcrumb, Article, and FAQ schema for rich results.
          </li>
          <li>
            <strong>Image alt text</strong>. Find and auto-fill missing image
            alt text to capture image-search traffic.
          </li>
          <li>
            <strong>SEO health score</strong>. See a store-wide score and a
            prioritized list of fixes that move the needle.
          </li>
          <li>
            <strong>Redirect manager</strong>. Create 301 redirects to recover
            link equity from removed or renamed pages.
          </li>
        </ul>
        <p className={styles.text}>
          <a href="/privacy">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}
