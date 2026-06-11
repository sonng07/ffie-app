/**
 * FFIE Design System — Canonical Token Module
 * ============================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for all design tokens in the FFIE
 * product family (mobile app + back-office). Every consumer — Expo mobile,
 * Next.js back-office, the design-system preview site, Tailwind config,
 * Figma export — must import from this module. Do not duplicate values.
 *
 * The taxonomy and rationale live in ./TOKENS.md. The principle source
 * (P1–P7) lives in ../brief/DESIGN_PRINCIPLES.md. When those documents
 * disagree with this file, this file wins. The Markdown describes what we
 * promised; this TS module is what we shipped.
 *
 * Structure (3-tier per TOKENS.md §1):
 *   - primitives  — raw, context-free scales (color ramps, space scale, etc.)
 *   - themes      — semantic bindings: { light, dark, sunlight }
 *   - (component) — per-component tokens are added inline in component specs
 *
 * Values here are v0.2. Brand identity has been resolved against the live
 * client site (https://www.ffie.fr): the indigo placeholder is replaced
 * with a `brand` namespace containing FFIE's institutional navy (#222D5D,
 * from the logo) and operational teal (#0094A9, the primary CTA hue on
 * the federation site). Color ramps + typography stacks reference both.
 * Status colors (red/amber/green/blue) and the cool gray neutral remain
 * defensible defaults pending the `ui-design--color-system` refinement.
 *
 * Version: 0.6 — feedback.subtle.{name} = { bg, fg, border } added across
 *                all three themes. Powers StatusPill variant="subtle" — the
 *                low-emphasis pill used in dense rows (P2 / Julien's
 *                doc list, news feed). Sunlight subtle = outlined (white bg
 *                + saturated border + saturated fg) to preserve max contrast.
 * Last updated: 2026-05-28
 */

export const lastUpdated = "2026-05-28" as const;
export const version = "0.6" as const;

// ---------------------------------------------------------------------------
// PRIMITIVES — raw values. Never reference directly from components.
// ---------------------------------------------------------------------------

const colors = {
  white: "#FFFFFF",
  black: "#000000",

  // Cool neutral. Slight blue cast — reads "engineering precision" rather
  // than warm/inviting. AAA-capable: gray.900/950 on white >= 16:1.
  gray: {
    50: "#F7F8FA",
    100: "#EEF0F4",
    200: "#DDE1E8",
    300: "#C2C8D2",
    400: "#9AA2B1",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#0A0E18",
  },

  // BRAND — derived from the FFIE federation identity at ffie.fr.
  // brand.navy anchor = #222D5D (logo top block — institutional).
  // brand.teal anchor = #0094A9 at [600] (ffie.fr primary CTA, 58 occurrences
  // in the compiled stylesheet) with #02B5CE [500] and #04C6E2 [400] as the
  // brighter electricity-flow accents from the logo's radial gradient.
  // Resolves TOKENS.md §9.3 (brand placeholder hue) and PRD §7.4
  // (brand identity). AAA: navy.700+ and teal.700+ on white.
  brand: {
    navy: {
      50: "#ECEEF6",
      100: "#D2D7E9",
      200: "#A5AED2",
      300: "#7783B5",
      400: "#4F5C95",
      500: "#364379",
      600: "#2A356A",
      700: "#222D5D", // anchor — logo institutional block
      800: "#1A2349",
      900: "#121835",
      950: "#080C1F",
    },
    teal: {
      50: "#E6F8FB",
      100: "#B7ECF3",
      200: "#84DFEC",
      300: "#4CD0E2",
      400: "#04C6E2", // ffie.fr highlight cyan
      500: "#02B5CE", // ffie.fr secondary accent
      600: "#0094A9", // anchor — ffie.fr primary CTA
      700: "#027489",
      800: "#045764",
      900: "#043E48",
      950: "#02282E",
    },
  },

  // Red — destructive + danger. AA at 600 on white; AAA at 700+.
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
    950: "#450A0A",
  },

  // Amber — stale / offline. NOT a warning red. Deliberately warm to read
  // "informational" rather than "error" (P2 — feedback.offline distinct).
  amber: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
    950: "#451A03",
  },

  // Green — success. AA at 600 on white; AAA at 700+.
  green: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
    950: "#052E16",
  },

  // Blue — info / syncing. Cooler than indigo so they don't collide.
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
    950: "#172554",
  },
} as const;

// Typography pairing (v0.7):
//   - brand / labels → Museo Sans (300, 500 in use)
//   - display + sans / body → Raleway (Extra-light 200 → Extra-bold 800)
// Museo Sans is paid (MyFonts / Linotype); FFIE must supply the licensed
// font files. Raleway is free via Google Fonts (@expo-google-fonts/raleway
// on RN, @next/font on web). The system stack is the actual rendering
// fallback until the fonts are loaded.
const fontFamilies = {
  sans: 'Raleway, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  brand:
    '"Museo Sans", Museo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  display:
    'Raleway, "Museo Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
} as const;

// Modular scale, ratio 1.25, base 16. Unitless numbers (RN compatible).
// Mapped names map to type roles in the semantic tier.
const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 36,
  "4xl": 48,
} as const;

const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

const lineHeights = {
  tight: 1.2,
  snug: 1.4,
  normal: 1.5,
  relaxed: 1.6,
} as const;

// Unitless em multipliers. Web consumers apply with `${n}em`; React Native
// consumers multiply by the rendered fontSize to get a `letterSpacing` in
// device-independent points. `wider` is reserved for uppercase eyebrows
// where tracking compensates for the reduced legibility of caps.
const letterSpacings = {
  tighter: -0.025,
  tight: -0.01,
  normal: 0,
  wide: 0.015,
  wider: 0.06,
} as const;

// Text styles — semantic typography roles. Each style is a composition of
// primitives (fontFamily, fontSize, lineHeight, fontWeight, letterSpacing,
// optional textTransform). Components reference these by name rather than
// composing the primitives themselves, so a rebalance of the type system
// is a one-file change here.
//
// Family assignments:
//   - display   → Montserrat (free, Google Fonts) for hero + heading roles
//   - brand     → Museo Sans where licensed, otherwise system stack
//   - mono      → system monospace
//
// Per P4: body.* must remain at base (16) or larger. Per P1: button labels
// are semibold + tight so they read at a glance on a worksite phone.
const textStyles = {
  "display.lg": {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes["4xl"],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tighter,
  },
  "display.md": {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes["3xl"],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  "heading.h1": {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes["2xl"],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  "heading.h2": {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
  },
  "heading.h3": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  "heading.h4": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  "body.lg": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.relaxed,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  "body.md": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  "body.sm": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  "label.lg": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  "label.md": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.normal,
  },
  "label.sm": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.normal,
  },
  "eyebrow": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.wider,
    textTransform: "uppercase" as const,
  },
  "caption": {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  "code": {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
} as const;

// 4pt base, hybrid step (4pt from 0–16, 8pt from 16+).
// 4pt resolved over 8pt per TOKENS.md §9.1 and SPACING.md §2:
//   - iOS HIG + Material both use 4pt grids
//   - back-office data lists for Sylvie (P5) need finer steps than 8pt allows
//   - 44/48pt touch targets are 4pt-aligned and don't fit a pure 8pt scale
//   - step number matches Tailwind's default rem-step (space.4 = 16pt = p-4)
// Unitless: web consumers append "px"; React Native consumes as pt directly.
const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

const sizes = {
  touchTarget: {
    secondary: 44, // WCAG 2.5.5 absolute floor
    primary: 48, // P1 — gloved-hand primary action floor
    comfortable: 56, // Spacious — used for hero CTAs on mobile
  },
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;

const motion = {
  duration: {
    instant: 0,
    fast: 120, // Press feedback, hover
    base: 200, // Most transitions
    slow: 320, // Modal enter, drawer
    confirm: 600, // P5 — destructive button hold-to-confirm window
    undo: 60000, // P5 — undo toast window
    loop: 1000, // Spinner / loading rotation period
  },
  easing: {
    standard: "cubic-bezier(0.4, 0.0, 0.2, 1)", // Most transitions
    decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)", // Entrances
    accelerate: "cubic-bezier(0.4, 0.0, 1, 1)", // Exits
  },
} as const;

const opacity = {
  disabled: 0.4,
  stale: 0.6, // P2 — cached-but-old visual de-emphasis
  overlay: 0.6, // Scrim behind modals
} as const;

// Structured per-platform per TOKENS.md §5. Web shadows are what the
// preview can render; iOS / Android are documented for the mobile build.
const elevation = {
  none: {
    ios: { shadowColor: "transparent", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
    android: { elevation: 0 },
    web: "none",
  },
  sm: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    android: { elevation: 1 },
    web: "0 1px 2px rgba(15, 23, 42, 0.06)",
  },
  md: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    android: { elevation: 3 },
    web: "0 2px 6px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  lg: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16 },
    android: { elevation: 6 },
    web: "0 6px 16px rgba(15, 23, 42, 0.10), 0 2px 4px rgba(15, 23, 42, 0.05)",
  },
  xl: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 32 },
    android: { elevation: 12 },
    web: "0 12px 32px rgba(15, 23, 42, 0.14), 0 4px 8px rgba(15, 23, 42, 0.06)",
  },
} as const;

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// Decorative brand gradients — for marketing / hub surfaces (currently the
// Home dashboard's "Public space" cards). These are NOT semantic theme colors:
// like the navy hero header, each is a FIXED two-stop linear gradient that
// reads the same in every theme. Each entry is an ordered [from, to] tuple
// (consumed top-left → bottom-right by expo-linear-gradient). The raw hex lives
// here so it stays centralized in the token module rather than in components.
// Greens/violets sit outside the navy+teal brand core deliberately, so the two
// public-space cards read as a distinct, contrasting pair.
// Both stops are dark enough that WHITE title + subtitle clear WCAG AA (4.5:1)
// across the whole card, not just the darker corner — the lighter stop is the
// binding constraint (#0E7C57 ≈ 4.8:1 on white, #5E2BB0 ≈ 8.6:1).
const gradients = {
  findPro: ["#0E7C57", "#0A5A42"], // emerald — "Find a pro" geolocated directory
  trades: ["#6E39C8", "#46208F"], // violet — "Our trades" discovery
} as const;

export const primitives = {
  colors,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  textStyles,
  space,
  radii,
  sizes,
  motion,
  opacity,
  elevation,
  breakpoints,
  gradients,
} as const;

export type TextStyleName = keyof typeof textStyles;

// ---------------------------------------------------------------------------
// SEMANTIC THEMES — purpose-driven bindings. Components read these only.
// ---------------------------------------------------------------------------

const light = {
  name: "light",
  label: "Standard (Light)",
  brand: {
    institutional: colors.brand.navy[700], // logo navy — headers, federation marks
    // The app's single interactive teal. One shade deeper than the ffie.fr
    // anchor (teal[600] #0094A9) so it equals action.primary.bg and the header
    // (HEADER_SURFACE) — one brand teal everywhere. The deeper hue also clears
    // AA where accent is used as a *fill* under white labels (filter button /
    // chips, ~5.4:1) and as *text/icons* on white (back buttons, links, the
    // active tab — was ~3.6:1 at [600], now ~5.4:1).
    accent: colors.brand.teal[700], // #027489 — matches the header + primary CTAs
  },
  surface: {
    default: colors.white,
    subtle: colors.gray[50],
    raised: colors.white,
  },
  border: {
    default: colors.gray[200], // decorative — card outlines, dividers
    subtle: colors.gray[100],
    strong: colors.gray[400], // load-bearing — input outlines, table dividers under text. 3.4:1 on white, clears WCAG 1.4.11 non-text 3:1.
    focus: colors.brand.teal[700], // focus ring on white — ~5.4:1 (≥3:1). Same brand teal as accent + header (one-teal system).
  },
  text: {
    body: colors.gray[900], // 16.5:1 on white — AAA
    muted: colors.gray[600], // 7.1:1 on white — AAA
    placeholder: colors.gray[500], // 4.6:1 — AA non-AAA; placeholders are hint text, not body.
    inverse: colors.white,
    brand: colors.brand.navy[700], // for FFIE federation marks
  },
    action: {
    // Primary action surface — FFIE operational teal at [700] (#027489), which
    // clears WCAG AA for white text at any size (~5.5:1 on white). Hover /
    // pressed step darker (teal[800] / teal[900]) so the engagement gradient
    // stays legible. (Was #3CA9C5 ≈ 2.5:1 — failed AA for text; replaced so the
    // token no longer ships a known-failing default on every primary CTA.)
    primary: {
      bg: colors.brand.teal[700],
      bgHover: colors.brand.teal[800],
      bgPressed: colors.brand.teal[900],
      fg: colors.white,
    },
    // Secondary = outlined button. Transparent bg by default, brand border + fg.
    // Hover tints the fill with the lightest teal so it stays in-family.
    secondary: {
      bg: "transparent",
      bgHover: colors.brand.teal[50],
      bgPressed: colors.brand.teal[100],
      fg: colors.brand.teal[700],
      border: colors.brand.teal[700],
    },
    destructive: {
      bg: colors.red[600],
      bgHover: colors.red[700],
      bgPressed: colors.red[800],
      fg: colors.white,
    },
  },
  feedback: {
    // green[600] vs white = 3.30:1 — promoted to green[700] for AA on fills.
    success: colors.green[700],
    warning: colors.amber[600],
    danger: colors.red[600],
    info: colors.blue[600],
    offline: colors.amber[500], // P2 — distinct from danger
    syncing: colors.brand.teal[500], // P2 — calm progress, brand-aligned
    stale: colors.amber[500], // P2 — informational, not warning
    // Subtle variants — low-emphasis backgrounds for status communication
    // in dense contexts (repeated pills in a list row). Used by StatusPill
    // variant="subtle". Saturated fg color reads on the tinted bg with AA.
    subtle: {
      success: { bg: colors.green[50], fg: colors.green[800], border: colors.green[200] },
      warning: { bg: colors.amber[50], fg: colors.amber[800], border: colors.amber[200] },
      danger: { bg: colors.red[50], fg: colors.red[800], border: colors.red[200] },
      info: { bg: colors.blue[50], fg: colors.blue[800], border: colors.blue[200] },
      offline: { bg: colors.amber[50], fg: colors.amber[800], border: colors.amber[200] },
      syncing: { bg: colors.brand.teal[50], fg: colors.brand.teal[800], border: colors.brand.teal[200] },
      stale: { bg: colors.amber[50], fg: colors.amber[800], border: colors.amber[200] },
    },
  },
  state: {
    gated: {
      public: colors.gray[400], // P6/P7 — subtle, not punitive
      memberOnly: colors.brand.navy[700], // P6 — premium, institutional
    },
  },
} as const;

const dark = {
  name: "dark",
  label: "Dark",
  brand: {
    institutional: colors.brand.navy[300], // lighter to read on dark surfaces
    accent: colors.brand.teal[400],
  },
  surface: {
    default: colors.gray[950],
    subtle: colors.gray[900],
    raised: colors.gray[800], // Lighter surface for elevation per TOKENS.md
  },
  border: {
    default: colors.gray[700],
    subtle: colors.gray[800],
    strong: colors.gray[500], // 3.5:1 on gray[950], clears non-text 3:1
    focus: colors.brand.teal[300], // bright teal pops on dark
  },
  text: {
    body: colors.gray[50], // 17:1 on gray.950 — AAA
    muted: colors.gray[400], // 7.2:1 on gray.950 — AAA
    placeholder: colors.gray[500],
    inverse: colors.gray[950],
    brand: colors.brand.teal[300],
  },
  action: {
    // brighter teal pops on dark. Hover/pressed go LIGHTER (not darker) —
    // on dark backgrounds, "more engaged" reads as brighter, not darker.
    primary: {
      bg: colors.brand.teal[400],
      bgHover: colors.brand.teal[300],
      bgPressed: colors.brand.teal[200],
      fg: colors.gray[950],
    },
    secondary: {
      bg: "transparent",
      bgHover: colors.gray[800],
      bgPressed: colors.gray[700],
      fg: colors.brand.teal[300],
      border: colors.brand.teal[400],
    },
    // red[500] vs white = 3.76 fails AA. red[400] is brighter and pairs with
    // dark text for 7.4:1 — matches the dark-mode pattern of bright bg + dark fg.
    destructive: {
      bg: colors.red[400],
      bgHover: colors.red[300],
      bgPressed: colors.red[200],
      fg: colors.gray[950],
    },
  },
  feedback: {
    success: colors.green[400],
    warning: colors.amber[400],
    danger: colors.red[400],
    info: colors.blue[400],
    offline: colors.amber[400],
    syncing: colors.brand.teal[300],
    stale: colors.amber[400],
    // Subtle variants in dark mode use the darkest tint as bg, and a light
    // ramp step as fg — inversion of light mode's pattern. AA on bg.
    subtle: {
      success: { bg: colors.green[950], fg: colors.green[300], border: colors.green[800] },
      warning: { bg: colors.amber[950], fg: colors.amber[300], border: colors.amber[800] },
      danger: { bg: colors.red[950], fg: colors.red[300], border: colors.red[800] },
      info: { bg: colors.blue[950], fg: colors.blue[300], border: colors.blue[800] },
      offline: { bg: colors.amber[950], fg: colors.amber[300], border: colors.amber[800] },
      syncing: { bg: colors.brand.teal[950], fg: colors.brand.teal[300], border: colors.brand.teal[800] },
      stale: { bg: colors.amber[950], fg: colors.amber[300], border: colors.amber[800] },
    },
  },
  state: {
    gated: {
      public: colors.gray[500],
      memberOnly: colors.brand.teal[400],
    },
  },
} as const;

// Sunlight — P1 + P4. Maximum contrast, max chroma brand, AAA everywhere.
// Pure black on pure white. Reserved as a separate theme (not a runtime
// modifier) so engineering and design can review it as a first-class
// surface — per TOKENS.md §9.4 open question, resolved as "separate file".
const sunlight = {
  name: "sunlight",
  label: "Sunlight (High Contrast)",
  brand: {
    institutional: colors.brand.navy[900], // deepest navy for outdoor legibility
    accent: colors.brand.teal[800],
  },
  surface: {
    default: colors.white,
    subtle: colors.white,
    raised: colors.white,
  },
  border: {
    default: colors.black, // Borders carry elevation outdoors, not shadows
    subtle: colors.gray[700],
    strong: colors.black, // already maximally legible
    focus: colors.brand.navy[900], // deep navy ring — visible outdoors against white
  },
  text: {
    body: colors.black, // 21:1 — maximum AAA
    muted: colors.gray[800], // 13:1 — still AAA
    placeholder: colors.gray[700], // 8:1 — AAA, readable outdoors
    inverse: colors.white,
    brand: colors.brand.navy[900],
  },
  action: {
    // deepest FFIE navy outdoors. Hover/pressed = navy[950] then black —
    // sunlight is already maxed; movement is small but present.
    primary: {
      bg: colors.brand.navy[900],
      bgHover: colors.brand.navy[950],
      bgPressed: colors.black,
      fg: colors.white,
    },
    secondary: {
      bg: colors.white,
      bgHover: colors.gray[100],
      bgPressed: colors.gray[200],
      fg: colors.black,
      border: colors.black,
    },
    destructive: {
      bg: colors.red[800],
      bgHover: colors.red[900],
      bgPressed: colors.red[950],
      fg: colors.white,
    },
  },
  feedback: {
    success: colors.green[800],
    warning: colors.amber[800],
    danger: colors.red[800],
    info: colors.blue[800],
    offline: colors.amber[700],
    syncing: colors.brand.teal[800],
    stale: colors.amber[700],
    // Sunlight subtle = outlined (no fill). White bg, saturated fg + border.
    // Holds the P1 "max contrast outdoors" promise even in low-emphasis use.
    subtle: {
      success: { bg: colors.white, fg: colors.green[800], border: colors.green[800] },
      warning: { bg: colors.white, fg: colors.amber[800], border: colors.amber[800] },
      danger: { bg: colors.white, fg: colors.red[800], border: colors.red[800] },
      info: { bg: colors.white, fg: colors.blue[800], border: colors.blue[800] },
      offline: { bg: colors.white, fg: colors.amber[700], border: colors.amber[700] },
      syncing: { bg: colors.white, fg: colors.brand.teal[800], border: colors.brand.teal[800] },
      stale: { bg: colors.white, fg: colors.amber[700], border: colors.amber[700] },
    },
  },
  state: {
    gated: {
      public: colors.gray[700],
      memberOnly: colors.brand.navy[900],
    },
  },
} as const;

export const themes = { light, dark, sunlight } as const;

// ---------------------------------------------------------------------------
// SEMANTIC SPACING — purpose-driven, NOT theme-swappable, density-aware.
//
// Spacing semantics don't change per theme — they change per density context.
// Three densities map directly to FFIE's three usage contexts:
//
//   - comfortable (default)  — member-facing mobile app, Julien on a worksite
//                               (P1). Touch-friendly, breathable.
//   - compact                — back-office data tables for Sylvie (P5).
//                               More rows on screen, fewer scrolls.
//   - spacious               — public landing sections (P7). Substance over
//                               brochure copy; room to scan.
//
// Each family (inset/stack/inline/gap) exposes named steps. The density
// remap is applied at the component layer via the `withDensity()` helper
// or by referencing the density-specific token directly.
//
// Per TOKENS.md §3: components read from this tier; never from `primitives.space`
// directly except for one-off marketing/illustration pixel-pushing.
// ---------------------------------------------------------------------------

// Inset — padding INSIDE a container. The space between a container's edge
// and its content.
const inset = {
  none: space[0],         // 0   — flush, used for inset.x with full-bleed images
  tight: space[1],        // 4   — chip/tag inner padding around an icon
  compact: space[2],      // 8   — dense rows, status pills, table cells (P5)
  default: space[4],      // 16  — most cards, buttons, fields, form rows (P1)
  comfortable: space[6],  // 24  — modals, hero cards, member-facing detail panes
  spacious: space[8],     // 32  — landing-page sections, empty states (P7)
  hero: space[10],        // 40  — public-marketing hero block padding
} as const;

// Stack — VERTICAL space between stacked elements. The "rhythm" of a layout.
const stack = {
  none: space[0],         // 0
  tight: space[1],        // 4   — label → control
  snug: space[2],         // 8   — adjacent paragraphs in a dense back-office row
  default: space[4],      // 16  — internal rhythm inside a card or form
  loose: space[6],        // 24  — between sub-sections within a section
  section: space[10],     // 40  — between major sections (feed cards, doc groups)
  page: space[16],        // 64  — between top-level page regions (hero → next)
} as const;

// Inline — HORIZONTAL space between inline (row-direction) elements.
const inline = {
  none: space[0],
  tight: space[1],        // 4   — icon → label inside a pill
  snug: space[2],         // 8   — icon → text in a row item; MIN gap between
                          //        two adjacent tappable targets (P4 — never
                          //        less, or zoom-200% collapses them)
  default: space[3],      // 12  — between adjacent buttons in a toolbar
  loose: space[4],        // 16  — between toolbar groups
  wide: space[6],         // 24  — between major top-bar regions
} as const;

// Gap — for CSS grid/flex `gap` and RN auto-layout gaps. Direction-agnostic.
const gap = {
  none: space[0],
  tight: space[1],        // 4
  snug: space[2],         // 8
  default: space[3],      // 12  — chip cloud, button row
  loose: space[4],        // 16  — form-field grid
  grid: space[6],         // 24  — card grid (doc-library, news feed)
  section: space[8],      // 32  — between landing-section columns (desktop)
} as const;

// Gutter — page-level horizontal margin from the viewport edge to content.
// Sized per breakpoint per P1 (one-handed reach on mobile) + back-office
// readability for Sylvie.
const gutter = {
  mobile: space[4],       // 16  — phone, Julien on a worksite
  tablet: space[6],       // 24  — iPad / large phone landscape
  desktop: space[8],      // 32  — back-office default
  wide: space[10],        // 40  — large desktop, max-readable wrapper margin
} as const;

// Density shift map. Apply by name at the component layer:
//   const padding = withDensity(inset, 'compact', densityMode);
// where densityMode ∈ {'comfortable','compact','spacious'} and the helper
// shifts one step down (compact) or up (spacious) in the named scale.
// See SPACING.md §6 for the shift table and component-level overrides.
const density = {
  comfortable: 0,
  compact: -1,
  spacious: +1,
} as const;

export const semantics = {
  spacing: { inset, stack, inline, gap, gutter, density },
} as const;

export type DensityMode = keyof typeof density;

// Ordered token names per scale, used by withDensity() to step up/down.
const insetOrder = ["none", "tight", "compact", "default", "comfortable", "spacious", "hero"] as const;
const stackOrder = ["none", "tight", "snug", "default", "loose", "section", "page"] as const;
const inlineOrder = ["none", "tight", "snug", "default", "loose", "wide"] as const;
const gapOrder = ["none", "tight", "snug", "default", "loose", "grid", "section"] as const;

const ordersByFamily = {
  inset: insetOrder,
  stack: stackOrder,
  inline: inlineOrder,
  gap: gapOrder,
} as const;

/**
 * Shift a semantic spacing token by the current density mode.
 *
 *   withDensity('inset', 'default', 'compact')  → inset.compact value
 *   withDensity('stack', 'default', 'spacious') → stack.loose value
 *
 * Clamps at the ends of each scale (compact-of-`none` stays `none`).
 * Density tokens that don't have a one-step neighbour fall back to themselves.
 */
export function withDensity<F extends keyof typeof ordersByFamily>(
  family: F,
  token: (typeof ordersByFamily)[F][number],
  mode: DensityMode,
): number {
  const order = ordersByFamily[family];
  const shift = density[mode];
  const idx = order.indexOf(token as never);
  const clamped = Math.min(order.length - 1, Math.max(0, idx + shift));
  const name = order[clamped];
  const family_ = semantics.spacing[family] as Record<string, number>;
  return family_[name];
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export const tokens = { primitives, themes, semantics } as const;

export type Tokens = typeof tokens;
export type ThemeName = keyof typeof tokens.themes;
export type Theme = (typeof themes)[ThemeName];

export default tokens;
