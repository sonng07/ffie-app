// iOS HIG primitives — "Cupertino-style" building blocks expressed in the
// FFIE design system (tokens, Sora/Raleway, light/dark/sunlight themes).
//
// These are NOT native iOS widgets — they are RN components styled to follow
// Apple's Human Interface Guidelines so the app reads modern and iOS-native
// while staying Expo-Go compatible, cross-platform, and accessible.
//
// What they encode:
//   - Large-title headers (left-aligned, Sora display, generous top space)
//   - Grouped inset lists (the iOS Settings look): rounded cards inset from
//     the screen edge, hairline separators inset past the leading icon,
//     uppercase muted section headers, optional footnotes
//   - Theme-aware "grouped background" vs "card" surfaces per Apple's
//     systemGroupedBackground / secondarySystemGroupedBackground split

import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { ChevronRight, X, type LucideIcon } from "lucide-react-native";
import { primitives, semantics, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";

export const GUTTER = semantics.spacing.gutter.mobile; // 16

// Apple splits grouped tables into a recessed "grouped background" and raised
// "secondary grouped background" (the cards). Our tokens don't have those two
// names, so we map per theme to get the right figure/ground contrast.
export function useGroupedColors(themeName: ThemeName) {
  const t = themes[themeName];
  switch (themeName) {
    case "dark":
      return {
        pageBg: t.surface.default, // gray950 — recessed base
        cardBg: t.surface.raised, // gray800 — elevated card
        separator: t.border.subtle,
        cardBorder: undefined as string | undefined,
      };
    case "sunlight":
      // High-contrast outdoor theme leans on borders, not fills.
      return {
        pageBg: t.surface.default,
        cardBg: t.surface.default,
        separator: t.border.subtle,
        cardBorder: t.border.default,
      };
    default: // light
      // Inverted from the iOS default per design direction: white PAGE,
      // grey ELEMENTS. Cards take a hairline border so the soft grey fill
      // still reads as a distinct surface against the white page.
      return {
        pageBg: t.surface.default, // white — page base
        cardBg: t.surface.subtle, // gray50 — grey element/card
        separator: t.border.default,
        cardBorder: t.border.subtle,
      };
  }
}

// ---------------------------------------------------------------------------
// LargeTitleHeader — iOS large title. Sits at the top of the scroll content.
// ---------------------------------------------------------------------------
export function LargeTitleHeader({
  title,
  subtitle,
  themeName = "light",
  trailing,
}: {
  title: string;
  subtitle?: string;
  themeName?: ThemeName;
  trailing?: React.ReactNode;
}) {
  const t = themes[themeName];
  return (
    <View style={styles.largeTitleRow}>
      <View style={{ flex: 1 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: t.text.body,
            fontSize: 34, // iOS large-title size
            lineHeight: 41,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.8,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: t.text.muted,
              fontSize: 14,
              lineHeight: 19,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={{ marginLeft: 12 }}>{trailing}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section header — iOS uppercase grouped-table header.
// ---------------------------------------------------------------------------
export function SectionHeader({
  title,
  themeName = "light",
}: {
  title: string;
  themeName?: ThemeName;
}) {
  const t = themes[themeName];
  return (
    <Text
      style={{
        color: t.text.muted,
        fontSize: 13,
        fontFamily: ralewayFamily("500"),
        fontWeight: "500",
        letterSpacing: 0.2,
        textTransform: "uppercase",
        marginLeft: GUTTER + 4,
        marginBottom: 7,
      }}
    >
      {title}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// InsetGroup — rounded card that hosts a run of rows with hairline separators.
// ---------------------------------------------------------------------------
export function InsetGroup({
  header,
  footer,
  themeName = "light",
  children,
}: {
  header?: string;
  footer?: string;
  themeName?: ThemeName;
  children: React.ReactNode;
}) {
  const c = useGroupedColors(themeName);
  const t = themes[themeName];

  return (
    <View style={{ marginBottom: 28 }}>
      {header ? <SectionHeader title={header} themeName={themeName} /> : null}
      <View
        style={{
          marginHorizontal: GUTTER,
          backgroundColor: c.cardBg,
          borderRadius: primitives.radii.lg, // 12 — iOS grouped radius
          borderWidth: c.cardBorder ? 1 : 0,
          borderColor: c.cardBorder,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
      {footer ? (
        <Text
          style={{
            color: t.text.muted,
            fontSize: 12,
            lineHeight: 16,
            marginTop: 7,
            marginHorizontal: GUTTER + 4,
          }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// InsetRow — a single grouped-list row. Leading icon (in a rounded tile),
// title (+ optional subtitle), trailing accessory (chevron by default).
// The hairline separator is inset to line up under the title, iOS-style.
// ---------------------------------------------------------------------------
export function InsetRow({
  icon: Icon,
  iconBg,
  leading,
  leadingWidth = 30,
  title,
  titleNumberOfLines = 1,
  subtitle,
  value,
  themeName = "light",
  isLast = false,
  destructive = false,
  showChevron = true,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  icon?: LucideIcon;
  iconBg?: string;
  /** Overrides the default leading icon tile — pass a custom node (e.g. a
   *  document thumbnail). Provide `leadingWidth` so the row separator
   *  aligns past the visual under the title text. */
  leading?: React.ReactNode;
  leadingWidth?: number;
  title: string;
  /** Allow the title to wrap (e.g. long document names). Defaults to 1 line. */
  titleNumberOfLines?: number;
  subtitle?: string;
  value?: string;
  themeName?: ThemeName;
  isLast?: boolean;
  destructive?: boolean;
  showChevron?: boolean;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const fg = destructive ? t.feedback.danger : t.text.body;
  // Separator is inset past the leading visual so it aligns under the text —
  // the signature iOS grouped-list detail.
  const effectiveLeadingWidth = leading ? leadingWidth : Icon ? 30 : 0;
  const separatorInset = effectiveLeadingWidth ? GUTTER + effectiveLeadingWidth + 12 : GUTTER;

  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;

  return (
    <Wrapper
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }): ViewStyle => ({
        // Pressed tint is a step darker than the (now grey) card so press
        // feedback survives on grey-on-white elements.
        backgroundColor: pressed && onPress ? t.border.subtle : "transparent",
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          columnGap: 12,
          paddingLeft: GUTTER,
          paddingRight: GUTTER,
          minHeight: 48, // P1 touch-target floor
          paddingVertical: 14,
        }}
      >
        {leading ? (
          leading
        ) : Icon ? (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              backgroundColor: iconBg ?? t.brand.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} color="#FFFFFF" />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: ralewayFamily(destructive ? "600" : "400"),
              fontWeight: destructive ? "600" : "400",
              color: fg,
              letterSpacing: -0.2,
            }}
            numberOfLines={titleNumberOfLines}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{ fontSize: 12.5, color: t.text.muted, marginTop: 4, lineHeight: 17 }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {value ? (
          <Text style={{ fontSize: 16, color: t.text.muted }} numberOfLines={1}>
            {value}
          </Text>
        ) : null}

        {trailing}

        {showChevron && onPress && !destructive ? (
          <ChevronRight size={18} color={t.text.muted} style={{ opacity: 0.5 }} />
        ) : null}
      </View>

      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: c.separator,
            marginLeft: separatorInset,
          }}
        />
      ) : null}
    </Wrapper>
  );
}

// SearchClearButton — the iOS-style "clear" affordance: a small grey filled
// circle with an X, shown inside a search field only once the user has typed
// something. Tapping it wipes the query in one go. Render it as the trailing
// child of the rounded search container and gate it on `query.length > 0`.
//
// No animation: it appears/disappears with the text, and an instant toggle
// reads as more responsive than a fade here. The generous hitSlop keeps the
// tap target ≥44pt even though the glyph is small (WCAG / iOS HIG touch size).
export function SearchClearButton({
  onPress,
  themeName,
}: {
  onPress: () => void;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Effacer la recherche"
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.text.muted,
        opacity: 0.55,
      }}
    >
      <X size={12} color={t.surface.default} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  largeTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: GUTTER,
    // Android: match the Join FFIE page's title offset (its PAGE_TOP_PADDING =
    // 24, to line up with the Debug chip). iOS keeps the tighter native value.
    paddingTop: Platform.OS === "android" ? 24 : 8,
    paddingBottom: 12,
    minHeight: 52,
  },
});
