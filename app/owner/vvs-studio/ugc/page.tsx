import Link from "next/link";
import Image from "next/image";
import OwnerFrame from "../../OwnerFrame";
import MobileOwnerNav from "../../MobileOwnerNav";

export const dynamic = "force-dynamic";

export default function VvsUgcComingSoonPage() {
  return (
    <OwnerFrame active="Studio" hideHeader>
      <main className="min-h-dvh bg-[#16161a] px-5 pb-24 pt-6 text-[#eaeaf0]">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[480px] flex-col gap-7">
          <header className="grid grid-cols-[44px_1fr_44px] items-center">
            <MobileOwnerNav active="Studio" />
            <Link href="/owner/vvs-studio" className="flex justify-center">
              <Image src="/vvs-studio/logo.png" alt="VVS Studio" width={126} height={42} className="h-9 w-auto object-contain" priority />
            </Link>
            <span />
          </header>

          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-full border border-[#d4a853]/30 bg-[#d4a853]/10 text-[#d4a853]">
              <svg aria-hidden="true" viewBox="0 0 64 64" className="h-11 w-11">
                <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="5" />
              </svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d4a853]">AI UGC Video</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Coming soon</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#9c9da6]">
              Creator-style video generation will live here once the product video and showcase post flows are stable.
            </p>
            <Link href="/owner/vvs-studio" className="mt-8 rounded-full border border-[#d4a853]/40 px-6 py-3 text-sm font-bold text-[#d4a853]">
              Back to VVS Studio
            </Link>
          </section>
        </div>
      </main>
    </OwnerFrame>
  );
}
