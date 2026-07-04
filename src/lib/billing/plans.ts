import type { UsageKind } from "@/src/lib/usage";

export const BILLING_PLAN_KEYS = ["basic", "value", "bundle"] as const;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];

export type BillingPlan = {
  key: BillingPlanKey;
  label: string;
  description: string;
  priceEnvVar: string;
  activeForV1: boolean;
  limits: Partial<Record<UsageKind, number>>;
};

export const BASIC_USAGE_LIMITS: Record<UsageKind, number> = {
  design_image_generated: 100,
  design_video_generated: 20,
  design_3d_generated: 20,
  quote_requested: 250,
  quote_responded: 250,
  quote_fulfilled: 250,
  vvs_video_generated: 20,
  vvs_product_post_generated: 50,
  vvs_product_post_fulfilled: 50,
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    key: "basic",
    label: "Basic",
    description: "V1 launch plan for store owners.",
    priceEnvVar: "STRIPE_PRICE_BASIC",
    activeForV1: true,
    limits: BASIC_USAGE_LIMITS,
  },
  {
    key: "value",
    label: "Value",
    description: "Planned higher-volume plan.",
    priceEnvVar: "STRIPE_PRICE_VALUE",
    activeForV1: false,
    limits: {},
  },
  {
    key: "bundle",
    label: "Bundle",
    description: "Planned bundle plan.",
    priceEnvVar: "STRIPE_PRICE_BUNDLE",
    activeForV1: false,
    limits: {},
  },
];

export const TRIAL_DAYS = Number.parseInt(process.env.STRIPE_TRIAL_DAYS ?? "7", 10) || 7;
export const PAYMENT_FAILURE_GRACE_DAYS = 2;

export function getBillingPlan(key: string | null | undefined) {
  return BILLING_PLANS.find(plan => plan.key === key) ?? null;
}

export function getActiveBillingPlan(key: string | null | undefined) {
  const plan = getBillingPlan(key);
  return plan?.activeForV1 ? plan : null;
}

export function priceIdForPlan(plan: BillingPlan) {
  return process.env[plan.priceEnvVar]?.trim() || null;
}

export function planKeyForPriceId(priceId: string | null | undefined): BillingPlanKey | null {
  if (!priceId) return null;
  const match = BILLING_PLANS.find(plan => priceIdForPlan(plan) === priceId);
  return match?.key ?? null;
}
