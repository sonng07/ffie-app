// AdhererButton — the persistent account avatar (top-right), shown on every
// page in both shells. A circular avatar-style button whose icon and
// destination depend on the role:
//   - Guest (non-member): a user-plus glyph → opens the federation directory
//     (BecomeMemberScreen: the map + departmental list, with a "Se connecter"
//     login button at its bottom).
//   - Member: a plain user glyph → opens the personal Profile / settings page.
//
// The shell owns what "open" means (it passes onPress); this component is just
// the floating disc. Anchored to the top-right safe area (mirrors the
// RoleDebugSwitcher dock), it sits in the empty space to the right of each
// screen's left-aligned large title, so it never overlaps the title text.

import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, UserPlus } from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";

// Gap below the safe-area top edge. Android's status inset sits tighter, so it
// gets a touch more breathing room than iOS (same rationale as the debug chip).
const TOP_GAP = Platform.OS === "android" ? 12 : 2;
// Inset from the screen's right edge — matches the page gutter.
const EDGE = 16;
// Avatar diameter. 40 + hitSlop keeps the touch target comfortably ≥44pt.
const SIZE = 40;

export function AdhererButton({
  themeName = "light",
  variant = "guest",
  onPress,
}: {
  themeName?: ThemeName;
  // "guest" → user-plus (join); "member" → plain user (profile).
  variant?: "guest" | "member";
  onPress: () => void;
}) {
  const t = themes[themeName];
  const insets = useSafeAreaInsets();

  const isMember = variant === "member";
  const Icon = isMember ? User : UserPlus;
  const label = isMember ? "Mon profil" : "Adhérer à la FFIE";

  return (
    // box-none: the host spans the top strip but only the disc is tappable, so
    // taps elsewhere fall through to the screen underneath.
    <View
      style={[styles.host, { top: insets.top + TOP_GAP }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        hitSlop={10}
        style={({ pressed }) => [
          styles.avatar,
          {
            backgroundColor: pressed
              ? t.action.primary.bgPressed
              : t.action.primary.bg,
            // Page-coloured ring so the disc reads as a distinct floating
            // element over whatever content scrolls beneath it.
            borderColor: t.surface.default,
          },
        ]}
      >
        <Icon size={20} color={t.action.primary.fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: EDGE,
    // Dock the disc to the right edge of the top strip.
    alignItems: "flex-end",
    // Sit above tab content (Native Modals still render above this).
    zIndex: 1000,
    elevation: 1000,
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: primitives.radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
});
