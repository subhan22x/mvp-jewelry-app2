"use client";

import Script from "next/script";

export default function EmbedPreview() {
  return (
    <div style={{ minHeight: "100vh", background: "#111" }}>
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "20px 16px 40px",
          color: "#fff",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <p style={{ fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>
          Embed Preview
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>
          pendant-builder Widget
        </h1>
        <p style={{ fontSize: 14, color: "#aaa", margin: "0 0 32px" }}>
          This page loads the widget via a <code style={{ background: "#333", padding: "2px 6px", borderRadius: 4 }}>{`<script>`}</code> tag, exactly like a Shopify or Wix site would.
        </p>

        {/* Widget via custom element */}
        <pendant-builder store-id="demo" api-base="" mode="pendants" />

        <Script src="/embed/pendant-builder.js" strategy="beforeInteractive" />
      </div>
    </div>
  );
}
