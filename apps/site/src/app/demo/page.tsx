import Link from "next/link";

export const metadata = {
  title: "Live Demo",
};

export default function Page() {
  const demoUrl = String(process.env.NEXT_PUBLIC_DEMO_POS_URL || "").trim();

  return (
    <div className="container" style={{ paddingTop: 54, paddingBottom: 70 }}>
      <div className="reveal" style={{ animationDelay: "40ms" }}>
        <h1 className="h1" style={{ fontSize: 44 }}>
          Live Demo
        </h1>
        <div className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.6, maxWidth: 920 }}>
          The demo provisions a temporary demo business per visitor. You will receive demo credentials and land directly in the
          dashboard.
        </div>
      </div>

      <div className="surface reveal" style={{ padding: 18, marginTop: 18, animationDelay: "120ms" }}>
        <div style={{ fontWeight: 850, letterSpacing: "-0.02em" }}>How it works</div>
        <ol className="muted" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Open the demo POS.</li>
          <li>Click “Try Live Demo”.</li>
          <li>A demo tenant is created and you are signed in automatically.</li>
        </ol>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          {demoUrl ? (
            <a className="btn btn-primary" href={demoUrl}>
              Open Demo POS
            </a>
          ) : (
            <span className="pill">Demo URL not configured</span>
          )}
          <Link className="btn" href="/pricing">
            Pricing
          </Link>
          <Link className="btn" href="/contact">
            Contact
          </Link>
        </div>

        <div className="muted2" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6 }}>
          Demo runs on a separate environment and does not affect production data.
        </div>
      </div>
    </div>
  );
}

