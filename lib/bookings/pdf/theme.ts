/**
 * Design tokens for the booking PDF export (lib/bookings/pdf/). Mirrors
 * app/globals.css's CSS custom properties exactly — @react-pdf/renderer
 * has no access to CSS variables, oklch(), or color-mix(), so every value
 * below is a literal hex copied from globals.css, plus two pre-computed
 * tints (rule/ruleStrong) that globals.css has no equivalent for.
 *
 * This file, plus chrome.tsx (header/footer chrome), is the "changeable
 * design" surface the header/footer can be restyled through later —
 * nothing outside these two files should hold a raw color, font-size, or
 * spacing literal. Per-module documents (lib/<module>/pdf-document.tsx)
 * and the shared primitives (primitives.tsx) import from here instead.
 */

export const pdfColors = {
  primary: "#1d3b31",
  primaryForeground: "#25322c",
  secondary: "#23312b",
  footer: "#23312b",
  background: "#ebebe9",
  card: "#fafafa",
  accent: "#dac39a",
  // Matches components/ui/badge.tsx's `accent` variant text color
  // (--accent-foreground), NOT --primary-foreground — the two are
  // different tokens in globals.css and the badge is the source of truth
  // the status pill is meant to agree with pixel-for-pixel.
  accentForeground: "#356354",
  mutedForeground: "#4d6b5f",
  destructive: "#c0392b",
  white: "#ffffff",
  /** Hairline between rows within a section. No globals.css equivalent —
   *  react-pdf has no color-mix()/oklch(), so this is a literal ~35%
   *  tint of --primary over white, computed once here. */
  rule: "#c8d1cd",
  /** Section-title underline and the rule above a grand total — a
   *  stronger ~60% tint of --primary, same rationale as `rule`. */
  ruleStrong: "#9aa9a3",
} as const;

export const pdfFontSize = {
  /** Gambetta document title (the booking reference) only. */
  title: 20,
  /** The grand-total row — the one number allowed to out-rank body text. */
  total: 12,
  /** Default body copy: row values, item names, addresses. */
  body: 9.5,
  /** Uppercase section labels and row-style field labels. */
  label: 8.5,
  /** Footer band text and the smallest secondary lines. */
  caption: 7.5,
} as const;

/** 4pt base spacing scale — every consumer spaces siblings with
 *  marginTop/marginBottom rather than a shared `gap` on the parent, so
 *  vertical rhythm stays a deliberate per-component choice. */
export const pdfSpace = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const pdfRadius = {
  card: 3,
  /** Large enough to stay fully round at the pill's own height. */
  pill: 999,
} as const;

export const pdfPage = {
  /** A4 in points, react-pdf's own unit (1pt = 1/72in). */
  width: 595.28,
  height: 841.89,
  marginX: 40,
  headerHeight: 64,
  footerHeight: 40,
  /** Page padding. Top/bottom leave room for the fixed header/footer
   *  bands (headerHeight/footerHeight above) plus breathing room, so
   *  flowing content never sits under either band. */
  paddingTop: 96,
  paddingBottom: 64,
} as const;

export const pdfRule = {
  hairline: 0.5,
  strong: 1,
} as const;
