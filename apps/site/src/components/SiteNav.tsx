import Link from "next/link";

const PROD_POS_URL = "https://binacepos.vercel.app";

export function SiteNav() {
  const demoUrl = String(process.env.NEXT_PUBLIC_DEMO_POS_URL || "").trim();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(16px)",
        background: "rgba(246, 243, 234, 0.72)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="container site-nav-row">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Link href="/" className="h2" style={{ fontSize: 18, whiteSpace: "nowrap" }}>
            BinanceXI POS
          </Link>
          <div className="muted2" style={{ fontSize: 12, lineHeight: 1.1, maxWidth: 420 }}>
            Offline-first multi-tenant POS
          </div>
        </div>

        <nav className="site-nav-actions">
          <div className="site-nav-links">
            <Link href="/pricing" className="muted site-nav-link">
              Pricing
            </Link>
            <Link href="/demo" className="muted site-nav-link">
              Demo
            </Link>
            <Link href="/contact" className="muted site-nav-link">
              Contact
            </Link>
          </div>

          <div className="site-nav-ctas">
            <a href={PROD_POS_URL} className="btn" style={{ height: 40 }}>
              Launch POS
            </a>
            {demoUrl ? (
              <a href={demoUrl} className="btn btn-primary" style={{ height: 40 }}>
                Try Live Demo
              </a>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
