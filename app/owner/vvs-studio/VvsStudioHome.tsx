"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MobileOwnerNav from "../MobileOwnerNav";

type GenerateOption = {
  title: string;
  sub: string;
  href: string;
  icon: "hex" | "spark" | "circle";
};

const generateOptions: GenerateOption[] = [
  { title: "Product Video", sub: "Motion reel", href: "/owner/vvs-studio/video", icon: "hex" },
  { title: "Multi Image", sub: "Studio still", href: "/owner/vvs-studio/image", icon: "spark" },
  { title: "AI UGC Video", sub: "Creator style", href: "/owner/vvs-studio/ugc", icon: "circle" },
];

type GeneratedPost = {
  id: string;
  sourceType: "vvs_video" | "vvs_image";
  shootId: string;
  kind: string;
  title: string;
  mediaUrl: string | null;
  images: Array<{ id: string; url: string }>;
  caption: string;
  ratio: string;
  createdAt: string;
  inputs: {
    pieceType: string | null;
    visualStyle: string | null;
    aspectRatio: string | null;
    metalType: string | null;
    goldColor: string | null;
    engravingText: string | null;
    priceLabel: string | null;
    stoneSetting: string | null;
  };
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

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1d1d24] to-[#151519] p-4 shadow-[0_18px_60px_rgba(0,0,0,.26)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xl font-bold text-[#65d98a]">{completedCount} posts generated</p>
        <p className="text-xl font-bold text-[#ff6158]">{Math.max(0, plannedDays.length - completedCount)} more to go</p>
      </div>
      <div className="flex items-center justify-center gap-5 text-sm font-semibold text-[#eaeaf0]">
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

function displayValue(value: string | null) {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "Not specified";
}

function PostDialog({
  post,
  onClose,
  onUpdate,
}: {
  post: GeneratedPost;
  onClose: () => void;
  onUpdate: (post: GeneratedPost) => void;
}) {
  const [caption, setCaption] = useState(post.caption);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [savingCaption, setSavingCaption] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function persistCaption(value: string) {
    if (value === post.caption) return;
    setSavingCaption(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/vvs-studio/shoots/${post.shootId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to save caption.");
      onUpdate({ ...post, caption: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save caption.");
    } finally {
      setSavingCaption(false);
    }
  }

  function autoGenerateCaption() {
    const subject = post.inputs.engravingText || displayValue(post.inputs.pieceType).toLowerCase();
    const material = post.inputs.goldColor || post.inputs.metalType;
    const style = displayValue(post.inputs.visualStyle);
    const nextCaption = `${subject} in ${material ? displayValue(material).toLowerCase() : "fine jewelry"}, photographed in the ${style} studio style. Crafted to stand out from every angle.`.slice(0, 300);
    setCaption(nextCaption);
    void persistCaption(nextCaption);
  }

  async function generateAnotherImage() {
    if (post.images.length >= 2 || generating) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/vvs-studio/shoots/${post.shootId}/start-image-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to start image generation.");
      const jobId = data.jobId as string;

      while (!controller.signal.aborted) {
        await new Promise(resolve => window.setTimeout(resolve, 2500));
        const pollResponse = await fetch(`/api/owner/vvs-studio/shoots/${post.shootId}`, { signal: controller.signal });
        const pollData = await pollResponse.json().catch(() => ({}));
        if (!pollResponse.ok) throw new Error(pollData.error ?? "Failed to check image generation.");
        const job = pollData.jobs?.find((item: { id: string }) => item.id === jobId);
        if (job?.status === "failed") throw new Error(job.error ?? "Image generation failed.");
        const pipelineImages = (pollData.imageGenerations ?? [])
          .filter((item: { stage: string; status: string; imageUrl?: string }) => item.status === "succeeded" && item.imageUrl && (item.stage === "image_hero_shot" || item.stage === "image_macro_shot"))
          .sort((a: { stage: string }, b: { stage: string }) => a.stage === "image_hero_shot" ? -1 : b.stage === "image_hero_shot" ? 1 : 0)
          .map((item: { id: string; imageUrl: string }) => ({ id: item.id, url: item.imageUrl }));
        if (pipelineImages.length) {
          const updated = { ...post, images: pipelineImages.slice(0, 2) };
          onUpdate(updated);
          setSelectedImageIndex(updated.images.length - 1);
        }
        if (job?.status === "succeeded") break;
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
    }
  }

  function saveImages() {
    post.images.forEach((image, index) => {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `vvs-studio-post-${post.id}-image-${index + 1}.png`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Studio product post" className="fixed inset-0 z-[80] overflow-y-auto bg-[#0d0d10]/95 backdrop-blur-md">
      <div className="mx-auto min-h-dvh w-full max-w-[760px] bg-[#151519] px-5 pb-8 pt-5 text-[#eaeaf0] sm:my-6 sm:min-h-0 sm:rounded-3xl sm:border sm:border-white/10 sm:px-7 sm:shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4a853]">Generated post</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Studio product photos</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close post editor" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-xl text-[#b4b4bd] transition hover:border-[#d4a853] hover:text-[#d4a853]">×</button>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
          {post.images.map((image, index) => {
            const active = selectedImageIndex === index;
            return (
              <button key={image.id} type="button" onClick={() => setSelectedImageIndex(index)} aria-label={`Select image ${index + 1}`} className={`relative aspect-[4/5] flex-[0_0_82%] snap-start overflow-hidden rounded-2xl border-2 bg-black sm:basis-[48%] ${active ? "border-[#d4a853]" : "border-white/10"}`}>
                <img src={image.url} alt={`${post.title} image ${index + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full border border-[#d4a853]/70 bg-black/75 px-3 py-1 text-xs font-bold text-[#f2c55f]">{index + 1} of {post.images.length}</span>
              </button>
            );
          })}
          {post.images.length < 2 ? (
            <button type="button" onClick={() => void generateAnotherImage()} disabled={generating} className="flex aspect-[4/5] flex-[0_0_82%] snap-start flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d4a853]/45 bg-[#1c1c22] px-8 text-center text-[#d4a853] disabled:cursor-wait disabled:opacity-70 sm:basis-[48%]">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full border border-[#d4a853] text-3xl ${generating ? "animate-pulse" : ""}`}>{generating ? "·" : "+"}</span>
              <span className="text-base font-bold">{generating ? `Generating image ${post.images.length + 1}…` : `Generate image ${post.images.length + 1}`}</span>
              <span className="text-xs leading-5 text-[#85858f]">Each post contains a hero shot and a detail shot.</span>
            </button>
          ) : null}
        </div>

        <section className="mt-4 rounded-2xl border border-white/10 bg-[#1d1d23] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="post-caption" className="text-xs font-bold uppercase tracking-[0.12em] text-[#b8b8c0]">Caption</label>
            <button type="button" onClick={autoGenerateCaption} className="rounded-lg border border-[#d4a853]/55 bg-[#d4a853]/10 px-3 py-2 text-xs font-bold text-[#e3b958]">✦ Auto-generate</button>
          </div>
          <textarea id="post-caption" value={caption} maxLength={300} onChange={event => setCaption(event.target.value)} onBlur={() => void persistCaption(caption)} placeholder="Write a caption for this post…" className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#111116] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[#d4a853]" />
          <div className="mt-2 flex items-center justify-between text-xs text-[#6f7079]">
            <span>{savingCaption ? "Saving…" : caption === post.caption ? "Saved" : "Changes save when you leave the field"}</span>
            <span>{caption.length} / 300</span>
          </div>
        </section>

        {error ? <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={saveImages} className="h-12 rounded-xl border border-[#d4a853] text-sm font-bold text-[#d4a853]">{post.images.length === 1 ? "Save image" : `Save ${post.images.length} images`}</button>
          {post.images.length < 2 ? <button type="button" onClick={() => void generateAnotherImage()} disabled={generating} className="h-12 rounded-xl bg-[#d4a853] text-sm font-extrabold text-black disabled:opacity-60">{generating ? "Generating…" : "Generate second image"}</button> : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function GeneratedPosts({ posts }: { posts: GeneratedPost[] }) {
  const [currentPosts, setCurrentPosts] = useState(posts);
  const [showAll, setShowAll] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const selectedPost = currentPosts.find(post => post.id === selectedPostId) ?? null;
  const hasOverflow = currentPosts.length > 2;
  const visiblePosts = showAll ? currentPosts : currentPosts.slice(0, 2);

  useEffect(() => {
    if (!selectedPost) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPostId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPost]);

  if (!currentPosts.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Generated Posts</h2>
        {hasOverflow ? (
          <button type="button" onClick={() => setShowAll(value => !value)} className="text-sm font-semibold text-[#d4a853]">
            {showAll ? "Show less" : "View all"}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {visiblePosts.map(post => (
          <button
            key={post.id}
            type="button"
            onClick={() => setSelectedPostId(post.id)}
            aria-label={`View ${post.title}`}
            className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#181922] text-left transition hover:border-[#d4a853]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a853] ${post.ratio === "9:16" ? "aspect-[9/16]" : "aspect-[4/3]"}`}
          >
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(135deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:18px_18px]" />
            {post.sourceType === "vvs_image" && post.mediaUrl && <img src={post.mediaUrl} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />}
            {post.sourceType === "vvs_video" && post.mediaUrl && <video src={post.mediaUrl} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />}
            <span className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-[#d4a853]">{post.kind} / {post.ratio}</span>
            <span className="absolute right-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-[#d9d9df]">
              {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(post.createdAt))}
            </span>
          </button>
        ))}
      </div>

      {selectedPost?.sourceType === "vvs_image" ? (
        <PostDialog
          post={selectedPost}
          onClose={() => setSelectedPostId(null)}
          onUpdate={updated => setCurrentPosts(current => current.map(post => post.id === updated.id ? updated : post))}
        />
      ) : selectedPost ? (
        <div role="dialog" aria-modal="true" aria-label={selectedPost.title} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#141419] p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-white">{selectedPost.title}</h3><button type="button" onClick={() => setSelectedPostId(null)} aria-label="Close media viewer" className="h-9 w-9 rounded-full border border-white/15 text-white">×</button></div>
            {selectedPost.mediaUrl ? <video src={selectedPost.mediaUrl} controls autoPlay playsInline className="max-h-[75dvh] w-full bg-black object-contain" /> : <p className="py-20 text-center text-[#85858f]">Media is unavailable.</p>}
          </div>
        </div>
      ) : null}
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
