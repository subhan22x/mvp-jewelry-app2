"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  stage: string;
  modelId: string;
  promptTemplate: string;
  version: string;
};

type Style = {
  key: string;
  label: string;
  active: boolean;
  backgroundAsset: string;
  placementPrompt: string;
};

type Settings = {
  profiles: Record<string, Profile>;
  styles: Style[];
};

export default function VvsPipelineSettingsForm({ enabled }: { enabled: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    void fetch("/api/owner/vvs-studio/pipeline-settings")
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load VVS pipeline settings.");
        setSettings(body.settings);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Unable to load VVS pipeline settings."));
  }, [enabled]);

  if (!enabled) return null;

  function updateProfile(key: string, patch: Partial<Profile>) {
    if (!settings) return;
    setSettings({
      ...settings,
      profiles: {
        ...settings.profiles,
        [key]: { ...settings.profiles[key], ...patch },
      },
    });
  }

  function updateStyle(key: string, patch: Partial<Style>) {
    if (!settings) return;
    setSettings({
      ...settings,
      styles: settings.styles.map(style => style.key === key ? { ...style, ...patch } : style),
    });
  }

  async function save() {
    if (!settings) return;
    setStatus("Saving...");
    setError("");
    const response = await fetch("/api/owner/vvs-studio/pipeline-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profiles: Object.fromEntries(Object.entries(settings.profiles).map(([key, profile]) => [
          profile.id,
          { modelId: profile.modelId, promptTemplate: profile.promptTemplate },
        ])),
        styles: Object.fromEntries(settings.styles.map(style => [
          style.key,
          { active: style.active, backgroundAsset: style.backgroundAsset, placementPrompt: style.placementPrompt },
        ])),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus("");
      setError(body.error ?? "Unable to save VVS settings.");
      return;
    }
    setSettings(body.settings);
    setStatus("Saved.");
  }

  return (
    <section className="rounded-xl border border-[#f7bc5f]/20 bg-[#17191F] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Internal</p>
          <h2 className="mt-3 text-2xl font-bold text-[#e1e2ec]">VVS video pipeline</h2>
          <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
            Swap models, prompts, and style backgrounds for new VVS Studio jobs. Existing outputs keep their recorded version.
          </p>
        </div>
        <button onClick={save} disabled={!settings} className="rounded-full bg-[#f7bc5f] px-5 py-2 text-sm font-bold text-black disabled:opacity-40">
          Save pipeline settings
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      {status && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{status}</p>}

      {settings && (
        <div className="mt-6 grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(settings.profiles).map(([key, profile]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-[#101114] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7bc5f]">{key}</p>
                <label className="mt-3 block text-xs uppercase tracking-[0.22em] text-[#8c909f]">Model</label>
                <input
                  value={profile.modelId}
                  onChange={event => updateProfile(key, { modelId: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-[#e1e2ec]"
                />
                <label className="mt-3 block text-xs uppercase tracking-[0.22em] text-[#8c909f]">Prompt</label>
                <textarea
                  value={profile.promptTemplate}
                  onChange={event => updateProfile(key, { promptTemplate: event.target.value })}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm leading-5 text-[#e1e2ec]"
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {settings.styles.map(style => (
              <div key={style.key} className="rounded-xl border border-white/10 bg-[#101114] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7bc5f]">{style.label}</p>
                  <label className="flex items-center gap-2 text-xs text-[#c2c6d6]">
                    <input type="checkbox" checked={style.active} onChange={event => updateStyle(style.key, { active: event.target.checked })} />
                    Active
                  </label>
                </div>
                <label className="mt-3 block text-xs uppercase tracking-[0.22em] text-[#8c909f]">Background asset</label>
                <input
                  value={style.backgroundAsset}
                  onChange={event => updateStyle(style.key, { backgroundAsset: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-[#e1e2ec]"
                />
                <label className="mt-3 block text-xs uppercase tracking-[0.22em] text-[#8c909f]">Placement prompt</label>
                <textarea
                  value={style.placementPrompt}
                  onChange={event => updateStyle(style.key, { placementPrompt: event.target.value })}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm leading-5 text-[#e1e2ec]"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
