import Link from "next/link";

const updatedAt = "September 3, 2026";

export const metadata = {
  title: "Privacy Policy | Grow Jewelry",
  description: "Privacy policy for Grow Jewelry software.",
  alternates: { canonical: "https://growjewelry.io/privacy" }
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#080706] px-5 py-10 text-[#eee7dc]">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-[#171410] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
        <Link href="/" className="text-sm font-bold text-[#D3A84F]">← Back to Grow Jewelry</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#D3A84F]">Privacy Policy</p>
        <h1 className="mt-3 text-4xl font-black text-white">How we handle data</h1>
        <p className="mt-2 text-sm text-[#9E9589]">Last updated: {updatedAt}</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[#cfc6ba]">
          <section>
            <h2 className="text-xl font-black text-white">What Grow Jewelry does</h2>
            <p className="mt-2">
              Grow Jewelry provides jewelry design and storefront software for jewelers. Store owners can create a public profile, collect quote requests, generate design previews, manage collections, and create studio-style visual assets.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Information we collect</h2>
            <p className="mt-2">
              We collect information you provide when you create an account or use the service, including your name, email address, phone number, business name, store profile details, address or location details, uploaded images, product details, quote requests, review content, and messages or notes you submit.
            </p>
            <p className="mt-2">
              If you sign in with Google, Apple, email, or SMS verification, we receive account authentication information from our authentication provider, such as your email address, phone number, and provider user ID.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">How we use information</h2>
            <p className="mt-2">
              We use information to create and secure accounts, operate public store profiles, process quote and review submissions, generate jewelry previews and videos, provide customer support, improve the product, prevent abuse, and send service-related messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">SMS verification and operational alerts</h2>
            <p className="mt-2">
              When you request phone verification, we may use your mobile number to send a one-time code or account-security message. Separately, store-account users may choose to receive recurring operational text messages about their account and customer quote requests. We send these alerts only after the user provides the mobile number and actively opts in through an unchecked, optional consent control.
            </p>
            <p className="mt-2">
              Message frequency varies with account and quote activity. Message and data rates may apply. Reply STOP to opt out of recurring operational alerts or HELP for help. SMS-alert consent is optional, is not a condition of creating an account or using Grow Jewelry, and can also be withdrawn in account Settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Mobile-information sharing</h2>
            <p className="mt-2">
              We do not sell or share mobile phone numbers, SMS consent records, or SMS opt-in data with third parties or affiliates for marketing or promotional purposes. We may provide this information to service providers only as needed to deliver and support the messaging service, prevent abuse, or comply with law. Those providers may use it only to perform services for us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Service providers</h2>
            <p className="mt-2">
              We use third-party service providers to host the app, store media, manage authentication, process databases, deliver verification and operational messages, generate images or videos, and monitor product performance. These providers may process information only as needed to provide their services to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Public content</h2>
            <p className="mt-2">
              Store profile information, product collections, public links, reviews approved for display, and other storefront content may be visible to visitors on public profile pages. Do not publish information you do not want made public.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Data retention and choices</h2>
            <p className="mt-2">
              We keep information while your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements. You may request access, correction, or deletion of your account information by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Security</h2>
            <p className="mt-2">
              We use reasonable technical and organizational safeguards to protect information. No internet service is completely secure, so we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Contact</h2>
            <p className="mt-2">
              Questions about this policy or the SMS program can be sent to <a className="font-bold text-[#D3A84F]" href="mailto:support@growjewelry.io">support@growjewelry.io</a>. See the public <Link className="font-bold text-[#D3A84F]" href="/sms-consent">SMS consent disclosure</Link> for details about enrollment.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
