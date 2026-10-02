import Link from "next/link";

const updatedAt = "September 3, 2026";

export const metadata = {
  title: "Terms and Conditions | Grow Jewelry",
  description: "Terms and conditions for Grow Jewelry software.",
  alternates: { canonical: "https://growjewelry.io/terms" }
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-[#080706] px-5 py-10 text-[#eee7dc]">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-[#171410] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
        <Link href="/" className="text-sm font-bold text-[#D3A84F]">← Back to Grow Jewelry</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#D3A84F]">Terms and Conditions</p>
        <h1 className="mt-3 text-4xl font-black text-white">Using Grow Jewelry</h1>
        <p className="mt-2 text-sm text-[#9E9589]">Last updated: {updatedAt}</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[#cfc6ba]">
          <section>
            <h2 className="text-xl font-black text-white">Service overview</h2>
            <p className="mt-2">
              Grow Jewelry is software for jewelers to create public profiles, collect quote requests, manage collections, generate jewelry design previews, and create studio-style visual assets. The service is provided for business and professional use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Accounts</h2>
            <p className="mt-2">
              You are responsible for the accuracy of your account information and for activity under your login. You must keep your login credentials secure and notify us if you believe your account has been compromised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Your content</h2>
            <p className="mt-2">
              You are responsible for store profile content, uploaded images, product information, customer communications, reviews, and quote details submitted through your account. You grant Grow Jewelry permission to host, process, display, and transform that content as needed to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Generated designs</h2>
            <p className="mt-2">
              AI-generated images, videos, prompts, and previews are design aids. They may be inaccurate, incomplete, or unsuitable for manufacturing without human review. Jewelers are responsible for confirming dimensions, materials, pricing, feasibility, and customer approvals before production.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Grow Jewelry SMS program</h2>
            <p className="mt-2">
              Store-account users may optionally enroll to receive recurring operational text messages from Grow Jewelry about their account and customer quote requests. Message frequency varies based on account and quote activity. Message and data rates may apply. Reply STOP to opt out or HELP for help. You can also disable these alerts in account Settings.
            </p>
            <p className="mt-2">
              SMS-alert consent is optional and is not a condition of creating an account, purchasing anything, or using Grow Jewelry. Consent is collected separately from acceptance of these Terms and our Privacy Policy. We do not send marketing or promotional messages through this operational-alert program.
            </p>
            <p className="mt-2">
              One-time verification or account-security codes may be sent when you specifically request phone verification. Carrier delivery is not guaranteed. For assistance, email <a className="font-bold text-[#D3A84F]" href="mailto:support@growjewelry.io">support@growjewelry.io</a>. See our <Link className="font-bold text-[#D3A84F]" href="/sms-consent">SMS consent disclosure</Link> and <Link className="font-bold text-[#D3A84F]" href="/privacy">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Customer communications</h2>
            <p className="mt-2">
              If you use messaging, quote sharing, or review-request features to contact your own customers, you are responsible for obtaining any required consent and complying with applicable messaging, privacy, marketing, and consumer-protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Acceptable use</h2>
            <p className="mt-2">
              You may not use Grow Jewelry to violate laws, infringe intellectual property rights, upload harmful code, abuse the service, interfere with other users, send unlawful messages, or publish misleading, offensive, or unauthorized content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Payments and trials</h2>
            <p className="mt-2">
              If paid plans, subscriptions, or trials are offered, pricing, renewal, cancellation, and billing terms will be shown at signup or checkout. You are responsible for any applicable taxes or fees unless stated otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Disclaimers</h2>
            <p className="mt-2">
              The service is provided “as is” and “as available.” We do not guarantee uninterrupted availability, error-free output, increased sales, or that generated content will meet every business, legal, or production requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Grow Jewelry is not liable for indirect, incidental, special, consequential, exemplary, or lost-profit damages arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Changes and contact</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the service after changes means you accept the updated terms. Questions can be sent to <a className="font-bold text-[#D3A84F]" href="mailto:support@growjewelry.io">support@growjewelry.io</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
