export type PlanType = "business_system" | "app_only";

export type PricingPlanRow = {
  plan_type: PlanType;
  included_devices: number;
  setup_base: number;
  setup_per_extra: number;
  monthly_base: number;
  monthly_per_extra: number;
  annual_base: number;
  annual_months: number;
};

export type PricingPlanMap = Record<PlanType, PricingPlanRow>;

export const DEFAULT_PRICING_PLANS: PricingPlanMap = {
  business_system: {
    plan_type: "business_system",
    included_devices: 2,
    setup_base: 40,
    setup_per_extra: 5,
    monthly_base: 5,
    monthly_per_extra: 5,
    annual_base: 50,
    annual_months: 12,
  },
  app_only: {
    plan_type: "app_only",
    included_devices: 2,
    setup_base: 10,
    setup_per_extra: 5,
    monthly_base: 5,
    monthly_per_extra: 5,
    annual_base: 50,
    annual_months: 12,
  },
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function clampMoney(n: number, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.round(x * 100) / 100);
}

export function computePricing(plan: PricingPlanRow, devices: number) {
  const d = clampInt(devices, 1, 50);
  const included = clampInt(plan.included_devices, 1, 50);
  const extra = Math.max(0, d - included);

  const setup = clampMoney(plan.setup_base) + clampMoney(plan.setup_per_extra) * extra;
  const monthly = clampMoney(plan.monthly_base) + clampMoney(plan.monthly_per_extra) * extra;

  return {
    plan_type: plan.plan_type,
    devices: d,
    included_devices: included,
    extra_devices: extra,
    setup: clampMoney(setup),
    monthly: clampMoney(monthly),
    annual_base: clampMoney(plan.annual_base),
    annual_months: clampInt(plan.annual_months, 1, 36),
  };
}

