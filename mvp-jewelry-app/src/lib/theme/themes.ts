export const THEME_VARIABLE_NAMES = [
  "gradientTop",
  "gradientMid",
  "gradientBottom",
  "pageBg",
  "surface",
  "surfaceStrong",
  "surfaceMuted",
  "border",
  "borderStrong",
  "borderHover",
  "text",
  "textSoft",
  "textMuted",
  "heading",
  "script",
  "primary",
  "accent",
  "accentContrast",
  "selectedBg",
  "selectedBorder",
  "selectedGlow"
] as const;

export type ThemeVariableName = (typeof THEME_VARIABLE_NAMES)[number];
export type ThemeVariables = Record<ThemeVariableName, string>;
export type ThemeKey = "ice_blue" | "graphite_orange" | "rose_luxe" | "velvet_blue";

export type ThemeDefinition = {
  key: ThemeKey;
  label: string;
  title: string;
  description: string;
  colors: readonly string[];
  variables: ThemeVariables;
};

export const DEFAULT_THEME_KEY: ThemeKey = "graphite_orange";
export const THEME_STORAGE_KEY = "caratlabs-preview-theme";

export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  ice_blue: {
    key: "ice_blue",
    label: "Ice",
    title: "Ice Blue",
    description: "Clean and polished",
    colors: ["#101923", "#9DD7FF"],
    variables: {
      gradientTop: "#223f58",
      gradientMid: "#101923",
      gradientBottom: "#03070c",
      pageBg: "#071017",
      surface: "rgba(8, 18, 27, 0.52)",
      surfaceStrong: "rgba(5, 12, 18, 0.9)",
      surfaceMuted: "rgba(8, 18, 27, 0.42)",
      border: "rgba(157, 215, 255, 0.34)",
      borderStrong: "#9dd7ff",
      borderHover: "#c8ebff",
      text: "#edf8ff",
      textSoft: "rgba(237, 248, 255, 0.74)",
      textMuted: "rgba(237, 248, 255, 0.5)",
      heading: "#f4fbff",
      script: "#9dd7ff",
      primary: "#101923",
      accent: "#9dd7ff",
      accentContrast: "#061019",
      selectedBg: "rgba(157, 215, 255, 0.18)",
      selectedBorder: "#9dd7ff",
      selectedGlow: "rgba(157, 215, 255, 0.42)"
    }
  },
  graphite_orange: {
    key: "graphite_orange",
    label: "Graphite",
    title: "Graphite Orange",
    description: "Sharp and modern",
    colors: ["#181818", "#E28B33"],
    variables: {
      gradientTop: "#c0883e",
      gradientMid: "#4a2510",
      gradientBottom: "#050101",
      pageBg: "#0d0d0d",
      surface: "rgba(8, 8, 8, 0.52)",
      surfaceStrong: "rgba(5, 5, 5, 0.92)",
      surfaceMuted: "rgba(14, 14, 14, 0.55)",
      border: "rgba(226, 139, 51, 0.36)",
      borderStrong: "#e28b33",
      borderHover: "#ffb25e",
      text: "#f5f1eb",
      textSoft: "rgba(245, 241, 235, 0.72)",
      textMuted: "rgba(245, 241, 235, 0.48)",
      heading: "#fff4e7",
      script: "#ffb25e",
      primary: "#181818",
      accent: "#e28b33",
      accentContrast: "#130a03",
      selectedBg: "rgba(226, 139, 51, 0.2)",
      selectedBorder: "#e28b33",
      selectedGlow: "rgba(226, 139, 51, 0.42)"
    }
  },
  rose_luxe: {
    key: "rose_luxe",
    label: "Choco",
    title: "Choco",
    description: "Warm and grounded",
    colors: ["#3c2812", "#b8732e", "#2b1d13", "#806f5d"],
    variables: {
      gradientTop: "#3c2812",
      gradientMid: "#231b12",
      gradientBottom: "#0d0a07",
      pageBg: "#0d0a07",
      surface: "rgba(43, 29, 19, 0.58)",
      surfaceStrong: "rgba(13, 10, 7, 0.92)",
      surfaceMuted: "rgba(35, 27, 18, 0.58)",
      border: "rgba(184, 115, 46, 0.34)",
      borderStrong: "#b8732e",
      borderHover: "#d08c45",
      text: "#f1e8dd",
      textSoft: "#806f5d",
      textMuted: "rgba(128, 111, 93, 0.72)",
      heading: "#f7efe5",
      script: "#d08c45",
      primary: "#2b1d13",
      accent: "#b8732e",
      accentContrast: "#0d0a07",
      selectedBg: "rgba(184, 115, 46, 0.2)",
      selectedBorder: "#b8732e",
      selectedGlow: "rgba(184, 115, 46, 0.42)"
    }
  },
  velvet_blue: {
    key: "velvet_blue",
    label: "Navy",
    title: "Red Navy",
    description: "Bold and nocturnal",
    colors: ["#BF092F", "#112442"],
    variables: {
      gradientTop: "#0f203d",
      gradientMid: "#09162e",
      gradientBottom: "#020612",
      pageBg: "#050c1d",
      surface: "rgba(9, 24, 49, 0.58)",
      surfaceStrong: "rgba(4, 10, 24, 0.92)",
      surfaceMuted: "rgba(14, 34, 62, 0.5)",
      border: "rgba(191, 9, 47, 0.38)",
      borderStrong: "#bf092f",
      borderHover: "#f03a5d",
      text: "#f3f7ff",
      textSoft: "rgba(243, 247, 255, 0.74)",
      textMuted: "rgba(243, 247, 255, 0.5)",
      heading: "#ffffff",
      script: "#f03a5d",
      primary: "#112442",
      accent: "#bf092f",
      accentContrast: "#ffffff",
      selectedBg: "rgba(191, 9, 47, 0.2)",
      selectedBorder: "#bf092f",
      selectedGlow: "rgba(191, 9, 47, 0.42)"
    }
  }
};

export const THEME_OPTIONS = Object.values(THEMES);

const cssVariableName = (name: ThemeVariableName) =>
  `--theme-${name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`;

const themeVariableCss = (variables: ThemeVariables) =>
  THEME_VARIABLE_NAMES.map(name => `  ${cssVariableName(name)}: ${variables[name]};`).join("\n");

export const buildThemeCss = () => {
  const defaultTheme = THEMES[DEFAULT_THEME_KEY];
  const rootCss = `:root {\n  color-scheme: dark;\n${themeVariableCss(defaultTheme.variables)}\n}`;
  const themeCss = THEME_OPTIONS.map(theme => `html[data-theme="${theme.key}"] {\n${themeVariableCss(theme.variables)}\n}`).join("\n\n");

  return `${rootCss}\n\n${themeCss}`;
};
