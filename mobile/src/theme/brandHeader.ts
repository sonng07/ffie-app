// The FFIE brand "header surface" — the deep brand color that sits behind the
// logo lockup on the Home hero, the persistent AppHeader bar, and the Profile
// identity hero (plus their overscroll backstops and loading skeletons).
//
// Defined ONCE here so every header-matched surface stays in lockstep: changing
// the brand header color is a one-line edit. White text/icons sit on top, so
// the chosen shade must keep them legible (large text / icons ≥ 3:1).

import { primitives } from "@tokens";

/**
 * Brand header background — FFIE operational teal at [700] (#027489).
 *
 * ONE teal for the whole interactive system: this is the SAME value as the
 * light theme's `action.primary.bg` and `brand.accent`, so the header, the
 * primary buttons, the segmented toggles and the filter controls all read as a
 * single brand teal rather than two near-misses. It was teal[600] (#0094A9) —
 * one shade brighter — but that only clears ~3.6:1 against white (AA-large
 * only); [700] lands ~5.4:1, so the white header text/icons pass AA at any size.
 */
export const HEADER_SURFACE = primitives.colors.brand.teal[700]; // #027489
