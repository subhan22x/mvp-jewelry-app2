import Link from "next/link";
import { SMS_CONSENT_TEXT } from "@/src/lib/sms-consent";

export const metadata = {
  title: "SMS Consent | Grow Jewelry",
  description: "How Grow Jewelry store-account users opt in to operational SMS notifications.",
  alternates: { canonical: "https://growjewelry.io/sms-consent" }
};

function ConsentPreview({ location }: { location: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0e0c0a] p-5" aria-label={`${location} SMS consent example`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D3A84F]">{location}</p>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#d8d0c5]">
        <span className="mt-1 size-5 shrink-0 rounded border border-[#8f877c] bg-transparent" aria-hidden="true" />
        <span>{SMS_CONSENT_TEXT}</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-[#D3A84F]">
        <Link href="/terms">Terms and Conditions</Link>
        <Link href="/privacy">Privacy Policy</Link>
      </div>
      <p className="mt-3 text-xs text-[#9E9589]">The checkbox starts unchecked. The user may continue without selecting it.</p>
    </div>
  );
}

export default function SmsConsentPage() {
  return (
    <main className="min-h-dvh bg-[#080706] px-5 py-10 text-[#eee7dc]">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-[#171410] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
        <Link href="/" className="text-sm font-bold text-[#D3A84F]">← Back to Grow Jewelry</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#D3A84F]">SMS consent disclosure</p>
        <h1 className="mt-3 text-4xl font-black text-white">How users opt in to text alerts</h1>
        <p className="mt-3 text-sm leading-7 text-[#cfc6ba]">
          This public page documents every enrollment path for Grow Jewelry&apos;s operational SMS program so users and messaging reviewers can verify that consent is informed, separate, and optional.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-[#cfc6ba]">
          <section>
            <h2 className="text-xl font-black text-white">Who receives messages</h2>
            <p className="mt-2">
              Only Grow Jewelry store-account users who provide a mobile number and actively opt in receive recurring operational alerts. Messages concern the user&apos;s Grow Jewelry account and customer quote requests; this program does not send marketing or promotional messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">1. Public account onboarding</h2>
            <p className="mt-2">
              A store owner visits <Link className="font-bold text-[#D3A84F]" href="/onboarding">growjewelry.io/onboarding</Link>, enters a mobile number, and may select the separate SMS consent checkbox shown below. The checkbox is unchecked by default. The user can create an account without selecting it.
            </p>
            <ConsentPreview location="Onboarding" />
          </section>

          <section>
            <h2 className="text-xl font-black text-white">2. Protected account Settings</h2>
            <p className="mt-2">
              A signed-in store owner may later visit <span className="font-bold text-white">Account Settings → SMS notifications</span>, enter or confirm a mobile number, and select the same separate consent checkbox. The checkbox is unchecked when consent has not been recorded. The user may save other settings without enabling SMS notifications.
            </p>
            <ConsentPreview location="Account Settings" />
          </section>

          <section>
            <h2 className="text-xl font-black text-white">What happens after enrollment</h2>
            <p className="mt-2">
              Message frequency varies with account and quote activity. Message and data rates may apply. Users can reply STOP to opt out or HELP for help, or disable SMS notifications in Settings. An opt-out prevents additional recurring operational alerts unless the user later opts in again.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Privacy and support</h2>
            <p className="mt-2">
              Mobile numbers and SMS consent data are not sold or shared with third parties or affiliates for marketing or promotional purposes. They are provided to service providers only as needed to deliver and support the messaging service. Read the <Link className="font-bold text-[#D3A84F]" href="/privacy">Privacy Policy</Link> and <Link className="font-bold text-[#D3A84F]" href="/terms">Terms and Conditions</Link>, or contact <a className="font-bold text-[#D3A84F]" href="mailto:support@growjewelry.io">support@growjewelry.io</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
