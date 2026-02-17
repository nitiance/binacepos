import { PricingCalculator } from "@/components/PricingCalculator";
import { fetchPricingPlans } from "@/lib/publicPricing";

export const metadata = {
  title: "Pricing",
};

export default async function Page() {
  const plans = await fetchPricingPlans();

  return (
    <div className="container" style={{ paddingTop: 54, paddingBottom: 70 }}>
      <div className="reveal" style={{ animationDelay: "40ms" }}>
        <h1 className="h1" style={{ fontSize: 44 }}>
          Pricing
        </h1>
        <div className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.6, maxWidth: 920 }}>
          Pricing is global and configurable from the Platform Admin console. This page reads the live values from the database
          (with safe defaults if unavailable).
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <PricingCalculator plans={plans} />
      </div>

      <div className="surface reveal" style={{ padding: 18, marginTop: 18, animationDelay: "140ms" }}>
        <div style={{ fontWeight: 850, letterSpacing: "-0.02em" }}>Notes</div>
        <ul className="muted" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Annual plan covers the base included devices only. Extra devices still add monthly charges.</li>
          <li>App-only plan includes an initial free period (trial) when first activated.</li>
          <li>Device limits are enforced by device activation; old devices can be deactivated in Platform Admin.</li>
        </ul>
      </div>
    </div>
  );
}

