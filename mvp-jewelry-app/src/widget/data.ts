import type { CategoryCard, PendantTypeCard, PendantStyle, PicturePendantStyle, Emblem, MetalCombo, EmblemId } from "./types";

export const categoryCards: CategoryCard[] = [
  { id: "pendant", label: "Pendant", disabled: false, emoji: "💎" },
  { id: "ring", label: "Ring", disabled: true, emoji: "💍" },
  { id: "bracelet", label: "Bracelet", disabled: true, emoji: "📿" },
  { id: "necklace", label: "Necklace", disabled: true, emoji: "⛓️" }
];

export const pendantTypeCards: PendantTypeCard[] = [
  { id: "logo", label: "Logo", disabled: true, emoji: "🏷️", mode: null },
  { id: "name", label: "Name / Initials", disabled: false, emoji: "✨", mode: "name" },
  { id: "picture", label: "Picture Pendants", disabled: false, emoji: "🖼️", mode: "picture" },
  { id: "custom", label: "Custom Design", disabled: true, emoji: "✏️", mode: null },
  { id: "inspire", label: "Get Inspired", disabled: true, emoji: "💡", mode: null },
  { id: "draw", label: "Draw Your Design", disabled: true, emoji: "🎨", mode: null }
];

export const nameStyles: PendantStyle[] = [
  { id: "deja", label: "Deja", src: "/pendants/deja.png" },
  { id: "gatti", label: "Gatti", src: "/pendants/gatti.png" },
  { id: "jaida", label: "Jaida", src: "/pendants/jaida.png" },
  { id: "jhon", label: "Jhon", src: "/pendants/jhon.png" },
  { id: "jwae", label: "Jwae", src: "/pendants/jwae.png" },
  { id: "king", label: "King", src: "/pendants/king.png" },
  { id: "lexy", label: "Lexy", src: "/pendants/lexy.png" },
  { id: "neiko", label: "Neiko", src: "/pendants/neiko.png" }
];

export const pictureStyles: PicturePendantStyle[] = [
  { id: "pendant1", label: "Round Classic", src: "/picture-pendants/pendant1.jpg", available: true },
  { id: "picturependant2", label: "Oval Halo", src: "/picture-pendants/picturependant2.jpg", available: true },
  { id: "picturependant3", label: "Winged Round", src: "/picture-pendants/picturependant3.jpg", available: true },
  { id: "picturependant4", label: "Sunburst Round", src: "/picture-pendants/picturependant4.jpg", available: true },
  { id: "picturependant5", label: "Heart Frame", src: "/picture-pendants/picturependant5.jpg", available: true }
];

export const emblems: Emblem[] = [
  { id: "none" as EmblemId, label: "None" },
  { id: "moneybag" as EmblemId, label: "Money Bag", src: "/emblems/moneybag emblem.png" },
  { id: "crown" as EmblemId, label: "Crown", src: "/emblems/CROWN EMBLEM.png" },
  { id: "heart" as EmblemId, label: "Heart", src: "/emblems/heart emblem.png" },
  { id: "spade" as EmblemId, label: "Spade", src: "/emblems/SPADE EMBLEM.png" },
  { id: "butterfly" as EmblemId, label: "Butterfly", src: "/emblems/BUTTERFLY EMBLEM.png" }
];

export const metalCombos: MetalCombo[] = [
  { primary: "yellow_gold", secondary: "white_gold", label: "Yellow + White Gold", twoTone: true },
  { primary: "rose_gold", secondary: "white_gold", label: "Rose + White Gold", twoTone: true },
  { primary: "white_gold", secondary: "white_gold", label: "White Gold", twoTone: false }
];

export const diamondQualities = ["VS", "VVS"] as const;
