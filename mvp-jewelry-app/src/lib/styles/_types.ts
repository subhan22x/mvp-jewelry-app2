export type Emblem = 'none'|'crown'|'heart'|'spade'|'butterfly'|'moneybag';
export type Metal = 'rose_gold'|'white_gold'|'yellow_gold';

export type VariantConfig = {
  deviationStrength?: number;
  bubbleOutline?: boolean;
  forceAllCaps?: boolean;
};

export type StyleConfig = {
  id: string;
  label: string;
  templateKey: string;        // filename without extension
  emblemsAllowed: Emblem[];
  defaults: (Required<VariantConfig> & { view: string }) & { font?: string; schemeType?: string };
  variantMatrix: [VariantConfig, VariantConfig, VariantConfig, VariantConfig];
  assets?: {
    pendantRef?: string;
    bailRef?: string;
    emblemRefs?: Record<Emblem, string>;
  };
};

export type CustomerInput = {
  userId: string;
  styleId: string;
  text: string;
  twoTone: boolean;
  primaryMetal: Metal;
  secondaryMetal?: Metal | null;
  emblem: Emblem;
};

export type BuiltVariant = {
  variant: 1|2|3|4;
  prompt: string;
  attachments: string[]; // resolved file paths if any
};
