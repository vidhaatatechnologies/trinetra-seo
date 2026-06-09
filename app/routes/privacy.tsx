const UPDATED = "June 9, 2026";
const CONTACT = "vidhaatatechnologies@gmail.com";

export default function Privacy() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        lineHeight: 1.6,
        color: "#202223",
      }}
    >
      <h1>Privacy Policy — Trinetra SEO</h1>
      <p>
        <em>Last updated: {UPDATED}</em>
      </p>

      <p>
        Trinetra SEO (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;) is a
        Shopify app that helps merchants optimize their store&apos;s SEO. This
        policy explains what data the App accesses, how it is used, and your
        rights.
      </p>

      <h2>Information we access</h2>
      <p>
        When you install the App on your Shopify store, we access only the data
        needed to provide SEO features, via Shopify&apos;s Admin API and the
        access scopes you approve:
      </p>
      <ul>
        <li>
          <strong>Store information</strong> — your store name, domain, and
          currency.
        </li>
        <li>
          <strong>Product, collection, and content data</strong> — titles,
          descriptions, handles, SEO fields, images and their alt text. We read
          these to analyze and update SEO settings at your request.
        </li>
        <li>
          <strong>URL redirects</strong> — to let you create and manage 301
          redirects.
        </li>
      </ul>
      <p>
        <strong>
          We do not access, collect, or store your customers&apos; personal
          data.
        </strong>
      </p>

      <h2>Information we store</h2>
      <p>
        We store only your store&apos;s SEO configuration (templates, schema
        preferences) and the authentication session needed to keep the App
        connected. This is held in a secure Postgres database.
      </p>

      <h2>How we use data</h2>
      <p>
        Data is used solely to operate the App&apos;s features for your store —
        generating SEO recommendations, applying meta/alt-text updates you
        initiate, and rendering structured data. We do not sell or share your
        data with third parties, and we do not use it for advertising.
      </p>

      <h2>Data retention &amp; deletion</h2>
      <p>
        When you uninstall the App, we delete your session data. We honor
        Shopify&apos;s mandatory GDPR/CCPA compliance webhooks
        (<code>customers/data_request</code>, <code>customers/redact</code>,{" "}
        <code>shop/redact</code>); upon a <code>shop/redact</code> request we
        permanently delete all data we hold for your shop. You may also request
        deletion at any time by emailing us.
      </p>

      <h2>Subprocessors</h2>
      <p>
        We use Render (application hosting) and Neon (database hosting) to
        operate the App. Data is processed only to deliver the service.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy questions or data requests, contact us at{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </main>
  );
}
