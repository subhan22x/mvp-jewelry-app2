import Link from "next/link";
import Image from "next/image";
import OwnerFrame from "../../OwnerFrame";
import MobileOwnerNav from "../../MobileOwnerNav";

export const dynamic = "force-dynamic";

const options = [
  { title: "Product Video", sub: "Generate a motion reel from a pendant photo.", href: "/owner/vvs-studio/video" },
  { title: "Showcase Post", sub: "Generate studio stills for Instagram posts.", href: "/owner/vvs-studio/image" },
  { title: "AI UGC Video", sub: "Creator-style content is coming soon.", href: "/owner/vvs-studio/ugc" },
];

export default function VvsGeneratePage() {
  return (
    <OwnerFrame active="Studio" hideHeader>
      <main className="min-h-dvh bg-[#16161a] px-5 pb-24 pt-6 text-[#eaeaf0]">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-7">
          <header className="grid grid-cols-[44px_1fr_44px] items-center">
            <MobileOwnerNav active="Studio" />
            <Link href="/owner/vvs-studio" className="flex justify-center">
              <Image src="/vvs-studio/logo.png" alt="VVS Studio" width={126} height={42} className="h-9 w-auto object-contain" priority />
            </Link>
            <span />
          </header>

          <section>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d4a853]">Generate</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Choose content type</h1>
          </section>

          <section className="grid gap-3">
            {options.map(option => (
              <Link
                key={option.title}
                href={option.href}
                className="rounded-2xl border border-[#5a4723] bg-gradient-to-br from-[#242119] to-[#111116] p-5 transition hover:border-[#d4a853]"
              >
                <h2 className="text-xl font-bold text-white">{option.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#9c9da6]">{option.sub}</p>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </OwnerFrame>
  );
}
