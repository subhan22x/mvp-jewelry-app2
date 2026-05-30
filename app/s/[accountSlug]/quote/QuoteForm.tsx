"use client";

import { useMemo, useState } from "react";

type QuoteFormProps = {
  accountSlug: string;
  storeName: string;
};

export default function QuoteForm({ accountSlug, storeName }: QuoteFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file) })), [files]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    files.forEach(file => form.append("images", file));

    const response = await fetch(`/api/storefront/${accountSlug}/quote`, {
      method: "POST",
      body: form
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setError(json.error ?? "Unable to send quote request.");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="rounded-[2rem] border border-[#3E3527] bg-[#1C1915] p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D3A84F]">Request sent</p>
        <h1 className="mt-4 text-3xl font-black text-[#F5F0E8]">You&apos;re in the queue.</h1>
        <p className="mt-3 text-sm leading-6 text-[#9E9589]">{storeName} has your photos and contact details.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-bold text-[#F5F0E8]">Reference photos</label>
        <label className="mt-2 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#4A3C2C] bg-[#191714] px-5 text-center text-[#9E9589] hover:border-[#D3A84F]">
          <span className="text-3xl text-[#D3A84F]">+</span>
          <span className="mt-2 text-sm font-bold text-[#F5F0E8]">Upload inspiration</span>
          <span className="mt-1 text-xs">Up to 6 images</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={event => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
          />
        </label>
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previews.map(({ file, url }) => (
              <img key={`${file.name}-${file.size}`} src={url} alt="" className="aspect-square rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-[#F5F0E8]">
          Name
          <input name="name" required className="h-14 rounded-2xl border border-[#342E26] bg-[#12110F] px-4 text-base outline-none focus:border-[#D3A84F]" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#F5F0E8]">
          Phone
          <input name="phone" required className="h-14 rounded-2xl border border-[#342E26] bg-[#12110F] px-4 text-base outline-none focus:border-[#D3A84F]" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#F5F0E8]">
          Email
          <input name="email" type="email" className="h-14 rounded-2xl border border-[#342E26] bg-[#12110F] px-4 text-base outline-none focus:border-[#D3A84F]" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#F5F0E8]">
          Notes
          <textarea name="notes" rows={4} className="rounded-2xl border border-[#342E26] bg-[#12110F] px-4 py-3 text-base outline-none focus:border-[#D3A84F]" />
        </label>
      </div>

      {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <button
        disabled={status === "submitting"}
        className="h-14 w-full rounded-2xl bg-[#D3A84F] text-sm font-black text-black disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : "Send quote request"}
      </button>
    </form>
  );
}
