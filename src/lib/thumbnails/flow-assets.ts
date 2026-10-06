// Shared browser-display metadata. Original source paths also remain available to APIs.

export const PLAIN_STYLES: ReadonlyArray<{ id: "plain_style_1" | "plain_style_2" | "plain_style_3" | "plain_style_4" | "plain_style_5" | "plain_style_6"; label: string; src: string }> = [
  { id: "plain_style_1", label: "Amour", src: "/plain-pendants/plain_style_1.png" },
  { id: "plain_style_2", label: "Olivia", src: "/plain-pendants/plain_style_2.png" },
  { id: "plain_style_3", label: "Hayley", src: "/plain-pendants/plain_style_3.png" },
  { id: "plain_style_4", label: "Paige", src: "/plain-pendants/plain_style_4.png" },
  { id: "plain_style_5", label: "Audrey", src: "/plain-pendants/plain_style_5.png" },
  { id: "plain_style_6", label: "Wesley", src: "/plain-pendants/plain_style_6.png" }
];

export const BRACELET_STYLES: Array<{ id: "style_1" | "style_2" | "style_3" | "style_4"; label: string; src: string }> = [
  { id: "style_1", label: "Bracelet style 1", src: "/bracelets/styles/icedout-bracelet-1.png" },
  { id: "style_2", label: "Bracelet style 2", src: "/bracelets/styles/icedout-bracelet-2.png" },
  { id: "style_3", label: "Bracelet style 3", src: "/bracelets/styles/icedout-bracelet-3.png" },
  { id: "style_4", label: "Bracelet style 4", src: "/bracelets/styles/icedout-bracelet-4.png" }
];

export const WOMENS_STYLES: Array<{ id: "womens_1" | "womens_2"; label: string; src: string }> = [
  { id: "womens_1", label: "Bar bracelet", src: "/bracelets/styles/womens-bracelet-1.webp" },
  { id: "womens_2", label: "Script bracelet", src: "/bracelets/styles/womens-bracelet-2.webp" }
];

export const SHAPES: Array<{
  id: "custom" | "circle" | "shield" | "hexa" | "diamond";
  label: string;
  previewClass: string;
  iconSizeClass: string;
  previewSizeClass: string;
  iconSrc?: string;
}> = [
  {
    id: "custom",
    label: "Custom",
    previewClass: "rounded-[34%_66%_58%_42%/42%_38%_62%_58%]",
    iconSizeClass: "h-16 w-16",
    previewSizeClass: "h-[68%] w-[68%]",
  },
  {
    id: "circle",
    label: "Circle",
    previewClass: "rounded-full",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[68%] w-[68%]",
    iconSrc: "/logo-pendants/shapes/circle.png",
  },
  {
    id: "shield",
    label: "Shield",
    previewClass: "[clip-path:polygon(50%_0,92%_18%,82%_78%,50%_100%,18%_78%,8%_18%)]",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[70%] w-[62%]",
    iconSrc: "/logo-pendants/shapes/shield.png",
  },
  {
    id: "hexa",
    label: "Hexa",
    previewClass: "[clip-path:polygon(25%_4%,75%_4%,100%_50%,75%_96%,25%_96%,0_50%)]",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[68%] w-[68%]",
    iconSrc: "/logo-pendants/shapes/hexa.png",
  },
  {
    id: "diamond",
    label: "Diamond",
    previewClass: "[clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[66%] w-[66%]",
    iconSrc: "/logo-pendants/shapes/diamond.png",
  },
];

export const SIZE_OPTIONS: Array<{ id: "18" | "20" | "22" | "30"; label: string; fit: string; guide: string }> = [
  { id: "18", label: "18 in", fit: "collarbone", guide: "/necklaces/size-guide/chain-18.png" },
  { id: "20", label: "20 in", fit: "upper chest", guide: "/necklaces/size-guide/chain-20.png" },
  { id: "22", label: "22 in", fit: "mid chest", guide: "/necklaces/size-guide/chain-22.png" },
  { id: "30", label: "30 in", fit: "low statement length", guide: "/necklaces/size-guide/chain-30.png" }
];

type CategoryCard = {
  id: string;
  label: string;
  href: string;
  iconSrc: string;
  available: boolean;
};

export const categories: CategoryCard[] = [
  { id: "pendant", label: "Pendant", href: "/pendants", iconSrc: "/category-icons/pendant.png", available: true },
  { id: "grillz", label: "Grillz", href: "/grillz", iconSrc: "/category-icons/grillz.svg", available: true },
  { id: "bracelet", label: "Bracelet", href: "/bracelets", iconSrc: "/category-icons/bracelet.png", available: true },
  { id: "necklace", label: "Necklace", href: "/necklaces", iconSrc: "/category-icons/necklace.png", available: true },
  { id: "ring", label: "Ring", href: "/coming-soon", iconSrc: "/category-icons/ring.png", available: false },
  { id: "watches", label: "Watches", href: "/coming-soon", iconSrc: "/category-icons/watch.png", available: false }
];

type CardConfig = {
  id: string;
  label: string;
  subtitle?: string;
  href?: string;
  disabled?: boolean;
  active?: boolean;
  thumb?: string;
};

export const pendantCards: CardConfig[] = [
  { id: "name", label: "Icedout", href: "/name", active: true, thumb: "/pendants/mojo-deja.png" },
  { id: "picture", label: "Picture Pendants", href: "/picture-pendants", thumb: "/picture-pendants/picturependant3.jpg" },
  { id: "nameplates", label: "Nameplates", href: "/pendants/nameplates", thumb: "/plain-pendants/plain_style_5.png" },
  { id: "logo", label: "Logo", href: "/pendants/logo", thumb: "/logo-pendants/logo-pendant-thumbnail.jpg" },
  { id: "custom", label: "Custom Design", href: "#", disabled: true },
  { id: "inspired", label: "Get Inspired", href: "#", disabled: true }
];

type BraceletCard = {
  id: string;
  label: string;
  href: string;
  thumb: string;
  active?: boolean;
};

export const braceletCards: BraceletCard[] = [
  {
    id: "icedout",
    label: "Icedout Bracelets",
    href: "/bracelets/icedout",
    thumb: "/bracelets/styles/icedout-bracelet-1.png"
  },
  {
    id: "womens",
    label: "Women's Bracelets",
    href: "/bracelets/womens",
    thumb: "/bracelets/styles/womens-bracelet-1.webp"
  }
];

export const emblems: Array<{ id: string; label: string; src: string }> = [
  { id: "moneybag", label: "Money Bag", src: "/emblems/moneybag emblem.png" },
  { id: "heart", label: "Heart", src: "/emblems/heart emblem.png" },
  { id: "butterfly", label: "Butterfly", src: "/emblems/BUTTERFLY EMBLEM.png" },
  { id: "spade", label: "Spade", src: "/emblems/SPADE EMBLEM.png" },
  { id: "crown", label: "Crown", src: "/emblems/CROWN EMBLEM.png" }
];
