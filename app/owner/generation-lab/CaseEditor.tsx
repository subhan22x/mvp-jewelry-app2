"use client";

import { useMemo } from "react";

export type MetaNameStyle = { id: string; label: string; emblemsAllowed: string[]; hasNaturalLanguage: boolean };
export type MetaPlainStyle = { id: string; label: string };
export type MetaBraceletStyle = { id: string; label: string; productLine: "icedout" | "womens" };
export type MetaPictureStyle = { id: string; label: string; available: boolean };
export type LabMeta = {
  families: Array<{ id: string; label: string; wired: boolean; generationsPerCase: number }>;
  maxGenerationsPerRun: number;
  failureTags: string[];
  imageModels: Array<{ id: string; label: string }>;
  presets: Array<{ id: string; label: string; description: string; caseCount: number }>;
  nameStyles: MetaNameStyle[];
  plainStyles: MetaPlainStyle[];
  pictureStyles: MetaPictureStyle[];
  braceletStyles: MetaBraceletStyle[];
};

export type AnyCaseConfig = {
  family: "name" | "bracelet" | "picture" | "logo";
  [key: string]: unknown;
};

const EMBLEM_OPTIONS = ["none", "crown", "heart", "spade", "butterfly", "moneybag"] as const;
const METAL_OPTIONS = ["rose_gold", "white_gold", "yellow_gold"] as const;
const PROMPT_MODES = ["json", "natural_language"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-[#e1e2ec] outline-none focus:border-white/30";

export default function CaseEditor({
  index,
  config,
  meta,
  onChange,
  onRemove
}: {
  index: number;
  config: AnyCaseConfig;
  meta: LabMeta;
  onChange: (next: AnyCaseConfig) => void;
  onRemove: () => void;
}) {
  const familyMeta = useMemo(
    () => meta.families.find(f => f.id === config.family),
    [meta.families, config.family]
  );

  function patch(patch: Record<string, unknown>) {
    onChange({ ...config, ...patch });
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#17191F] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#f7bc5f]">Case {index + 1}</span>
        <div className="flex items-center gap-2">
          {familyMeta && (
            <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-[#8c909f]">
              {familyMeta.generationsPerCase} gen{familyMeta.generationsPerCase === 1 ? "" : "s"}
              {!familyMeta.wired ? " · not wired" : ""}
            </span>
          )}
          <button type="button" onClick={onRemove} className="text-xs text-red-300/70 hover:text-red-300">remove</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Family">
          <select
            className={inputClass}
            value={config.family}
            onChange={e => {
              const family = e.target.value as AnyCaseConfig["family"];
              const defaults: Record<string, AnyCaseConfig> = {
                name: { family: "name", styleId: meta.nameStyles[0]?.id ?? "", text: "", pendantFinish: "icedout", twoTone: false, primaryMetal: "yellow_gold", secondaryMetal: null, emblem: "none" },
                bracelet: { family: "bracelet", productLine: "icedout", text: "", styleId: "style_1", colorCombo: "yellow_gold", metalType: "gold" },
                picture: { family: "picture", styleId: meta.pictureStyles[0]?.id ?? "", primaryMetal: "yellow_gold" },
                logo: { family: "logo", shape: "custom", colorCombo: "YELLOW_WHITE" }
              };
              onChange(defaults[family]);
            }}
          >
            {meta.families.map(f => (
              <option key={f.id} value={f.id}>{f.label}{f.wired ? "" : " (TODO)"}</option>
            ))}
          </select>
        </Field>
      </div>

      {config.family === "name" && (
        <NameCaseFields config={config} meta={meta} patch={patch} />
      )}
      {config.family === "bracelet" && (
        <BraceletCaseFields config={config} meta={meta} patch={patch} />
      )}
      {(config.family === "picture" || config.family === "logo") && (
        <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
          {config.family === "picture"
            ? "Picture pendants use a deterministic sharp composite (no Gemini call). Generation Lab wiring is a TODO; this case will be skipped at run time."
            : "Logo pendant generation is not yet exposed through a reusable builder. Generation Lab wiring is a TODO; this case will be skipped at run time."}
        </div>
      )}
    </div>
  );
}

function NameCaseFields({ config, meta, patch }: { config: AnyCaseConfig; meta: LabMeta; patch: (p: Record<string, unknown>) => void }) {
  const isPlain = config.pendantFinish === "plain";
  const styleId = String(config.styleId ?? "");
  const nameStyle = meta.nameStyles.find(s => s.id === styleId);
  const allowedEmblems = nameStyle?.emblemsAllowed ?? EMBLEM_OPTIONS;

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Finish">
          <select className={inputClass} value={String(config.pendantFinish ?? "icedout")} onChange={e => patch({ pendantFinish: e.target.value })}>
            <option value="icedout">Iced out</option>
            <option value="plain">Plain</option>
          </select>
        </Field>
        <Field label="Style">
          <select className={inputClass} value={styleId} onChange={e => patch({ styleId: e.target.value })}>
            {(isPlain ? meta.plainStyles : meta.nameStyles).map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Text">
          <input className={inputClass} value={String(config.text ?? "")} onChange={e => patch({ text: e.target.value })} placeholder="Alyssa" />
        </Field>
      </div>

      {isPlain ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Plain color">
            <select className={inputClass} value={String(config.plainColor ?? "gold")} onChange={e => patch({ plainColor: e.target.value })}>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="rose_gold">Rose Gold</option>
            </select>
          </Field>
          <Field label="Plain metal">
            <select className={inputClass} value={String(config.plainMetal ?? "gold")} onChange={e => patch({ plainMetal: e.target.value })}>
              <option value="gold_plated">Gold Plated</option>
              <option value="silver">Silver</option>
              <option value="gold">Solid Gold</option>
            </select>
          </Field>
          {config.plainMetal === "gold" && (
            <Field label="Karat">
              <select className={inputClass} value={String(config.plainKarat ?? "")} onChange={e => patch({ plainKarat: e.target.value || null })}>
                <option value="">(none)</option>
                <option value="10k">10k</option>
                <option value="14k">14k</option>
                <option value="18k">18k</option>
              </select>
            </Field>
          )}
          <Field label="Chain">
            <select className={inputClass} value={String(config.plainChain ?? "box")} onChange={e => patch({ plainChain: e.target.value })}>
              <option value="rope">Rope</option>
              <option value="box">Box</option>
              <option value="snake">Snake</option>
              <option value="cable">Cable</option>
              <option value="station">Station</option>
              <option value="bar_link_tube_station">Bar link / tube station</option>
              <option value="figaro_oval_link">Figaro / oval link</option>
            </select>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Two tone">
            <select className={inputClass} value={String(Boolean(config.twoTone))} onChange={e => patch({ twoTone: e.target.value === "true" })}>
              <option value="false">Single tone</option>
              <option value="true">Two tone</option>
            </select>
          </Field>
          <Field label="Primary metal">
            <select className={inputClass} value={String(config.primaryMetal ?? "yellow_gold")} onChange={e => patch({ primaryMetal: e.target.value })}>
              {METAL_OPTIONS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </Field>
          {Boolean(config.twoTone) && (
            <Field label="Secondary metal">
              <select className={inputClass} value={String(config.secondaryMetal ?? config.primaryMetal ?? "white_gold")} onChange={e => patch({ secondaryMetal: e.target.value })}>
                {METAL_OPTIONS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </Field>
          )}
          <Field label="Emblem">
            <select className={inputClass} value={String(config.emblem ?? "none")} onChange={e => patch({ emblem: e.target.value })}>
              {EMBLEM_OPTIONS.filter(e => allowedEmblems.includes(e)).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Diamond quality">
            <select className={inputClass} value={String(config.diamondQuality ?? "")} onChange={e => patch({ diamondQuality: e.target.value || undefined })}>
              <option value="">(none)</option>
              <option value="vs">VS</option>
              <option value="vvs">VVS</option>
            </select>
          </Field>
          {nameStyle?.hasNaturalLanguage && (
            <Field label="Prompt mode">
              <select className={inputClass} value={String(config.promptMode ?? "")} onChange={e => patch({ promptMode: e.target.value || undefined })}>
                <option value="">(account default)</option>
                {PROMPT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          )}
        </div>
      )}
      <ModelSelectionFields config={config} meta={meta} patch={patch} variants={2} />
    </div>
  );
}

function BraceletCaseFields({ config, meta, patch }: { config: AnyCaseConfig; meta: LabMeta; patch: (p: Record<string, unknown>) => void }) {
  const productLine = (config.productLine as "icedout" | "womens") ?? "icedout";
  const braceletStyles = meta.braceletStyles.filter(s => s.productLine === productLine);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Field label="Product line">
        <select className={inputClass} value={productLine} onChange={e => {
          const next = e.target.value as "icedout" | "womens";
          const firstStyle = meta.braceletStyles.find(s => s.productLine === next);
          patch({ productLine: next, styleId: firstStyle?.id ?? "style_1" });
        }}>
          <option value="icedout">Icedout</option>
          <option value="womens">Womens</option>
        </select>
      </Field>
      <Field label="Style">
        <select className={inputClass} value={String(config.styleId ?? "style_1")} onChange={e => patch({ styleId: e.target.value })}>
          {braceletStyles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Text">
        <input className={inputClass} value={String(config.text ?? "")} onChange={e => patch({ text: e.target.value })} placeholder="ICE" />
      </Field>
      <Field label="Color combo">
        <select className={inputClass} value={String(config.colorCombo ?? "yellow_gold")} onChange={e => patch({ colorCombo: e.target.value })}>
          <option value="yellow_gold">Yellow Gold</option>
          <option value="rose_gold">Rose Gold</option>
          <option value="white">White</option>
        </select>
      </Field>
      <Field label="Metal type">
        <select className={inputClass} value={String(config.metalType ?? "gold")} onChange={e => patch({ metalType: e.target.value })}>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
        </select>
      </Field>
      {productLine === "icedout" && (
        <>
          <Field label="Stone type">
            <select className={inputClass} value={String(config.stoneType ?? "")} onChange={e => patch({ stoneType: e.target.value || undefined })}>
              <option value="">(none)</option>
              <option value="natural_diamonds">Natural diamonds</option>
              <option value="lab_diamonds">Lab diamonds</option>
              <option value="moissanite">Moissanite</option>
              <option value="cz">CZ</option>
            </select>
          </Field>
          <Field label="Diamond quality">
            <select className={inputClass} value={String(config.diamondQuality ?? "")} onChange={e => patch({ diamondQuality: e.target.value || undefined })}>
              <option value="">(none)</option>
              <option value="vs">VS</option>
              <option value="vvs">VVS</option>
            </select>
          </Field>
        </>
      )}
      <ModelSelectionFields config={config} meta={meta} patch={patch} variants={1} />
    </div>
  );
}

function ModelSelectionFields({ config, meta, patch, variants }: { config: AnyCaseConfig; meta: LabMeta; patch: (p: Record<string, unknown>) => void; variants: 1 | 2 }) {
  const selection = (config.modelSelection && typeof config.modelSelection === "object" ? config.modelSelection : {}) as Record<string, unknown>;
  function patchModel(key: "variant1" | "variant2", value: string) {
    const next = { ...selection };
    if (value) next[key] = value;
    else delete next[key];
    patch({ modelSelection: Object.keys(next).length ? next : undefined });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Field label={variants === 1 ? "Model" : "Variant 1 model"}>
        <select className={inputClass} value={String(selection.variant1 ?? "")} onChange={e => patchModel("variant1", e.target.value)}>
          <option value="">Default ({variants === 1 ? "Gemini 3 Pro" : "Gemini 3 Pro"})</option>
          {meta.imageModels.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
        </select>
      </Field>
      {variants === 2 && (
        <Field label="Variant 2 model">
          <select className={inputClass} value={String(selection.variant2 ?? "")} onChange={e => patchModel("variant2", e.target.value)}>
            <option value="">Default (Gemini 3.1 Flash)</option>
            {meta.imageModels.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </Field>
      )}
    </div>
  );
}
