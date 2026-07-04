import type { ReactNode } from "react";
import type { EntitlementState } from "@/src/lib/billing/entitlements";
import { TRIAL_DAYS, type BillingPlan, type BillingPlanKey } from "@/src/lib/billing/plans";

type UsageSummary = {
  kind: string;
  used: number;
  included: number;
};

type AccountPageContentProps = {
  billingMessage?: string | null;
  entitlement: EntitlementState;
  activePlanKey: string;
  trialEndsAt?: Date | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  stripeCustomerId?: string | null;
  usage: [UsageSummary, UsageSummary];
  plans: BillingPlan[];
};

const CARD_BASE = "rounded-[18px] border bg-[#1C1E24]";
const LANDING_FONT = "[font-family:var(--font-plus-jakarta),var(--font-figtree),sans-serif]";
const SECTION_TITLE = "text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl";
const PLAN_CARD = `flex min-h-[292px] w-[224px] flex-none flex-col p-4 min-[380px]:w-[248px] min-[380px]:p-5 xl:w-auto ${CARD_BASE}`;
const PRIMARY_BUTTON = `h-10 w-full rounded-md bg-white text-sm font-bold text-[#101114] transition hover:bg-[#F4D38A] ${LANDING_FONT}`;

const PLAN_CONTENT: Record<BillingPlanKey, { price: string; features: string[] }> = {
  basic: {
    price: "$--",
    features: ["Basic account access", "Customer quote dashboard", "Stripe billing portal"],
  },
  value: {
    price: "$--",
    features: ["Higher usage limits", "More store tools", "Details coming later"],
  },
  bundle: {
    price: "Custom",
    features: ["Bundled workflows", "Priority features", "Details coming later"],
  },
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function daysUntil(date: Date | null | undefined) {
  if (!date) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / msPerDay));
}

function statusTone(statusLabel: string) {
  if (statusLabel === "Free Trial" || statusLabel === "Active" || statusLabel === "Legacy active") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  if (statusLabel === "Payment failed") return "border-red-400/40 bg-red-500/10 text-red-100";
  return "border-[#D1B873]/35 bg-[#56450a]/40 text-[#F4D38A]";
}

function usageTone(used: number, included: number) {
  const percent = included > 0 ? used / included : 0;
  if (percent >= 0.85) return { bar: "#EF4444", track: "#3C1F25", text: "text-red-200" };
  if (percent >= 0.65) return { bar: "#D1B873", track: "#3D3520", text: "text-[#F4D38A]" };
  return { bar: "#4ADE80", track: "#183427", text: "text-emerald-200" };
}

function trialSummary(trialEndsAt: Date | null | undefined) {
  const daysLeft = daysUntil(trialEndsAt);
  const label = daysLeft === null ? "Trial active" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
  const progress = daysLeft === null ? 100 : clampPercent((daysLeft / Math.max(1, TRIAL_DAYS)) * 100);
  return { label, progress };
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={SECTION_TITLE}>{children}</h2>;
}

function ScrollRail({ children, desktopGridClass }: { children: ReactNode; desktopGridClass?: string }) {
  return (
    <div className="mt-5 w-full min-w-0 overflow-x-auto pb-1">
      <div className={`flex w-max max-w-none gap-4 pr-4 min-[380px]:gap-5 xl:w-full xl:pr-0 ${desktopGridClass ?? ""}`}>
        {children}
      </div>
    </div>
  );
}

function FeatureList({ rows, tone = "default" }: { rows: string[]; tone?: "default" | "trial" }) {
  const itemText = tone === "trial" ? "text-[#F0F8EE]" : "text-[#D7DBE8]";
  const checkTone = tone === "trial"
    ? "border-emerald-200/45 bg-emerald-200/15 text-emerald-100"
    : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";

  return (
    <ul className="space-y-3">
      {rows.map(row => (
        <li key={row} className={`flex items-center gap-2 text-xs font-semibold ${itemText}`}>
          <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[10px] ${checkTone}`}>✓</span>
          <span>{row}</span>
        </li>
      ))}
    </ul>
  );
}

function UsageCard({ label, used, included }: { label: string; used: number; included: number }) {
  const tone = usageTone(used, included);
  const percent = clampPercent((used / Math.max(1, included)) * 100);
  const remaining = Math.max(0, included - used);

  return (
    <article className={`relative min-h-[112px] w-[136px] flex-none overflow-hidden border-[#2D3340] px-4 pb-5 pt-4 min-[380px]:w-[172px] min-[380px]:px-5 ${CARD_BASE}`}>
      <div className="absolute left-3 right-3 top-0 h-2 overflow-hidden rounded-b-full" style={{ backgroundColor: tone.track }}>
        <div className="h-full rounded-b-full" style={{ width: `${percent}%`, backgroundColor: tone.bar }} />
      </div>
      <p className="text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[#AEB8D8] min-[380px]:text-[13px]">{label}</p>
      <div className="mt-5 flex items-end gap-1.5 whitespace-nowrap min-[380px]:gap-2">
        <span className={`text-[24px] font-bold leading-none tracking-tight text-white min-[380px]:text-[28px] ${LANDING_FONT}`}>{used}</span>
        <span className={`pb-0.5 text-[22px] font-bold leading-none tracking-tight text-white min-[380px]:text-[26px] ${LANDING_FONT}`}>/ {included}</span>
        <span className="pb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#AEB8D8] min-[380px]:text-[10px]">used</span>
      </div>
      <p className={`mt-3 text-[11px] font-semibold min-[380px]:text-xs ${tone.text}`}>{remaining} left this month</p>
    </article>
  );
}

function PlanCard({ plan, isCurrent }: { plan: BillingPlan; isCurrent: boolean }) {
  const content = PLAN_CONTENT[plan.key];
  const isAvailable = plan.activeForV1;
  const buttonLabel = isAvailable ? (isCurrent ? "Manage Basic" : "Get started") : "Coming soon";

  return (
    <article className={`${PLAN_CARD} transition ${isCurrent ? "border-[#D1B873] shadow-[0_0_0_1px_rgba(209,184,115,0.1)]" : "border-[#2D3340]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-lg font-bold tracking-tight text-white ${LANDING_FONT}`}>{plan.label}</h3>
          <p className="mt-1 text-xs leading-5 text-[#AEB8D8]">{plan.description}</p>
        </div>
        {isCurrent && <span className={`rounded-full border border-[#D1B873]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F4D38A] ${LANDING_FONT}`}>Current</span>}
      </div>

      <div className="mt-5">
        <span className={`text-[34px] font-bold leading-none tracking-tight text-white ${LANDING_FONT}`}>{content.price}</span>
        {plan.key !== "bundle" && <span className="ml-1 text-xs font-bold text-[#AEB8D8]">/month</span>}
      </div>

      <div className="mt-6">
        <FeatureList rows={content.features} />
      </div>

      <form action="/api/billing/checkout" method="post" className="mt-auto pt-7">
        <input type="hidden" name="planKey" value={plan.key} />
        <button
          className={`h-10 w-full rounded-md text-sm font-bold transition ${LANDING_FONT} ${isAvailable ? "bg-white text-[#101114] hover:bg-[#F4D38A]" : "cursor-not-allowed bg-[#2A2D35] text-[#858CA2]"}`}
          disabled={!isAvailable}
        >
          {buttonLabel}
        </button>
      </form>
    </article>
  );
}

function FreeTrialCard({ trialEndsAt }: { trialEndsAt?: Date | null }) {
  const trial = trialSummary(trialEndsAt);
  const features = [trial.label, "Card required at signup", "Basic plan access during trial"];

  return (
    <article className={`relative overflow-hidden border-emerald-300/35 bg-[#17231D] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${PLAN_CARD}`}>
      <div className="absolute inset-x-0 top-0 h-1.5 bg-emerald-950/80">
        <div className="h-full bg-emerald-400/75 transition-all" style={{ width: `${trial.progress}%` }} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(74,222,128,0.14),transparent_42%)]" aria-hidden />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-lg font-bold tracking-tight text-white ${LANDING_FONT}`}>Free Trial</h3>
          <p className="mt-1 text-xs leading-5 text-emerald-100/80">Try the Basic plan before the first billing cycle.</p>
        </div>
        <span className={`rounded-full border border-emerald-200/45 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100 ${LANDING_FONT}`}>Free</span>
      </div>

      <div className="relative mt-5">
        <span className={`text-[34px] font-bold leading-none tracking-tight text-white ${LANDING_FONT}`}>$0</span>
        <span className="ml-1 text-xs font-bold text-emerald-100/80">for {TRIAL_DAYS} days</span>
        <p className={`mt-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-200 ${LANDING_FONT}`}>{trial.label}</p>
      </div>

      <div className="relative mt-6">
        <FeatureList rows={features} tone="trial" />
      </div>

      <form action="/api/billing/checkout" method="post" className="relative mt-auto pt-7">
        <input type="hidden" name="planKey" value="basic" />
        <button className={PRIMARY_BUTTON}>
          Start free trial
        </button>
      </form>
    </article>
  );
}

function ManageSubscription({
  entitlement,
  trialEndsAt,
  subscriptionCurrentPeriodEnd,
  stripeCustomerId,
}: Pick<AccountPageContentProps, "entitlement" | "trialEndsAt" | "subscriptionCurrentPeriodEnd" | "stripeCustomerId">) {
  const disabled = !stripeCustomerId;

  return (
    <section className="mt-14">
      <SectionTitle>Manage Subscription</SectionTitle>
      <div className={`mt-5 grid w-full min-w-0 gap-4 overflow-hidden p-4 min-[380px]:p-5 md:grid-cols-[1fr_auto] md:items-center ${CARD_BASE} border-[#2D3340]`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className={`text-lg font-bold tracking-tight text-white ${LANDING_FONT}`}>{entitlement.planLabel}</p>
            <span className={`inline-flex w-fit border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${LANDING_FONT} ${statusTone(entitlement.statusLabel)}`}>
              {entitlement.statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#AEB8D8]">{entitlement.message}</p>
          <p className="mt-1 text-xs leading-5 text-[#858CA2]">
            Trial ends: {formatDate(trialEndsAt)} · Renews/ends: {formatDate(subscriptionCurrentPeriodEnd)}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row md:justify-end">
          {["Manage subscription", "Update payment"].map(label => (
            <form key={label} action="/api/billing/portal" method="post" className="min-w-0">
              <button
                className={`h-11 w-full min-w-0 rounded-md px-3 text-sm font-bold transition disabled:cursor-not-allowed sm:w-auto sm:px-5 ${LANDING_FONT} ${
                  label === "Manage subscription"
                    ? "bg-white text-[#101114] hover:bg-[#F4D38A] disabled:bg-[#2A2D35] disabled:text-[#858CA2]"
                    : "border border-[#3B4250] text-[#D7DBE8] hover:border-[#D1B873] hover:text-[#F4D38A] disabled:opacity-45"
                }`}
                disabled={disabled}
              >
                {label}
              </button>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AccountPageContent({
  billingMessage,
  entitlement,
  activePlanKey,
  trialEndsAt,
  subscriptionCurrentPeriodEnd,
  stripeCustomerId,
  usage,
  plans,
}: AccountPageContentProps) {
  const showFreeTrialCard = entitlement.isInTrial;
  const planGrid = showFreeTrialCard ? "xl:grid xl:grid-cols-4" : "xl:grid xl:grid-cols-3";

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col overflow-hidden px-3 pb-16 min-[380px]:px-4 md:px-6">
      {billingMessage && (
        <div className="mb-8 border border-[#D1B873]/30 bg-[#2c2412] px-4 py-3 text-sm font-semibold text-[#F4D38A]">
          {billingMessage}
        </div>
      )}

      <section className="pt-14 md:pt-20">
        <SectionTitle>Usage</SectionTitle>
        <ScrollRail>
          <UsageCard label="Quotes on plan" used={usage[0].used} included={usage[0].included} />
          <UsageCard label="VVS Studio" used={usage[1].used} included={usage[1].included} />
        </ScrollRail>
      </section>

      <section className="mt-14">
        <SectionTitle>Plans</SectionTitle>
        <ScrollRail desktopGridClass={planGrid}>
          {showFreeTrialCard && <FreeTrialCard trialEndsAt={trialEndsAt} />}
          {plans.map(plan => (
            <PlanCard key={plan.key} plan={plan} isCurrent={activePlanKey === plan.key} />
          ))}
        </ScrollRail>
      </section>

      <ManageSubscription
        entitlement={entitlement}
        trialEndsAt={trialEndsAt}
        subscriptionCurrentPeriodEnd={subscriptionCurrentPeriodEnd}
        stripeCustomerId={stripeCustomerId}
      />
    </div>
  );
}
