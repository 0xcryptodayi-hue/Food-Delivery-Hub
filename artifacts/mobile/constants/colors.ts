const primary = "#E8651A";
const primaryLight = "#F47A35";
const primaryDark = "#C4521A";
const cream = "#FFF8F0";
const warmWhite = "#FFFCF8";
const red = "#D63B2F";
const orange = "#E8651A";

export default {
  light: {
    text: "#1A1008",
    textSecondary: "#6B5C4E",
    textMuted: "#A09080",
    background: warmWhite,
    backgroundSecondary: cream,
    backgroundTertiary: "#F5EDE0",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    primary: primary,
    primaryLight: primaryLight,
    primaryDark: primaryDark,
    accent: red,
    tint: primary,
    tabIconDefault: "#C0A898",
    tabIconSelected: primary,
    border: "#E8D8C8",
    borderLight: "#F0E4D4",
    shadow: "rgba(60, 30, 10, 0.08)",
    card: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.5)",
    success: "#4CAF50",
    warning: "#FFA726",
    error: red,
    star: "#F5A623",
    badge: "#E8651A",
    sponsored: "#8B5CF6",
  },
};

export type ColorTheme = typeof import("./colors").default.light;
