import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#333333",
    secondaryText: "#666666",
    buttonText: "#FFFFFF",
    tabIconDefault: "#666666",
    tabIconSelected: "#4A90E2",
    link: "#4A90E2",
    accent: "#4A90E2",
    highlight: "rgba(74, 144, 226, 0.2)",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F8F8",
    backgroundSecondary: "#F0F0F0",
    backgroundTertiary: "#E8E8E8",
    progressBar: "#4A90E2",
    border: "#E0E0E0",
    placeholder: "#999999",
  },
  dark: {
    text: "#E0E0E0",
    secondaryText: "#B0B0B0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#B0B0B0",
    tabIconSelected: "#5DADE2",
    link: "#5DADE2",
    accent: "#5DADE2",
    highlight: "rgba(93, 173, 226, 0.2)",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#242424",
    backgroundSecondary: "#2E2E2E",
    backgroundTertiary: "#383838",
    progressBar: "#5DADE2",
    border: "#404040",
    placeholder: "#666666",
  },
  sepia: {
    text: "#5B4636",
    secondaryText: "#8B7355",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B7355",
    tabIconSelected: "#8B6F47",
    link: "#8B6F47",
    accent: "#8B6F47",
    highlight: "rgba(139, 111, 71, 0.2)",
    backgroundRoot: "#F4ECD8",
    backgroundDefault: "#EDE5D0",
    backgroundSecondary: "#E6DEC8",
    backgroundTertiary: "#DFD7C0",
    progressBar: "#8B6F47",
    border: "#D4C9B0",
    placeholder: "#A89880",
  },
};

export type ThemeMode = "light" | "dark" | "sepia";

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const ReadingDefaults = {
  fontSize: 18,
  lineSpacing: 1.6,
  marginHorizontal: 20,
  minFontSize: 12,
  maxFontSize: 32,
  minLineSpacing: 1.0,
  maxLineSpacing: 2.0,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const AvailableFonts = [
  { name: "System", value: "system" },
  { name: "Serif", value: "serif" },
  { name: "Georgia", value: "georgia" },
  { name: "Times", value: "times" },
  { name: "Palatino", value: "palatino" },
];
