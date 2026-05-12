"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const totalSteps = 6;
const accent = "#D3A84F";
const bg = "#151311";
const panel = "#1C1915";
const input = "#11100E";

const serviceOptions = [
  { kind: "quote", title: "Custom Quote Requests", ctaLabel: "Get Quote", description: "Clients fill a form and upload reference photos.", defaultOn: true },
  { kind: "design_custom", title: "Design Custom", ctaLabel: "Design Custom", description: "Let clients design a custom name pendant.", defaultOn: true },
  { kind: "size_guide", title: "Size Guide", ctaLabel: "Size Guide", description: "Placeholder for ordering guidance.", defaultOn: false },
  { kind: "sell_watch", title: "Sell Watch", ctaLabel: "Sell Watch", description: "Placeholder for luxury watch intake.", defaultOn: false },
  { kind: "appointment", title: "Book Appointment", ctaLabel: "Book Appt", description: "Placeholder for calls or in-store visits.", defaultOn: false },
  { kind: "repair", title: "Repair", ctaLabel: "Repair", description: "Placeholder for jewelry restoration.", defaultOn: false },
  { kind: "reviews", title: "Client Reviews", ctaLabel: "Reviews", description: "Placeholder for testimonials.", defaultOn: false }
];

const themeOptions = [
  { key: "ice_blue", title: "Ice Blue", description: "Clean and polished", colors: ["#101923", "#9DD7FF"] },
  { key: "rose_luxe", title: "Rose Luxe", description: "Soft and premium", colors: ["#231617", "#D9A08F"] },
  { key: "graphite_orange", title: "Graphite Orange", description: "Sharp and modern", colors: ["#181818", "#E28B33"] },
  { key: "velvet_blue", title: "Red Navy", description: "Bold and nocturnal", colors: ["#BF092F", "#112442"] }
];

const coverPresets = [
  { key: "dark_gold", title: "Dark gold", description: "Rich and premium", className: "bg-[linear-gradient(135deg,#51300E,#171511_70%)]" },
  { key: "warm_studio", title: "Warm studio", description: "Soft showroom glow", className: "bg-[radial-gradient(circle_at_20%_20%,#8C6124,transparent_38%),linear-gradient(135deg,#2A2118,#161311)]" },
  { key: "ice_luxury", title: "Ice luxury", description: "Cool polished tone", className: "bg-[linear-gradient(135deg,#10202A,#161311_70%)]" },
  { key: "pure_graphite", title: "Pure graphite", description: "Minimal and sharp", className: "bg-[linear-gradient(135deg,#25221D,#11100E)]" }
];

const categories = ["chain", "pendant", "ring", "bracelet", "watch", "grillz", "earrings", "trophy", "other"];
const variantSuggestions = ["10K Gold", "14K Gold", "18K Gold", "Silver", "With chain", "Without chain"];
const countryOptions = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "Saudi Arabia",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Netherlands",
  "Other"
];
const yearOptions = Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, index) => String(new Date().getFullYear() - index));

type ProductDraft = {
  clientId: string;
  image?: File;
  name: string;
  category: string;
  priceMode: "set" | "ask";
  priceLabel: string;
  variantLabels: string[];
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [yearStarted, setYearStarted] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [slug, setSlug] = useState("");
  const [services, setServices] = useState(() => serviceOptions.map(service => ({ ...service, isActive: service.defaultOn })));
  const [coverImage, setCoverImage] = useState<File | undefined>();
  const [profileImage, setProfileImage] = useState<File | undefined>();
  const [coverPreset, setCoverPreset] = useState("dark_gold");
  const [coverOverlayOpacity, setCoverOverlayOpacity] = useState(27);
  const [coverTextColor, setCoverTextColor] = useState<"light" | "dark">("light");
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [themeKey, setThemeKey] = useState("ice_blue");
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const coverPreview = useMemo(() => coverImage ? URL.createObjectURL(coverImage) : null, [coverImage]);
  const profilePreview = useMemo(() => profileImage ? URL.createObjectURL(profileImage) : null, [profileImage]);
  const progress = `${(step / totalSteps) * 100}%`;

  function next() {
    setStep(value => Math.min(totalSteps, value + 1));
  }

  function back() {
    setStep(value => Math.max(1, value - 1));
  }

  function addProduct(file?: File) {
    const nextProduct: ProductDraft = {
      clientId: crypto.randomUUID(),
      image: file,
      name: "",
      category: "pendant",
      priceMode: "ask",
      priceLabel: "",
      variantLabels: []
    };
    setProducts(value => [
      ...value,
      nextProduct
    ].slice(0, 2));
  }

  async function submit() {
    setIsSubmitting(true);
    setError(null);

    const form = new FormData();
    const payload = {
      businessName,
      city,
      country,
      yearStarted,
      instagramHandle,
      slug,
      headline,
      bio: headline,
      phone,
      whatsappPhone,
      themeKey,
      coverPreset,
      coverOverlayOpacity,
      coverTextColor,
      email,
      password,
      services: services.map((service, index) => ({ ...service, sortOrder: index })),
      products: products
        .filter(product => product.name.trim() && product.image)
        .map(product => ({
          clientId: product.clientId,
          name: product.name,
          category: product.category,
          priceMode: product.priceMode,
          priceLabel: product.priceLabel,
          variantLabels: product.variantLabels
        }))
    };

    form.set("payload", JSON.stringify(payload));
    if (coverImage) form.set("coverImage", coverImage);
    if (profileImage) form.set("profileImage", profileImage);
    products.forEach(product => {
      if (product.image) form.set(`productImage:${product.clientId}`, product.image);
    });

    const response = await fetch("/api/onboarding", { method: "POST", body: form });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Unable to publish profile.");
      setIsSubmitting(false);
      return;
    }

    setPublishedUrl(json.profileUrl);
    setIsSubmitting(false);
  }

  if (publishedUrl) {
    return (
      <main className="min-h-screen bg-[#151311] px-5 py-6 text-[#F5F0E8]">
        <div className="mx-auto max-w-[430px]">
          <div className="rounded-[2rem] border border-[#3A3227] bg-[#1C1915] p-6">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D3A84F]">Published</p>
            <h1 className="mt-4 text-4xl font-black">Your page is live.</h1>
            <p className="mt-3 text-[#9E9589]">Put this in your Instagram bio or send it to clients.</p>
            <a href={publishedUrl} className="mt-6 block rounded-2xl bg-[#D3A84F] px-5 py-4 text-center text-sm font-black text-black">
              Open {publishedUrl}
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#151311] text-[#F5F0E8]">
      <div className="mx-auto min-h-screen w-full max-w-[600px] px-5 py-5">
        <header className="mb-9">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={back} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#3A3227] bg-[#1C1915] text-xl">←</button>
            <div className="text-left">
              <p className="text-sm text-[#8D8377]">Step {step} of {totalSteps}</p>
              <p className="text-xs uppercase tracking-[0.34em] text-[#8D8377]">CaratLabs Setup</p>
            </div>
            <span className="text-sm text-[#8D8377]">Fast setup</span>
          </div>
          <div className="h-1 rounded-full bg-[#2A251F]">
            <div className="h-full rounded-full bg-[#D3A84F]" style={{ width: progress }} />
          </div>
        </header>

        {step === 1 && (
          <section className="space-y-7">
            <div>
              <h1 className="text-4xl font-black tracking-normal">Let&apos;s build your profile.</h1>
              <p className="mt-3 text-lg text-[#9E9589]">No account needed yet. Takes under 2 minutes.</p>
            </div>
            <Input label="Business Name" value={businessName} onChange={setBusinessName} placeholder="e.g. Ari The Jeweler" />
            <Input label="City" value={city} onChange={setCity} placeholder="e.g. New York" />
            <SelectInput label="Country" value={country} onChange={setCountry} placeholder="Select country" options={countryOptions} />
            <SelectInput label="Year Started" value={yearStarted} onChange={setYearStarted} placeholder="Est. since" options={yearOptions} />
            <Input label="Instagram Handle" value={instagramHandle} onChange={setInstagramHandle} placeholder="@ yourhandle" hint="Adds an Instagram button on your page" />
            <PrimaryButton onClick={next}>Let&apos;s go →</PrimaryButton>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-7">
            <div>
              <h1 className="text-4xl font-black">Claim your link.</h1>
              <p className="mt-3 text-lg text-[#9E9589]">This becomes your public profile URL.</p>
            </div>
            <Input label="CaratLabs URL" value={slug} onChange={setSlug} placeholder="icekinglondon" hint={`Preview: /s/${slug || "yourname"}`} />
            <div className="grid grid-cols-2 gap-3">
              {themeOptions.map(theme => (
                <button
                  key={theme.key}
                  onClick={() => setThemeKey(theme.key)}
                  className={`rounded-3xl border p-4 text-left ${themeKey === theme.key ? "border-[#D3A84F]" : "border-[#332D25]"}`}
                >
                  <div className="mb-5 flex gap-2">
                    {theme.colors.map(color => <span key={color} className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />)}
                  </div>
                  <p className="font-bold">{theme.title}</p>
                  <p className="mt-1 text-xs text-[#8D8377]">{theme.description}</p>
                </button>
              ))}
            </div>
            <PrimaryButton onClick={next}>Continue →</PrimaryButton>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-4xl font-black">What do you offer?</h1>
              <p className="mt-3 text-lg text-[#9E9589]">Toggle what shows on your page. You can adjust everything later.</p>
            </div>
            <div className="space-y-3">
              {services.map((service, index) => (
                <button
                  key={service.kind}
                  onClick={() => setServices(value => value.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: !item.isActive } : item))}
                  className="flex w-full items-center gap-4 rounded-[1.7rem] border border-[#332D25] bg-[#1C1915] p-4 text-left"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24201A] text-xl text-[#8D8377]">◇</span>
                  <span className="flex-1">
                    <span className="block font-black">{service.title}</span>
                    <span className="mt-1 block text-sm text-[#8D8377]">{service.description}</span>
                  </span>
                  <span className={`h-8 w-14 rounded-full p-1 transition ${service.isActive ? "bg-[#D3A84F]" : "bg-[#2A251F]"}`}>
                    <span className={`block h-6 w-6 rounded-full bg-black transition ${service.isActive ? "translate-x-6" : ""}`} />
                  </span>
                </button>
              ))}
            </div>
            <PrimaryButton onClick={next}>Continue →</PrimaryButton>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h1 className="text-4xl font-black">Make your page yours.</h1>
                <p className="mt-3 text-lg text-[#9E9589]">This is the first thing clients see.</p>
              </div>
              <button className="rounded-full border border-[#332D25] bg-[#1C1915] px-4 py-2 text-sm font-bold">Preview →</button>
            </div>

            <label className="block">
              <div className="mb-2 flex justify-between text-sm font-bold">
                <span>Cover Banner</span><span className="text-[#8D8377]">Skip — use gradient</span>
              </div>
              <div className="relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.7rem] border border-dashed border-[#4A3C2C] bg-[#1C1915] text-center">
                {coverPreview ? <img src={coverPreview} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="text-3xl text-[#D3A84F]">+</span>}
                <span className="relative font-bold">Drag & drop or click to upload</span>
                <span className="relative text-sm text-[#8D8377]">1500 x 500px recommended</span>
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={event => setCoverImage(event.target.files?.[0])} />
            </label>

            <div>
              <p className="mb-3 font-bold">Default gradients</p>
              <div className="grid grid-cols-2 gap-3">
                {coverPresets.map(preset => (
                  <button key={preset.key} onClick={() => setCoverPreset(preset.key)} className={`overflow-hidden rounded-3xl border text-left ${coverPreset === preset.key ? "border-[#D3A84F]" : "border-[#332D25]"}`}>
                    <div className={`h-20 ${preset.className}`} />
                    <div className="p-3">
                      <p className="font-bold">{preset.title}</p>
                      <p className="text-xs text-[#8D8377]">{preset.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-[#332D25] bg-[#1C1915] p-4">
              <div className="mb-3 flex justify-between text-sm"><span>Overlay darkness</span><span>{coverOverlayOpacity}%</span></div>
              <input type="range" min={0} max={85} value={coverOverlayOpacity} onChange={event => setCoverOverlayOpacity(Number(event.target.value))} className="w-full accent-[#D3A84F]" />
              <p className="mt-4 mb-2 text-sm font-bold">Text color</p>
              <div className="grid grid-cols-2 gap-2">
                <Segment active={coverTextColor === "light"} onClick={() => setCoverTextColor("light")}>White text</Segment>
                <Segment active={coverTextColor === "dark"} onClick={() => setCoverTextColor("dark")}>Dark text</Segment>
              </div>
            </div>

            <Input label="Tagline" value={headline} onChange={setHeadline} placeholder="e.g. #1 Custom Jeweler in NYC" maxLength={80} />
            <Input label="Regular phone" value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
            <Input label="WhatsApp phone" value={whatsappPhone} onChange={setWhatsappPhone} placeholder="+44 7000 000000" hint="Used for WhatsApp message buttons." />

            <label className="block">
              <div className="mb-2 flex justify-between text-sm font-bold">
                <span>Profile Photo</span><span className="text-[#8D8377]">Skip — use initials</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#24201A] text-[#8D8377]">
                  {profilePreview ? <img src={profilePreview} alt="" className="h-full w-full object-cover" /> : "200 x 200"}
                </div>
                <span className="text-sm text-[#8D8377]">200 x 200px</span>
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={event => setProfileImage(event.target.files?.[0])} />
            </label>
            <PrimaryButton onClick={next}>Continue →</PrimaryButton>
          </section>
        )}

        {step === 5 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-4xl font-black">Add first pieces.</h1>
              <p className="mt-3 text-lg text-[#9E9589]">Optional. Add up to 2 pieces so the page doesn&apos;t feel empty.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map(index => {
                const product = products[index];
                const preview = product?.image ? URL.createObjectURL(product.image) : null;
                return (
                  <label key={index} className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#332D25] bg-[#1C1915] text-center">
                    {preview ? <img src={preview} alt="" className="h-full w-full rounded-[1.5rem] object-cover" /> : <><span className="text-2xl text-[#D3A84F]">+</span><span className="mt-4 font-bold">Add piece</span><span className="text-xs text-[#8D8377]">Photo, name, price, category</span></>}
                    <input type="file" accept="image/*" className="sr-only" onChange={event => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (product) setProducts(value => value.map((item, itemIndex) => itemIndex === index ? { ...item, image: file } : item));
                      else addProduct(file);
                    }} />
                  </label>
                );
              })}
            </div>
            {products.map((product, index) => (
              <ProductEditor key={product.clientId} product={product} index={index} onChange={nextProduct => setProducts(value => value.map(item => item.clientId === product.clientId ? nextProduct : item))} />
            ))}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={next} className="h-14 rounded-2xl border border-[#332D25] text-sm font-black text-[#F5F0E8]">Skip</button>
              <PrimaryButton onClick={next}>Continue →</PrimaryButton>
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-4xl font-black">Save your page.</h1>
              <p className="mt-3 text-lg text-[#9E9589]">Your page is built. Create your login to publish it.</p>
            </div>
            <div className="rounded-[2rem] border border-[#332D25] bg-[#1C1915] p-5">
              <div className="mx-auto h-36 max-w-72 rounded-[1.5rem] border border-[#2A251F] bg-[#11100E] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8D8377]">Live Preview</p>
                <p className="mt-7 text-2xl font-black">{businessName || "Your Store"}</p>
                <p className="text-sm text-[#8D8377]">/s/{slug || "yourname"}</p>
              </div>
            </div>
            <Input label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Input label="Password" value={password} onChange={setPassword} placeholder="Minimum 6 characters" type="password" />
            <Input label="CaratLabs URL" value={slug} onChange={setSlug} placeholder="yourname" />
            {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            <PrimaryButton onClick={submit} disabled={isSubmitting}>{isSubmitting ? "Publishing..." : "Create my free account & publish →"}</PrimaryButton>
            <p className="text-center text-xs text-[#8D8377]">Free forever for beta. No credit card required.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function Input({ label, value, onChange, placeholder, hint, type = "text", maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; hint?: string; type?: string; maxLength?: number }) {
  return (
    <label className="block">
      <div className="mb-2 flex justify-between text-base font-bold">
        <span>{label}</span>
        {maxLength && <span className="text-sm font-normal text-[#8D8377]">{value.length}/{maxLength}</span>}
      </div>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-[#332D25] bg-[#11100E] px-4 text-base outline-none placeholder:text-[#6E665D] focus:border-[#D3A84F]"
      />
      {hint && <p className="mt-2 text-sm text-[#8D8377]">{hint}</p>}
    </label>
  );
}

function SelectInput({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; options: string[] }) {
  return (
    <label className="block">
      <div className="mb-2 text-base font-bold">{label}</div>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-14 w-full appearance-none rounded-2xl border border-[#332D25] bg-[#11100E] px-4 text-base outline-none focus:border-[#D3A84F]"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className="h-14 w-full rounded-2xl bg-[#D3A84F] text-sm font-black text-black disabled:opacity-60">{children}</button>;
}

function Segment({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`h-12 rounded-2xl border text-sm font-bold ${active ? "border-[#D3A84F] bg-[#2A2118] text-[#D3A84F]" : "border-[#332D25] bg-[#11100E] text-[#F5F0E8]"}`}>{children}</button>;
}

function ProductEditor({ product, index, onChange }: { product: ProductDraft; index: number; onChange: (product: ProductDraft) => void }) {
  return (
    <div className="rounded-[1.7rem] border border-[#332D25] bg-[#1C1915] p-4">
      <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-[#D3A84F]">Piece {index + 1}</p>
      <Input label="Piece name" value={product.name} onChange={name => onChange({ ...product, name })} placeholder="ryder" />
      <div className="mt-5">
        <p className="mb-3 font-bold">Price</p>
        <div className="grid grid-cols-2 gap-3">
          <Segment active={product.priceMode === "set"} onClick={() => onChange({ ...product, priceMode: "set" })}>Set price</Segment>
          <Segment active={product.priceMode === "ask"} onClick={() => onChange({ ...product, priceMode: "ask" })}>Ask for price</Segment>
        </div>
        {product.priceMode === "set" && (
          <input value={product.priceLabel} onChange={event => onChange({ ...product, priceLabel: event.target.value })} placeholder="$1,200" className="mt-3 h-14 w-full rounded-2xl border border-[#332D25] bg-[#11100E] px-4 outline-none focus:border-[#D3A84F]" />
        )}
      </div>
      <div className="mt-5">
        <p className="mb-3 font-bold">Category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button key={category} onClick={() => onChange({ ...product, category })} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${product.category === category ? "bg-[#2A2118] text-[#D3A84F] ring-1 ring-[#D3A84F]" : "bg-[#24201A] text-[#F5F0E8]"}`}>
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <p className="mb-3 font-bold">Variants <span className="font-normal text-[#8D8377]">(optional)</span></p>
        <div className="flex flex-wrap gap-2">
          {variantSuggestions.map(variant => {
            const active = product.variantLabels.includes(variant);
            return (
              <button key={variant} onClick={() => onChange({ ...product, variantLabels: active ? product.variantLabels.filter(item => item !== variant) : [...product.variantLabels, variant] })} className={`rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-[#2A2118] text-[#D3A84F]" : "bg-[#24201A] text-[#8D8377]"}`}>
                + {variant}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
