import Link from "next/link";

export const metadata = {
  title: "Contact",
};

export default function Page() {
  return (
    <div className="container" style={{ paddingTop: 54, paddingBottom: 70 }}>
      <div className="reveal" style={{ animationDelay: "40ms" }}>
        <h1 className="h1" style={{ fontSize: 44 }}>
          Contact
        </h1>
        <div className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.6, maxWidth: 920 }}>
          Tell us about your business size, device count, and connectivity situation. We will recommend the right setup.
        </div>
      </div>

      <div className="surface reveal" style={{ padding: 18, marginTop: 18, animationDelay: "120ms" }}>
        <div style={{ fontWeight: 850, letterSpacing: "-0.02em" }}>Quick start</div>
        <ul className="muted" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            See pricing: <Link href="/pricing" className="muted">
              /pricing
            </Link>
          </li>
          <li>
            Try demo: <Link href="/demo" className="muted">
              /demo
            </Link>
          </li>
        </ul>

        <div className="muted2" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6 }}>
          Contact form/email integration is intentionally omitted in v1. Add your preferred channel here (email, WhatsApp, phone,
          etc.).
        </div>
      </div>
    </div>
  );
}

