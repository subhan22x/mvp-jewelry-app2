export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export const themeBorder = {
  base: "border-2 border-[color:var(--theme-border)]",
  selected: "border-[3px] border-[color:var(--theme-selected-border)]",
  strong: "border-2 border-[color:var(--theme-border-strong)]",
  hover: "hover:border-[color:var(--theme-border-hover)]"
} as const;

export const themeSurface = {
  base: "bg-[var(--theme-surface)]",
  strong: "bg-[var(--theme-surface-strong)]",
  muted: "bg-[var(--theme-surface-muted)]",
  selected: "bg-[var(--theme-selected-bg)]",
  accent: "bg-[var(--theme-accent)]"
} as const;

export const themeText = {
  base: "text-[var(--theme-text)]",
  soft: "text-[var(--theme-text-soft)]",
  muted: "text-[var(--theme-text-muted)]",
  accentContrast: "text-[var(--theme-accent-contrast)]"
} as const;

export const themeRadius = {
  option: "rounded-2xl",
  imageOption: "rounded-[30px]",
  imageOptionMobile: "rounded-[20px] sm:rounded-[30px]",
  panel: "rounded-3xl",
  resultCard: "rounded-[32px]",
  pill: "rounded-full"
} as const;

export const styleOptionFrameClass = `h-[184px] w-[184px] ${themeRadius.imageOption}`;

export const themeFocusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-selected-border)]";

export type OptionButtonSize = "sm" | "md" | "lg";

const optionButtonSizeClass: Record<OptionButtonSize, string> = {
  sm: "px-4 py-2 text-base font-semibold",
  md: "px-4 py-3 text-sm font-semibold",
  lg: "px-4 py-2 text-lg"
};

export const optionButtonClass = ({
  selected,
  size = "md",
  className
}: {
  selected: boolean;
  size?: OptionButtonSize;
  className?: string;
}) =>
  cx(
    themeRadius.option,
    "border transition",
    optionButtonSizeClass[size],
    selected
      ? cx(themeBorder.selected, themeSurface.selected, themeText.base)
      : cx(themeBorder.base, themeSurface.base, themeText.soft, themeBorder.hover),
    className
  );

export const imageOptionButtonClass = ({
  selected,
  disabled,
  className
}: {
  selected: boolean;
  disabled?: boolean;
  className?: string;
}) =>
  cx(
    "group relative h-full w-full box-border overflow-hidden transition",
    themeRadius.imageOption,
    themeSurface.muted,
    themeBorder.hover,
    themeFocusRing,
    selected ? themeBorder.selected : themeBorder.base,
    disabled && "cursor-not-allowed opacity-45",
    className
  );

export const panelClass = (className?: string) =>
  cx(themeRadius.panel, themeBorder.base, themeSurface.base, className);
