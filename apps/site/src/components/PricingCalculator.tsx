"use client";

import { useMemo, useState } from "react";
import { computePricing, type PlanType, type PricingPlanMap } from "@/lib/pricing";

function fmtMoney(v: number) {
  if (!Number.isFinite(v)) return "0";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function PricingCalculator(props: { plans: PricingPlanMap }) {
  const [devices, setDevices] = useState(2);

  const cards = useMemo(() => {
    const planTypes: PlanType[] = ["business_system", "app_only"];
    return planTypes.map((pt) => {
      const plan = props.plans[pt];
      const calc = computePricing(plan, devices);
      const extraSetup = Math.max(0, calc.extra_devices) * plan.setup_per_extra;
      const extraMonthly = Math.max(0, calc.extra_devices) * plan.monthly_per_extra;
      return { pt, plan, calc, extraSetup, extraMonthly };
    });
  }, [props.plans, devices]);

  return (
    <div className="surface" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="h2" style={{ fontSize: 26 }}>
            Pricing Calculator
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, maxWidth: 760 }}>
            Adjust device count to preview setup, monthly, and annual pricing. Annual covers included devices only; extra
            devices still add monthly charges.
          </div>
        </div>

        <div className="pill">
          Devices: <span style={{ fontWeight: 850, color: "var(--fg)" }}>{devices}</span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <input
          type="range"
          min={1}
          max={12}
          value={devices}
          onChange={(e) => setDevices(Number(e.target.value) || 1)}
          style={{ width: "100%" }}
          aria-label="Device count"
        />
        <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
          Tip: Use 2 devices for a typical (PC + phone) setup.
        </div>
      </div>

      <div className="pricing-grid" style={{ marginTop: 16 }}>
        {cards.map(({ pt, plan, calc, extraSetup, extraMonthly }) => (
          <div key={pt} className="surface reveal" style={{ padding: 18, background: "var(--card2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div className="h2" style={{ fontSize: 20 }}>
                {pt === "business_system" ? "Business System" : "App Only"}
              </div>
              <div className="pill">
                Included: <span style={{ fontWeight: 850, color: "var(--fg)" }}>{plan.included_devices}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div className="surface" style={{ padding: 14, background: "rgba(255,255,255,0.55)" }}>
                <div className="muted2" style={{ fontSize: 12 }}>
                  Setup
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 8 }}>
                  ${fmtMoney(calc.setup)}
                </div>
                <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
                  Base ${fmtMoney(plan.setup_base)}
                  {calc.extra_devices > 0 ? ` + extras ${fmtMoney(extraSetup)}` : ""}
                </div>
              </div>

              <div className="surface" style={{ padding: 14, background: "rgba(255,255,255,0.55)" }}>
                <div className="muted2" style={{ fontSize: 12 }}>
                  Monthly
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 8 }}>
                  ${fmtMoney(calc.monthly)}
                </div>
                <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
                  Base ${fmtMoney(plan.monthly_base)}
                  {calc.extra_devices > 0 ? ` + extras ${fmtMoney(extraMonthly)}` : ""}
                </div>
              </div>
            </div>

            <div className="surface" style={{ padding: 14, marginTop: 12, background: "rgba(255,255,255,0.55)" }}>
              <div className="muted2" style={{ fontSize: 12 }}>
                Annual
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>
                  ${fmtMoney(calc.annual_base)}
                </div>
                <div className="muted2" style={{ fontSize: 12 }}>
                  Covers {calc.annual_months} months (base)
                </div>
              </div>
              <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
                Extra devices still add ${fmtMoney(plan.monthly_per_extra)}/month each.
              </div>
            </div>

            <div className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>
              {calc.extra_devices > 0
                ? `${calc.extra_devices} extra device(s) selected beyond included devices.`
                : "No extra devices beyond included devices."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

