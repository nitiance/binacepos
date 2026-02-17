import Link from "next/link";

const PROD_POS_URL = "https://binacepos.vercel.app";

export default function Page() {
  const demoUrl = String(process.env.NEXT_PUBLIC_DEMO_POS_URL || "").trim();

  return (
    <div>
      <section className="container" style={{ paddingTop: 72, paddingBottom: 56 }}>
        <div className="home-hero-grid">
          <div>
            <div className="pill reveal" style={{ animationDelay: "0ms" }}>
              Offline-first
              <span style={{ opacity: 0.55 }}>•</span>
              Multi-tenant
              <span style={{ opacity: 0.55 }}>•</span>
              Receipt verification
            </div>

            <h1 className="h1 reveal home-hero-title" style={{ marginTop: 18, animationDelay: "60ms" }}>
              The POS that keeps selling
              <br />
              when the internet disappears.
            </h1>

            <p className="muted reveal" style={{ fontSize: 18, lineHeight: 1.55, marginTop: 16, maxWidth: 620, animationDelay: "120ms" }}>
              BinanceXI POS is built for low-connectivity regions: fast checkout, clean receipts, inventory control, and
              a platform admin console for multi-tenant operations.
            </p>

            <div className="reveal" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22, animationDelay: "180ms" }}>
              <a className="btn btn-primary" href={PROD_POS_URL}>
                Launch POS
              </a>
              <Link className="btn" href="/pricing">
                See Pricing
              </Link>
              {demoUrl ? (
                <a className="btn" href={demoUrl}>
                  Try Live Demo
                </a>
              ) : null}
            </div>

            <div className="reveal" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, animationDelay: "240ms" }}>
              <span className="pill">Works offline</span>
              <span className="pill">Windows + Android</span>
              <span className="pill">Device limits + billing</span>
              <span className="pill">Support mode</span>
            </div>
          </div>

          <div className="surface reveal home-preview" style={{ padding: 18, animationDelay: "120ms" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div className="muted2" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Live Operations
                </div>
                <div className="h2" style={{ fontSize: 22, marginTop: 6 }}>
                  Today
                </div>
              </div>
              <div className="pill" title="Sync status">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(34, 197, 94, 0.9)",
                    boxShadow: "0 0 0 6px rgba(34, 197, 94, 0.12)",
                    display: "inline-block",
                  }}
                />
                Synced
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div className="surface" style={{ padding: 14, background: "var(--card2)" }}>
                <div className="muted2" style={{ fontSize: 12 }}>
                  Revenue
                </div>
                <div style={{ fontSize: 26, fontWeight: 850, letterSpacing: "-0.03em", marginTop: 8 }}>$1,240</div>
                <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
                  vs yesterday +12%
                </div>
              </div>
              <div className="surface" style={{ padding: 14, background: "var(--card2)" }}>
                <div className="muted2" style={{ fontSize: 12 }}>
                  Queued offline
                </div>
                <div style={{ fontSize: 26, fontWeight: 850, letterSpacing: "-0.03em", marginTop: 8 }}>3</div>
                <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
                  will sync automatically
                </div>
              </div>
            </div>

            <div className="surface" style={{ padding: 14, marginTop: 12, background: "var(--card2)" }}>
              <div className="muted2" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Receipts
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {[
                  { id: "R-1042", amount: "$18.50", state: "verified" },
                  { id: "R-1041", amount: "$7.00", state: "verified" },
                  { id: "R-1040", amount: "$42.00", state: "verified" },
                ].map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 750 }}>{r.id}</div>
                      <div className="muted2" style={{ fontSize: 12 }}>
                        QR verification supported
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 800 }}>{r.amount}</div>
                      <span className="pill" style={{ borderColor: "rgba(14, 165, 233, 0.25)" }}>
                        {r.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 56 }}>
        <div className="reveal" style={{ animationDelay: "80ms" }}>
          <h2 className="h2" style={{ fontSize: 34, marginBottom: 10 }}>
            Built for speed, designed for control
          </h2>
          <div className="muted" style={{ fontSize: 16, maxWidth: 760, lineHeight: 1.55 }}>
            The app stays usable offline. The platform stays manageable online: tenant health, billing ledger, feedback inbox,
            and pricing controls.
          </div>
        </div>

        <div className="home-feature-grid" style={{ marginTop: 18 }}>
          {[
            {
              title: "Offline-first core",
              body: "Sales and inventory keep working without internet. Sync resumes automatically when back online.",
              accent: "rgba(14, 165, 233, 0.18)",
            },
            {
              title: "Multi-tenant platform",
              body: "A real operations console: tenant health, device entitlements, billing history, and support tools.",
              accent: "rgba(34, 197, 94, 0.16)",
            },
            {
              title: "Receipts that verify",
              body: "Receipts generate public verification links and QR codes so customers can confirm authenticity.",
              accent: "rgba(11, 18, 32, 0.12)",
            },
            {
              title: "Feedback pipeline",
              body: "Users can report bugs or leave reviews inside the app. Platform admin can triage and close loops.",
              accent: "rgba(14, 165, 233, 0.12)",
            },
            {
              title: "Configurable pricing",
              body: "Pricing is stored in the database (not hard-coded) and can be updated from Platform Admin.",
              accent: "rgba(34, 197, 94, 0.12)",
            },
            {
              title: "Support mode",
              body: "Impersonation with audit logs for safe troubleshooting and training (no guessing, no silent access).",
              accent: "rgba(11, 18, 32, 0.10)",
            },
          ].map((f, i) => (
            <div key={f.title} className="surface reveal" style={{ padding: 18, animationDelay: `${140 + i * 60}ms` }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: f.accent, border: "1px solid var(--border)" }} />
              <div style={{ marginTop: 12, fontWeight: 850, letterSpacing: "-0.02em" }}>{f.title}</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55 }}>
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 70 }}>
        <div className="surface reveal" style={{ padding: 22, animationDelay: "120ms" }}>
          <div className="h2" style={{ fontSize: 28 }}>
            Want to try it right now?
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, maxWidth: 820 }}>
            Open the live demo to get a temporary business and credentials, or launch the production POS if you already have an
            account.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {demoUrl ? (
              <a className="btn btn-primary" href={demoUrl}>
                Try Live Demo
              </a>
            ) : null}
            <a className="btn" href={PROD_POS_URL}>
              Launch POS
            </a>
            <Link className="btn" href="/contact">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
