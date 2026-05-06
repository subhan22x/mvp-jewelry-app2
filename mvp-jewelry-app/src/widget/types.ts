export type Mode = "pendants" | "name" | "picture";
export type Theme = "warm-brown" | "dark";
export type Metal = "yellow_gold" | "white_gold" | "rose_gold";
export type DiamondQuality = "VS" | "VVS";
export type EmblemId = "none" | "crown" | "heart" | "spade" | "butterfly" | "moneybag";

export type Screen =
  | "category"
  | "pendantType"
  | "nameConfig"
  | "pictureConfig"
  | "generating"
  | "results"
  | "quote";

export interface PendantStyle {
  id: string;
  label: string;
  src: string;
}

export interface PicturePendantStyle {
  id: string;
  label: string;
  src: string;
  available: boolean;
}

export interface Emblem {
  id: EmblemId;
  label: string;
  src?: string;
}

export interface MetalCombo {
  primary: Metal;
  secondary: Metal;
  label: string;
  twoTone: boolean;
}

export interface CategoryCard {
  id: string;
  label: string;
  disabled: boolean;
  emoji: string;
}

export interface PendantTypeCard {
  id: string;
  label: string;
  disabled: boolean;
  emoji: string;
  mode: Mode | null;
}

export interface WidgetState {
  screen: Screen;
  storeId: string;
  apiBase: string;
  mode: Mode;
  theme: Theme;
  selectedStyleId: string;
  selectedPictureStyleId: string;
  text: string;
  emblem: EmblemId;
  metalComboIndex: number;
  diamondQuality: DiamondQuality;
  requestId: string | null;
  results: ResultItem[];
  uploadFile: File | null;
  uploadPreviewUrl: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  quoteSuccess: boolean;
  generating: boolean;
  pollIntervalId: ReturnType<typeof setInterval> | null;
}

export interface ResultItem {
  variant: number;
  imageUrl: string;
  modelId: string | null;
  durationSeconds: number | null;
}

export interface ApiError {
  error: string;
}

export interface PendantBuilderOptions {
  storeId?: string;
  apiBase?: string;
  mode?: Mode;
  theme?: Theme;
}

export interface CreateNameRequestPayload {
  userId: string;
  styleId: string;
  text: string;
  twoTone: boolean;
  primaryMetal: Metal;
  secondaryMetal: Metal | null;
  emblem: EmblemId;
}

export interface CreateLeadPayload {
  requestId?: string;
  name: string;
  phone: string;
  email: string;
}

export interface CreateQuotePayload {
  requestId: string;
  designedImageUrl?: string;
  diamondQuality?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

export interface RequestStatusResponse {
  id: string;
  productType: string;
  styleId: string;
  text: string;
  metals: { twoTone: boolean; primary: Metal; secondary: Metal | null };
  emblem: string;
  results: ResultItem[];
  generation: { total: number; pending: number; succeeded: number; failed: number };
  done: boolean;
}
