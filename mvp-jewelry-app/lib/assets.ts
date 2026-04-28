import stylesData from "@/data/pendant-styles.json";

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

// Styles are sourced from data/pendant-styles.json; use scripts/manage-styles.mjs to edit.
export const pendantStyles: PendantStyle[] = (stylesData as PendantStyle[]).map(style => ({ ...style }));

// Emblem art for Name step; drop new PNGs in public/emblems then add them here.
export const emblems: EmblemAsset[] = [
  { id: "moneybag", label: "Money Bag", src: "/emblems/moneybag emblem.png" },
  { id: "heart", label: "Heart", src: "/emblems/heart emblem.png" },
  { id: "butterfly", label: "Butterfly", src: "/emblems/BUTTERFLY EMBLEM.png" },
  { id: "spade", label: "Spade", src: "/emblems/SPADE EMBLEM.png" },
  { id: "crown", label: "Crown", src: "/emblems/CROWN EMBLEM.png" }
];
