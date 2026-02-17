import Link from "next/link";

const PROD_POS_URL = "https://binacepos.vercel.app";

export function SiteFooter() {
  return (
    <footer style={{ paddingTop: 56, paddingBottom: 36 }}>
      <div className="container">
        <div
          className="surface site-footer-grid"
          style={{
            padding: 22,
          }}
        >
          <div>
            <div className="h2" style={{ fontSize: 18 }}>
              BinanceXI POS
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.4 }}>
              Built for real-world connectivity: offline-first sales, receipts, inventory, and multi-tenant ops.
            </div>
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href={PROD_POS_URL} className="btn" style={{ height: 40 }}>
                Launch POS
              </a>
              <Link href="/pricing" className="btn" style={{ height: 40 }}>
                Pricing
              </Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 750, fontSize: 13, letterSpacing: "-0.01em" }}>Product</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <Link href="/demo" className="muted">
                Live demo
              </Link>
              <Link href="/pricing" className="muted">
                Pricing calculator
              </Link>
              <a href={PROD_POS_URL} className="muted">
                Production app
              </a>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 750, fontSize: 13, letterSpacing: "-0.01em" }}>Legal</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <Link href="/privacy" className="muted">
                Privacy
              </Link>
              <Link href="/terms" className="muted">
                Terms
              </Link>
              <Link href="/contact" className="muted">
                Contact
              </Link>
            </div>
          </div>
        </div>

        <div className="muted2" style={{ marginTop: 14, fontSize: 12 }}>
          © {new Date().getFullYear()} BinanceXI POS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
