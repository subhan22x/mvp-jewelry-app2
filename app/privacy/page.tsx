import Link from "next/link";

const updatedAt = "June 3, 2026";

export const metadata = {
  title: "Privacy Policy | Flawless",
  description: "Privacy policy for Flawless jewelry design software."
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#080706] px-5 py-10 text-[#eee7dc]">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-[#171410] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
        <Link href="/" className="text-sm font-bold text-[#D3A84F]">← Back to Flawless</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#D3A84F]">Privacy Policy</p>
        <h1 className="mt-3 text-4xl font-black text-white">How we handle data</h1>
        <p className="mt-2 text-sm text-[#9E9589]">Last updated: {updatedAt}</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[#cfc6ba]">
          <section>
            <h2 className="text-xl font-black text-white">What Flawless does</h2>
            <p className="mt-2">
              Flawless provides jewelry design and storefront software for jewelers. Store owners can create a public profile, collect quote requests, generate design previews, manage collections, and create studio-style visual assets.
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
            <h2 className="text-xl font-black text-white">SMS and account verification</h2>
            <p className="mt-2">
              If SMS login or signup is enabled, we use your phone number to send one-time verification codes and account security messages. Message frequency varies. Message and data rates may apply. You can opt out by replying STOP, but opting out may prevent SMS-based login. Reply HELP for help where supported.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white">Service providers</h2>
            <p className="mt-2">
              We use third-party service providers to host the app, store media, manage authentication, process databases, send verification messages, generate images or videos, and monitor product performance. These providers may process information only as needed to provide their services to us.
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
              Questions about this policy can be sent to <a className="font-bold text-[#D3A84F]" href="mailto:hello@getflawless.design">hello@getflawless.design</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
