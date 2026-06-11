// Auth-flow screen tokens.
// Spec values for the member sign-in screen (LoginScreen), keyed off the
// canonical `@tokens` primitives so any future scale change ripples through.
// (The earlier Splash / Email / OTP screens were superseded by the password
// LoginScreen and removed, along with their tokens.)

import { primitives } from "@tokens";
import { HEADER_SURFACE } from "@/theme/brandHeader";

const { radii, colors } = primitives;

export const auth = {
  // Member sign-in screen (LoginScreen) — a TEAL HERO + WHITE SHEET, matching
  // the Home header (HEADER_SURFACE = teal[700] #027489 — the one brand teal,
  // same hue as the CTA below). White display text clears AA on it (~5.4:1);
  // we still keep small text off the teal — like the header — so the hero
  // carries only large white display text + a white logo chip, and the whole
  // form drops onto a white sheet where everything clears WCAG AA (dark navy
  // text, teal[700] CTA, navy[400] field borders ≈6:1).
  login: {
    bg: HEADER_SURFACE,                 // teal[700] #027489 — hero (lockstep w/ header)
    sheet: colors.white,                // form sheet — all small text rides this
    title: colors.white,                // "Welcome" — large on teal (≈5.4:1, AA)
    subtitle: colors.white,             // hero subtitle — large-ish on teal
    headerLabel: colors.white,          // top "FFIE" wordmark + back chevron
    radius: radii.lg,                   // 12 — fields, buttons, footer pill

    field: {
      height: 56,
      bg: colors.white,                 // white field reads on teal
      border: colors.brand.navy[400],   // #4F5C95 — ≈3:1+ boundary (1.4.11)
      borderFocus: colors.brand.teal[700], // #027489 — visible on white + teal
      text: colors.brand.navy[900],     // ≈16:1 on white (AAA)
      placeholder: colors.brand.navy[400], // #4F5C95 — ≈6.4:1 on white (AA)
    },

    // Primary "Connect" CTA — teal[700], the same FFIE brand teal as the app's
    // default primary action (≈5.45:1 white-on-teal, clears WCAG AA). Pressed → teal[800].
    cta: {
      height: 56,
      bg: colors.brand.teal[700],         // #027489
      bgPressed: colors.brand.teal[800],  // #045764
      bgDisabled: "rgba(18,24,53,0.12)",  // navy @ 12% (disabled = contrast-exempt)
      fg: colors.white,
      fgDisabled: colors.brand.navy[500],
    },

    // "SSO federation connection" — outlined white button.
    sso: {
      bg: colors.white,
      bgPressed: colors.gray[100],        // #EEF0F4
      border: colors.brand.navy[400],     // ≈3:1+ boundary
      fg: colors.brand.navy[800],         // #1A2349 — high contrast on white
    },

    divider: colors.brand.navy[400],      // #4F5C95 — "or" rule, ≈5:1 (≥3:1)
    link: colors.brand.navy[700],         // #222D5D — Forgot / Help (≈10:1)
    accent: colors.brand.teal[700],       // #027489 — "Join" (≈5.45:1 on white)

    // Bottom note + "Not yet a member?" bar — white pill on the teal page.
    footer: {
      bg: colors.white,
      border: colors.brand.navy[400],     // #4F5C95 — ≈5:1 boundary on teal (1.4.11)
      noteText: colors.brand.navy[700],   // #222D5D — ≈10:1 on teal
      markBg: colors.white,               // FFB mark already sits on white
    },
  },
} as const;

export type AuthTokens = typeof auth;
