import { DEFAULT_PRICING_PLANS, type PlanType, type PricingPlanMap, type PricingPlanRow } from "@/lib/pricing";

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchPricingPlans(): Promise<PricingPlanMap> {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return DEFAULT_PRICING_PLANS;

  const base = url.replace(/\/+$/, "");
  const endpoint =
    `${base}/rest/v1/pricing_plans` +
    `?select=plan_type,included_devices,setup_base,setup_per_extra,monthly_base,monthly_per_extra,annual_base,annual_months`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return DEFAULT_PRICING_PLANS;
    const rows = (await res.json()) as any[];
    if (!Array.isArray(rows)) return DEFAULT_PRICING_PLANS;

    const out: PricingPlanMap = { ...DEFAULT_PRICING_PLANS };
    for (const r of rows) {
      const pt = String(r?.plan_type || "").trim();
      const plan_type: PlanType | null =
        pt === "app_only" ? "app_only" : pt === "business_system" ? "business_system" : null;
      if (!plan_type) continue;

      const baseRow = out[plan_type];
      out[plan_type] = {
        plan_type,
        included_devices: Math.max(1, Math.min(50, toNum(r?.included_devices, baseRow.included_devices))),
        setup_base: Math.max(0, toNum(r?.setup_base, baseRow.setup_base)),
        setup_per_extra: Math.max(0, toNum(r?.setup_per_extra, baseRow.setup_per_extra)),
        monthly_base: Math.max(0, toNum(r?.monthly_base, baseRow.monthly_base)),
        monthly_per_extra: Math.max(0, toNum(r?.monthly_per_extra, baseRow.monthly_per_extra)),
        annual_base: Math.max(0, toNum(r?.annual_base, baseRow.annual_base)),
        annual_months: Math.max(1, Math.min(36, toNum(r?.annual_months, baseRow.annual_months))),
      } satisfies PricingPlanRow;
    }

    return out;
  } catch {
    return DEFAULT_PRICING_PLANS;
  }
}

