/**
 * BlockExchange — iPhone-style theme tokens.
 *
 * Pure black background, system-gray cards, rounded-3xl corners,
 * iOS-style list rows with chevron right indicators.
 * Matches the visual language of iOS Settings, Wallet, and Apple Cash.
 */

export const iOSTheme = {
  // Backgrounds
  bg: "#000000",              // pure black
  bgSecondary: "#0A0A0A",     // near-black for nested areas
  card: "#1C1C1E",            // iOS system gray 6 (dark)
  cardElevated: "#2C2C2E",    // iOS system gray 5 (dark)
  cardHover: "#3A3A3C",       // iOS system gray 4 (dark)

  // Borders
  border: "#38383A",          // subtle separator
  borderStrong: "#48484A",

  // Accent
  accent: "#0A84FF",          // iOS system blue (dark mode)
  accentSoft: "rgba(10,132,255,0.15)",

  // Status colors
  success: "#30D158",         // iOS system green
  warning: "#FF9F0A",         // iOS system orange
  error: "#FF453A",           // iOS system red
  purple: "#BF5AF2",          // iOS system purple

  // Text
  text: "#FFFFFF",
  textSecondary: "#EBEBF5",   // iOS secondary label (dark)
  textTertiary: "#8E8E93",    // iOS tertiary label
  textQuaternary: "#48484A",

  // Typography
  fontStack: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',

  // Spacing & radii
  radius: {
    sm: "10px",
    md: "14px",
    lg: "20px",
    xl: "28px",
  },
};

/** CSS-in-JS helper for inline styles using the iOS theme. */
export const ios = {
  page: {
    background: iOSTheme.bg,
    minHeight: "100vh",
    color: iOSTheme.text,
    fontFamily: iOSTheme.fontStack,
  } as React.CSSProperties,

  card: {
    background: iOSTheme.card,
    borderRadius: iOSTheme.radius.lg,
    border: `1px solid ${iOSTheme.border}`,
  } as React.CSSProperties,

  cardElevated: {
    background: iOSTheme.cardElevated,
    borderRadius: iOSTheme.radius.lg,
  } as React.CSSProperties,

  listRow: {
    background: iOSTheme.card,
    padding: "14px 16px",
    borderBottom: `1px solid ${iOSTheme.border}`,
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,

  listRowLast: {
    borderBottom: "none",
    borderBottomLeftRadius: iOSTheme.radius.lg,
    borderBottomRightRadius: iOSTheme.radius.lg,
  } as React.CSSProperties,

  label: {
    color: iOSTheme.textTertiary,
    fontSize: "13px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
  } as React.CSSProperties,

  value: {
    color: iOSTheme.text,
    fontSize: "16px",
    fontWeight: 500,
  } as React.CSSProperties,

  heading: {
    color: iOSTheme.text,
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
  } as React.CSSProperties,
};
