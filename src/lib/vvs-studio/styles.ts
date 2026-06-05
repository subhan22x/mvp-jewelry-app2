export type VvsStyleKey = "prisma" | "noir" | "glacier" | "gold_marble";

export type VvsStyleDefinition = {
  key: VvsStyleKey;
  label: string;
  active: boolean;
  sortOrder: number;
  previewAsset: string;
  backgroundAsset: string;
  placementPrompt: string;
};

const DEFAULT_PLACEMENT_PROMPT =
  "place this pendent on the platform, slighty smaller than the platform, make the lighting realistic and add a top right light source that makes the pendants shine naturally";

export const VVS_STUDIO_STYLES: VvsStyleDefinition[] = [
  {
    key: "prisma",
    label: "Prisma",
    active: true,
    sortOrder: 10,
    previewAsset: "/vvs-studio/style-videos/style-1.mp4",
    backgroundAsset: "/vvs-studio/backgrounds/prisma.png",
    placementPrompt: DEFAULT_PLACEMENT_PROMPT,
  },
  {
    key: "noir",
    label: "Noir",
    active: true,
    sortOrder: 20,
    previewAsset: "/vvs-studio/style-videos/style-2.mp4",
    backgroundAsset: "/vvs-studio/backgrounds/noir.png",
    placementPrompt:
      "place this jewelry pendant on the background image, floating in air slightly above the ground, a bit smaller than the size of the platform in width, 9:16 Make the aspect ratio 9:16",
  },
  {
    key: "glacier",
    label: "Glacier",
    active: true,
    sortOrder: 30,
    previewAsset: "/vvs-studio/style-videos/style-3.mp4",
    backgroundAsset: "/vvs-studio/backgrounds/glacier.png",
    placementPrompt: DEFAULT_PLACEMENT_PROMPT,
  },
  {
    key: "gold_marble",
    label: "Gold Marble",
    active: true,
    sortOrder: 40,
    previewAsset: "/vvs-studio/style-videos/style-4.mp4",
    backgroundAsset: "/vvs-studio/backgrounds/gold-marble.png",
    placementPrompt: DEFAULT_PLACEMENT_PROMPT,
  },
];

export function getVvsStyle(key: string | null | undefined) {
  return VVS_STUDIO_STYLES.find(style => style.key === key && style.active) ?? null;
}
