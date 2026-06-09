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

const FEATURES = [
  {
    icon: "📝",
    title: "Meta editor",
    text: "Bulk-edit SEO titles and meta descriptions across all products with smart templates and a live Google preview.",
  },
  {
    icon: "🔖",
    title: "Structured data",
    text: "One-click Product, Organization, Breadcrumb, Article & FAQ JSON-LD schema for rich results.",
  },
  {
    icon: "🖼️",
    title: "Image alt text",
    text: "Find and auto-fill missing image alt text to capture Google Images traffic and improve accessibility.",
  },
  {
    icon: "📊",
    title: "SEO health score",
    text: "A store-wide score with a prioritized list of fixes that actually move the needle.",
  },
  {
    icon: "🔀",
    title: "Redirect manager",
    text: "Create 301 redirects to recover link equity from removed or renamed pages.",
  },
];

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <img
          className={styles.logo}
          src="/trinetra-icon.svg"
          alt="Trinetra SEO"
          width={88}
          height={88}
        />
        <h1 className={styles.heading}>Trinetra SEO</h1>
        <p className={styles.tagline}>
          The all-in-one SEO toolkit for Shopify. Optimize meta tags, structured
          data, image alt text, and redirects — rank higher and win more organic
          traffic.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <input
              className={styles.input}
              type="text"
              name="shop"
              placeholder="my-shop.myshopify.com"
              aria-label="Shop domain"
            />
            <button className={styles.button} type="submit">
              Install / Log in
            </button>
          </Form>
        )}
        <p className={styles.hint}>Enter your store domain to get started.</p>
      </header>

      <section className={styles.features}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.card}>
            <span className={styles.cardIcon} aria-hidden>
              {f.icon}
            </span>
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardText}>{f.text}</p>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        <a className={styles.footerLink} href="/privacy">
          Privacy policy
        </a>
        <span className={styles.dot}>•</span>
        <span>© 2026 Trinetra SEO by Vidhaata Technologies</span>
      </footer>
    </div>
  );
}
