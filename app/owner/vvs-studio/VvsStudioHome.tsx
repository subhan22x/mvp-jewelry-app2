"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import MobileOwnerNav from "../MobileOwnerNav";

type GenerateOption = {
  title: string;
  sub: string;
  href: string;
  icon: "hex" | "spark" | "circle";
};

const generateOptions: GenerateOption[] = [
  { title: "Product Video", sub: "Motion reel", href: "/owner/vvs-studio/video", icon: "hex" },
  { title: "Showcase Post", sub: "Studio still", href: "/owner/vvs-studio/image", icon: "spark" },
  { title: "AI UGC Video", sub: "Creator style", href: "/owner/vvs-studio/ugc", icon: "circle" },
];

type GeneratedPost = {
  id: string;
  sourceType: "vvs_video" | "vvs_image";
  sourceId: string;
  kind: string;
  title: string;
  mediaUrl: string | null;
  ratio: string;
  createdAt: string;
};

function monthName(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function buildCadenceDates(today: Date, postsPerMonth: number) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = Math.max(1, today.getDate());
  const remainingDays = daysInMonth - startDay + 1;
  const slots = Math.min(postsPerMonth, remainingDays);

  return Array.from({ length: slots }, (_, index) => {
    const offset = Math.round((index * Math.max(0, remainingDays - 1)) / Math.max(1, slots - 1));
    return startDay + offset;
  });
}

function VvsHeader() {
  return (
    <header className="grid grid-cols-[44px_1fr_80px] items-center gap-3 px-5 pt-6">
      <MobileOwnerNav active="Studio" />
      <Link href="/owner/vvs-studio" className="flex justify-center">
        <Image src="/vvs-studio/logo.png" alt="VVS Studio" width={126} height={42} className="h-9 w-auto object-contain" priority />
      </Link>
      <div className="flex items-center justify-end gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-[#f6c768]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#1e1e24] text-sm font-semibold text-[#d1b873]">CJ</span>
      </div>
    </header>
  );
}

function CalendarCard({ postsPerMonth, generatedCount }: { postsPerMonth: number; generatedCount: number }) {
  const today = useMemo(() => new Date(), []);
  const plannedDays = buildCadenceDates(today, postsPerMonth);
  const completedCount = Math.min(generatedCount, plannedDays.length);
  const completedDays = new Set(plannedDays.slice(0, completedCount));
  const reminderDays = new Set(plannedDays.slice(completedCount));
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1d1d24] to-[#151519] p-4 shadow-[0_18px_60px_rgba(0,0,0,.26)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xl font-bold text-[#65d98a]">{completedCount} posts generated</p>
        <p className="text-xl font-bold text-[#ff6158]">{Math.max(0, plannedDays.length - completedCount)} more to go</p>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-[#6f7079]">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`} className="pb-1 font-semibold">{day}</span>
        ))}
        {cells.map((day, index) => {
          const isToday = day === today.getDate();
          const isCompleted = day !== null && completedDays.has(day);
          const isReminder = day !== null && reminderDays.has(day);
          return (
            <span key={index} className="relative flex h-7 items-center justify-center">
              {day && (
                <span className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                  isToday ? "bg-[#d4a853] font-bold text-black" : "text-[#85858f]"
                }`}>
                  {day}
                </span>
              )}
              {isCompleted && <span className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-[#f6c768]" />}
              {isReminder && <span className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-[#f6c768]/35" />}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-5 text-lg font-semibold text-[#eaeaf0]">
        <span className="text-[#d4a853]">&lt;</span>
        <span>{monthName(today)}</span>
        <span className="text-[#d4a853]">&gt;</span>
      </div>
    </section>
  );
}

function IconMark({ icon }: { icon: GenerateOption["icon"] }) {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 text-[#d4a853]" aria-hidden="true">
      {icon === "hex" && <path d="m32 7 21 12v26L32 57 11 45V19L32 7Z" fill="none" stroke="currentColor" strokeWidth="3" />}
      {icon === "spark" && <path d="M32 7c5 13 12 20 25 25-13 5-20 12-25 25-5-13-12-20-25-25 13-5 20-12 25-25Z" fill="currentColor" />}
      {icon === "circle" && <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="5" />}
    </svg>
  );
}

function GenerateCard({ option }: { option: GenerateOption }) {
  return (
    <Link href={option.href} className="group overflow-hidden rounded-2xl border border-[#5a4723] bg-[#111116] transition hover:-translate-y-0.5 hover:border-[#d4a853]">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-[#3a311d] via-[#25221c] to-[#111116]">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:16px_16px]" />
        <IconMark icon={option.icon} />
      </div>
      <div className="px-3 py-3">
        <h3 className="text-base font-bold text-white">{option.title}</h3>
        <p className="mt-0.5 text-xs text-[#85858f]">{option.sub}</p>
      </div>
    </Link>
  );
}

function GeneratedPosts({ posts }: { posts: GeneratedPost[] }) {
  if (!posts.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Generated Posts</h2>
        <button type="button" className="text-sm font-semibold text-[#d4a853]">View all</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {posts.map(post => (
          <article key={post.id} className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#181922] ${post.ratio === "9:16" ? "aspect-[9/16]" : "aspect-[4/3]"}`}>
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(135deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:18px_18px]" />
            {post.sourceType === "vvs_image" && post.mediaUrl && <img src={post.mediaUrl} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />}
            {post.sourceType === "vvs_video" && post.mediaUrl && <video src={post.mediaUrl} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent" />
            <span className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-[#d4a853]">{post.kind} / {post.ratio}</span>
            <span className="absolute right-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-[#d9d9df]">
              {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(post.createdAt))}
            </span>
            <h3 className="absolute bottom-4 left-3 right-3 truncate text-sm font-bold text-white">{post.title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function BottomNav() {
  const items = [
    { label: "Home", href: "/owner/vvs-studio", icon: "H", active: true },
    { label: "Studio", href: "/owner/vvs-studio/generate", icon: "G" },
    { label: "Settings", href: "/owner/settings", icon: "S" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#1e1e24]/95 px-5 py-3 backdrop-blur lg:left-72">
      <div className="mx-auto grid max-w-[430px] grid-cols-3">
        {items.map(item => (
          <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 text-xs font-semibold ${item.active ? "text-[#d4a853]" : "text-[#666873]"}`}>
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function FloatingGenerate() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-5 z-40 lg:right-8">
      {open && (
        <div className="absolute bottom-20 left-0 w-56 rounded-2xl border border-white/10 bg-[#101114] p-2 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
          {generateOptions.map(option => (
            <Link key={option.title} href={option.href} className="block rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">
              {option.title}
              <span className="mt-0.5 block text-xs font-normal text-[#85858f]">{option.sub}</span>
            </Link>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label="Open generate menu"
        onClick={() => setOpen(value => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-black/30 bg-[#d4a853] text-3xl font-black text-black shadow-[0_12px_32px_rgba(0,0,0,.45)]"
      >
        +
      </button>
    </div>
  );
}

export default function VvsStudioHome({
  postsPerMonth,
  generatedPosts,
}: {
  postsPerMonth: number;
  generatedPosts: GeneratedPost[];
}) {
  return (
    <div className="min-h-dvh bg-[#16161a] pb-28 text-[#eaeaf0] lg:min-h-screen">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap");
        .vvs-studio-home {
          font-family: "Figtree", sans-serif;
        }
      `}</style>
      <div className="vvs-studio-home mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5">
        <VvsHeader />
        <CalendarCard postsPerMonth={postsPerMonth} generatedCount={generatedPosts.length} />
        <section>
          <h1 className="mb-4 text-2xl font-bold text-white">Generate</h1>
          <div className="grid grid-cols-3 gap-3">
            {generateOptions.map(option => <GenerateCard key={option.title} option={option} />)}
          </div>
        </section>
        <GeneratedPosts posts={generatedPosts} />
      </div>
      <FloatingGenerate />
      <BottomNav />
    </div>
  );
}
