import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";

export const dynamic = "force-dynamic";

export default function OwnerReviewsPage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;

  return (
    <OwnerFrame active="Reviews">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Reviews</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Collect, review, and publish customer testimonials.</p>
        </section>
        <div className="rounded-xl border border-white/5 bg-[#17191F] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Scaffold</p>
          <h2 className="mt-3 text-2xl font-bold">Reviews are not wired yet.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8c909f]">This page will manage review requests, moderation, star ratings, and public profile display.</p>
        </div>
      </div>
    </OwnerFrame>
  );
}
