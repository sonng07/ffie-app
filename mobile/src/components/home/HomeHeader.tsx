// HomeHeader — the navy "hero" header at the top of the Home tab.
//
// A deep-navy brand surface that bleeds up behind the status bar and carries:
//   - the FFIE lockup on the left — the logo chip plus a greeting beside it
//     ("Welcome" for members, "Welcome to the FFIE" for guests)
//   - top-right actions (notifications + profile) as plain icon buttons
//   - a greeting + identity block:
//       · member → "Hello," + name + an "Active member · No. ____" pill,
//         the whole block tappable to open Profile
//       · guest  → the welcome greeting sits beside the logo (above), so the
//         block below is just the subtitle + a "Join the FFIE" pill
//
// This is a fixed brand surface, not a theme surface: the background is always
// FFIE institutional navy (brand.navy[700]) with white / teal on-colors, the
// same way FFIELogo treats brand colors as constants. Only the page content
// *below* the header follows the active theme.
//
// Static by design — no entrance motion. The tab's skeleton→content swap
// (TabSkeletonGate) already covers the load transition, so animating the
// header on every Home visit would be motion for its own sake (see
// emil-design-eng: when *not* to animate).

import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle2,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react-native";
import { primitives, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER } from "@/components/ui/ios";
import { FFIELogo } from "@/components/ui/FFIELogo";
import { HEADER_SURFACE } from "@/theme/brandHeader";
import { type MemberProfile } from "@/data/member";

// --- fixed brand-surface colors (teal hero) -------------------------------
const WHITE = primitives.colors.white;
// Status / join pill: a SOLID light chip with deep-teal text. A white chip with
// teal[800] text lands ~7:1 (AAA) — stronger emphasis than white-on-teal, and
// it stays robust no matter how the header teal shifts. (The 13px label is the
// binding case: small text needs 4.5:1, so the chip carries it, not the teal.)
const PILL_BG = WHITE;
const PILL_TEXT = primitives.colors.brand.teal[800]; // #045764 — AAA on white
const PILL_ICON = primitives.colors.brand.teal[700]; // #027489 — reads on white

// Translucent overlays derived from token colors (tokens have no alpha
// variants; this keeps the source values token-driven rather than literal).
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HELLO = withAlpha(WHITE, 0.82); // muted greeting / subtitle on the teal hero
const PRESS_BG = withAlpha(WHITE, 0.12); // icon-button pressed tint
const CIRCLE_BG = withAlpha(WHITE, 0.2); // resting fill behind the profile glyph — anchors the right edge at the gutter (mirrors the white logo chip on the left)

// Gap below the safe-area top edge before the brand row. Kept identical to
// AppHeader's TOP_GAP so the logo sits at the same vertical position on every
// page — switching between Home and the other tabs shouldn't shift the lockup.
const TOP_GAP = Platform.OS === "android" ? 14 : 12;

// Guest hero: breathing room added on BOTH sides of the subtitle (below the
// brand row, and above the CTA) on top of the measured chip overhang — so the
// subtitle clears the logo instead of hugging it, while staying centred.
const GUEST_GAP = 8;

// Logo glyph size inside the white chip. Sized up from the original 20 so the
// mark is clearly legible on the navy hero (applies to both member + guest).
const LOGO_SIZE = 42;

export type HomeHeaderProps = {
  themeName?: ThemeName;
  /** "member" shows the identity + member pill; "guest" shows a join CTA. */
  variant: "member" | "guest";
  /** Required for the member variant. */
  member?: MemberProfile;
  /** Shows the red dot on the bell (member variant only). */
  hasUnread?: boolean;
  /** Member: open notifications. Omit to hide the bell. */
  onPressNotifications?: () => void;
  /** Open search. Omit to hide the search button. */
  onPressSearch?: () => void;
  /** Member: tap the identity block → open Profile. */
  onPressIdentity?: () => void;
  /** Guest: tap the "Join the FFIE" pill. */
  onPressJoin?: () => void;
};

// A plain top-bar icon button (white glyph on the brand surface). hitSlop lifts
// the 40pt visible disc to a ≥44pt accessible target.
function IconButton({
  icon: Icon,
  label,
  hint,
  onPress,
  filled = false,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onPress?: () => void;
  /** Show a resting translucent circle behind the glyph (profile action). */
  filled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        filled ? styles.iconBtnFilled : null,
        pressed && onPress ? { backgroundColor: PRESS_BG } : null,
      ]}
    >
      <Icon size={22} color={WHITE} strokeWidth={2} />
    </Pressable>
  );
}

export function HomeHeader({
  themeName = "light",
  variant,
  member,
  hasUnread = false,
  onPressNotifications,
  onPressSearch,
  onPressIdentity,
  onPressJoin,
}: HomeHeaderProps) {
  void themeName; // navy hero is theme-agnostic; prop kept for API symmetry
  const insets = useSafeAreaInsets();
  const isMember = variant === "member" && member != null;

  // The logo chip is taller than the greeting text beside it, so the brand row
  // extends ~half-a-chip below the text baseline. We measure that overhang and
  // feed it to the guest CTA's top margin, so the subtitle ends up visually
  // centred between the brand row and the "Join the FFIE" button (equal gaps).
  // Measuring beats hardcoding because the chip/text heights depend on the font
  // and platform. Defaults to a sensible value until the first layout pass.
  const [chipOverhang, setChipOverhang] = React.useState(10);
  const brandH = React.useRef(0);
  const greetingH = React.useRef(0);
  const measureOverhang = React.useCallback(() => {
    if (brandH.current > 0 && greetingH.current > 0) {
      setChipOverhang(Math.max(0, Math.round((brandH.current - greetingH.current) / 2)));
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top + TOP_GAP }]}>
      {/* Brand lockup + top-right actions */}
      <View style={styles.topRow}>
        <View
          style={styles.brand}
          onLayout={(e) => {
            brandH.current = e.nativeEvent.layout.height;
            measureOverhang();
          }}
          // Member: one "FFIE" label covers the logo + wordmark lockup. Guest:
          // the logo and the "Welcome" greeting are labelled individually.
          accessible={isMember}
          accessibilityRole={isMember ? "image" : undefined}
          accessibilityLabel={isMember ? "FFIE" : undefined}
        >
          <View
            style={styles.logoChip}
            accessible={!isMember}
            accessibilityRole={!isMember ? "image" : undefined}
            accessibilityLabel={!isMember ? "FFIE" : undefined}
          >
            <FFIELogo size={LOGO_SIZE} themeName="light" />
          </View>
          {isMember ? (
            // Member: a short "Welcome" beside the logo (replacing the FFIE
            // wordmark), above the personal "Hello, {name}" line. The lockup is
            // already labelled "FFIE", so this isn't re-announced.
            <Text
              style={styles.brandGreeting}
              numberOfLines={1}
              onLayout={(e) => {
                greetingH.current = e.nativeEvent.layout.height;
                measureOverhang();
              }}
            >
              Welcome
            </Text>
          ) : (
            // Guest: the greeting moves up beside the logo (replacing the
            // wordmark); the block below carries the subtitle + join CTA.
            <Text
              style={styles.brandGreeting}
              accessibilityRole="header"
              numberOfLines={1}
              onLayout={(e) => {
                greetingH.current = e.nativeEvent.layout.height;
                measureOverhang();
              }}
            >
              Welcome to the FFIE
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {/* Profile: opens the member's profile (same destination as the
              tappable identity block below), mirroring AppHeader's profile
              action. */}
          {isMember && onPressIdentity ? (
            <IconButton
              icon={User}
              label="My profile"
              hint="Opens your profile and settings"
              onPress={onPressIdentity}
              filled
            />
          ) : null}
        </View>
      </View>

      {/* Identity / greeting */}
      {isMember ? (
        <Pressable
          onPress={onPressIdentity}
          disabled={!onPressIdentity}
          accessibilityRole={onPressIdentity ? "button" : undefined}
          accessibilityLabel={`${member.fullName}, ${member.statusLabel}, number ${member.memberNo}`}
          accessibilityHint={onPressIdentity ? "Opens your profile" : undefined}
          style={({ pressed }) => [
            styles.identity,
            pressed && onPressIdentity ? { opacity: 0.85 } : null,
          ]}
        >
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {member.fullName}
          </Text>
          <View style={styles.pill}>
            <CheckCircle2 size={14} color={PILL_ICON} />
            <Text style={styles.pillText} numberOfLines={1}>
              {member.statusLabel} · No. {member.memberNo}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={[styles.identity, styles.identityGuest]}>
          <Text style={styles.subtitle}>
            Explore news, resources and member benefits.
          </Text>
          {onPressJoin ? (
            <Pressable
              onPress={onPressJoin}
              accessibilityRole="button"
              accessibilityLabel="Join the FFIE"
              accessibilityHint="Opens membership information"
              style={({ pressed }) => [
                styles.pill,
                // Bottom gap = chip overhang + the same breathing offset applied
                // above the subtitle (identityGuest). So the subtitle is visually
                // centred between the "Welcome" line and this CTA, while still
                // clearing the logo chip rather than hugging it.
                { marginTop: chipOverhang + GUEST_GAP },
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <UserPlus size={14} color={PILL_ICON} />
              <Text style={styles.pillText}>Join the FFIE</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: HEADER_SURFACE,
    paddingHorizontal: GUTTER,
    // Bottom margin tuned so the *visible* brand surface below the identity pill
    // matches AppHeader's 16px bottom margin on every other page. The dashboard
    // sheet lifts over it by SHEET.lift (12), so 28 - 12 = 16px of visible teal
    // — keeping the header's bottom spacing consistent app-wide.
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Floor sized to comfortably contain the (now larger) logo chip.
    minHeight: 44,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    // Let the lockup shrink so the guest greeting truncates before it would
    // collide with the search button, instead of pushing it off-screen.
    flexShrink: 1,
  },
  logoChip: {
    backgroundColor: WHITE,
    borderRadius: 6, // between radii.sm (4) and radii.md (8) — no exact token
    padding: 5,
  },
  // Greeting beside the logo in the brand row — "Welcome" (member) or
  // "Welcome to the FFIE" (guest). A phrase, so it uses tighter heading
  // tracking rather than a wordmark's wide letter spacing.
  brandGreeting: {
    color: WHITE,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 2,
    // No negative margin: the trailing action is a filled circle, so its outer
    // edge should line up with the page gutter — mirroring the logo chip on the
    // left — for symmetric left/right padding.
    marginRight: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: primitives.radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnFilled: {
    backgroundColor: CIRCLE_BG,
  },
  identity: {
    marginTop: 14,
  },
  // Guest override: the brand row is taller than its text because of the logo
  // chip. The subtitle sits GUEST_GAP below the chip's bottom edge (breathing
  // room so it doesn't hug the logo); the CTA below gets that same offset plus
  // the measured chip overhang, keeping the subtitle visually centred.
  identityGuest: {
    marginTop: GUEST_GAP,
  },
  hello: {
    color: HELLO,
    fontFamily: ralewayFamily("500"),
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 1,
  },
  name: {
    color: WHITE,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: HELLO,
    fontFamily: ralewayFamily("400"),
    fontSize: 13.5,
    lineHeight: 19,
    // No top margin: the guest block's top gap comes from the logo-chip overhang
    // (see identityGuest) so it balances the subtitle→CTA gap below.
    marginTop: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    columnGap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: primitives.radii.full,
    // Solid light chip (no border) so the deep-teal label reads at AAA on the
    // teal hero — a translucent fill with white text would fail AA here.
    backgroundColor: PILL_BG,
    marginTop: 12,
  },
  pillText: {
    color: PILL_TEXT,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
