import stylesData from "@/data/pendant-styles.json";
import pictureStylesData from "@/data/picture-pendant-styles.json";

export type EmblemAsset = {
  id: string;
  label: string;
  src: string;
};

export type PendantStyle = {
  id: string;
  label: string;
  src: string;
  accent?: string;
};

export type PicturePendantStyle = {
  id: string;
  label: string;
  src?: string;
  baseImage?: string;
  maskImage?: string;
  description?: string;
  available?: boolean;
};

// Styles are sourced from data/pendant-styles.json; use scripts/manage-styles.mjs to edit.
export const pendantStyles: PendantStyle[] = (stylesData as PendantStyle[]).map(style => ({ ...style }));

// Picture Pendant styles stay separate from Name styles. A style is selectable
// only when explicitly marked available after its assets/prompts are added.
export const picturePendantStyles: PicturePendantStyle[] = (pictureStylesData as PicturePendantStyle[]).map(style => ({
  ...style,
  available: style.available === true
}));

// Emblem art for Name step; drop new PNGs in public/emblems then add them here.
export const emblems: EmblemAsset[] = [
  { id: "moneybag", label: "Money Bag", src: "/emblems/moneybag emblem.png" },
  { id: "heart", label: "Heart", src: "/emblems/heart emblem.png" },
  { id: "butterfly", label: "Butterfly", src: "/emblems/BUTTERFLY EMBLEM.png" },
  { id: "spade", label: "Spade", src: "/emblems/SPADE EMBLEM.png" },
  { id: "crown", label: "Crown", src: "/emblems/CROWN EMBLEM.png" }
];
