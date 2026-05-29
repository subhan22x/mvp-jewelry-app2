export type Emblem = 'none'|'crown'|'heart'|'spade'|'butterfly'|'moneybag';
export type Metal = 'rose_gold'|'white_gold'|'yellow_gold';
export type PendantFinish = 'icedout'|'plain';
export type PlainColor = 'gold'|'silver'|'rose_gold';
export type PlainMetal = 'gold_plated'|'silver'|'gold';
export type PlainKarat = '10k'|'14k'|'18k';
export type PlainChain = 'rope'|'box'|'snake'|'cable'|'station'|'bar_link_tube_station'|'figaro_oval_link';

export type VariantConfig = {
  deviationStrength?: number;
  bubbleOutline?: boolean;
  forceAllCaps?: boolean;
};

export type StyleConfig = {
  id: string;
  label: string;
  templateKey: string;        // filename without extension
  naturalLanguageTemplateKey?: string; // filename without extension
  naturalLanguageSnippetsKey?: string; // filename without extension
  emblemsAllowed: Emblem[];
  defaults: (Required<VariantConfig> & { view: string }) & { font?: string; schemeType?: string };
  variantMatrix: [VariantConfig, VariantConfig];
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
  pendantFinish?: PendantFinish;
  twoTone?: boolean;
  primaryMetal?: Metal;
  secondaryMetal?: Metal | null;
  emblem?: Emblem;
  plainColor?: PlainColor;
  plainMetal?: PlainMetal;
  plainKarat?: PlainKarat | null;
  plainChain?: PlainChain;
};

export type BuiltVariant = {
  variant: 1|2;
  prompt: string;
  attachments: string[];
};
