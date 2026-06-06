/**
 * Branding, app name, and color tokens.
 *
 * A rename or re-theme is a one-file change (spec §10). Colors are exposed to
 * Tailwind via CSS variables defined in app/globals.css; change the hex values
 * there to retheme, and the names here for copy.
 */
export const BRAND = {
  name: "yours",
  tagline: "Less, better.",
  description:
    "A calm gym log: build a split, log fast, watch your numbers move.",
  // Theme tokens are kept in sync with the CSS variables in app/globals.css.
  // Documented here so a designer has a single place to read the intent.
  colors: {
    bg: "#0b0b0f", // app background (near-black, low strain at the gym)
    surface: "#16161d", // cards / sheets
    border: "#26262f",
    text: "#f4f4f5",
    muted: "#9b9ba6",
    accent: "#e7ff52", // single high-energy accent — used sparingly
    accentText: "#0b0b0f",
    danger: "#ff5a5a",
    success: "#4ade80",
  },
} as const;

export type Brand = typeof BRAND;
