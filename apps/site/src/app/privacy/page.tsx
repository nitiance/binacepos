export const metadata = {
  title: "Privacy",
};

export default function Page() {
  return (
    <div className="container" style={{ paddingTop: 54, paddingBottom: 70 }}>
      <h1 className="h1 reveal" style={{ fontSize: 44, animationDelay: "40ms" }}>
        Privacy Policy
      </h1>
      <div className="surface reveal" style={{ padding: 18, marginTop: 18, animationDelay: "120ms" }}>
        <div className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
          <p>
            This is a placeholder privacy policy for v1. Replace with your actual policy before public launch.
          </p>
          <p>
            We may collect basic operational data needed to run the service (authentication, tenant billing state, device
            activation events, and app feedback reports). We do not sell personal data.
          </p>
          <p>
            For the live demo, a temporary demo tenant may be created and rate-limited by a hashed network identifier.
          </p>
        </div>
      </div>
    </div>
  );
}

