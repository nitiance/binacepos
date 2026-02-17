export const metadata = {
  title: "Terms",
};

export default function Page() {
  return (
    <div className="container" style={{ paddingTop: 54, paddingBottom: 70 }}>
      <h1 className="h1 reveal" style={{ fontSize: 44, animationDelay: "40ms" }}>
        Terms of Service
      </h1>
      <div className="surface reveal" style={{ padding: 18, marginTop: 18, animationDelay: "120ms" }}>
        <div className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
          <p>
            This is a placeholder terms page for v1. Replace with your actual terms before public launch.
          </p>
          <p>
            The software is provided as-is. Billing, device limits, and access state are enforced by the platform configuration.
          </p>
          <p>
            Demo environments are temporary and may be suspended or reset automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

