// Shared filter controls — the FFIE filter button + bottom-sheet pattern,
// extracted from the Library screen so every screen that filters a list uses
// the same visual style and the same motion. Used by Library (filter docs by
// status) and News (filter articles by category).
//
// Two exports:
//   - FilterButton — the 38×38 rounded trigger with an active-count badge.
//     Brand-accent fill when any filter is active, hairline border in themes
//     that lean on borders (sunlight).
//   - FilterSheet — the animated bottom sheet of toggleable chips, with
//     Reset + "Show N results" actions. Immediate-apply: chip taps update the
//     caller's filter state right away and the list re-renders behind the
//     dimmed scrim; the action button is just a dismiss affordance.
//
// Both are generic over the option key type K (a string union), so a caller
// passes its own option list and a Set<K> of selected keys.

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { SlidersHorizontal, X } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { displayFamily, ralewayFamily } from "@/theme/fonts";
import { useGroupedColors } from "@/components/ui/ios";

export type FilterOption<K extends string> = { key: K; label: string };

/** One titled group of chips inside the sheet. A sheet can stack several — the
 *  Library stacks "Famille" + "Hors ligne". Keys are plain strings at this
 *  boundary; each caller keeps its own typed Set behind `onToggle`. */
export type FilterSection = {
  /** Uppercase label above this chip group, e.g. "Famille". */
  label: string;
  options: FilterOption<string>[];
  selected: Set<string>;
  onToggle: (key: string) => void;
};

// ---------------------------------------------------------------------------
// FilterButton — inline trigger. Place next to a search field, or in a header
// trailing slot. Shows a red count badge when filters are active.
// ---------------------------------------------------------------------------
export function FilterButton({
  themeName,
  activeCount,
  onPress,
  accessibilityLabel,
}: {
  themeName: ThemeName;
  activeCount: number;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const active = activeCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: active
          ? t.brand.accent
          : pressed ? t.border.default : t.border.subtle,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
      })}
    >
      <SlidersHorizontal size={18} color={active ? "#FFFFFF" : t.brand.accent} />
      {active ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: t.feedback.danger,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: ralewayFamily("700"), fontWeight: "700" }}>
            {activeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// FilterSheet — bottom sheet with toggleable chips.
//
// Animation: two independently driven Animated.Values — a black scrim that
// fades from opacity 0 → 0.45 and a sheet that slides translateY: window-h
// → 0. Decoupling them removes the "whole block slides up" feel of native
// `animationType="slide"` and gives the gradual darken-then-rise motion.
// Both run on the native driver. The sheet stays mounted through the exit
// animation via an internal `rendered` flag — the Modal only unmounts after
// the close anim finishes.
//
// Wrapped in a fresh SafeAreaProvider — keeps react-native-safe-area-context's
// insets from compounding across host views.
// ---------------------------------------------------------------------------
const WINDOW_H = Dimensions.get("window").height;
const SCRIM_MAX_OPACITY = 0.45;

export function FilterSheet<K extends string>({
  visible,
  themeName,
  sectionLabel,
  options,
  selected,
  sections,
  resultCount,
  onToggle,
  onReset,
  onClose,
  title = "Filtre",
}: {
  visible: boolean;
  themeName: ThemeName;
  /** Single-section API (News, Partners): provide these OR `sections`.
   *  Uppercase label above the chip group, e.g. "Catégorie". */
  sectionLabel?: string;
  options?: FilterOption<K>[];
  selected?: Set<K>;
  onToggle?: (key: K) => void;
  /** Multi-section API: stack several titled chip groups (the Library stacks
   *  "Famille" + "Hors ligne"). Takes precedence over the single-section props. */
  sections?: FilterSection[];
  resultCount: number;
  onReset: () => void;
  onClose: () => void;
  title?: string;
}) {
  const t = themes[themeName];

  // Normalize to a section list so the body renders one path. The single-section
  // props collapse to a one-element list; that legacy `onToggle` is keyed by the
  // caller's K but only ever called with a key from its own options, so widening
  // to string is safe.
  const resolvedSections: FilterSection[] = sections ?? [
    {
      label: sectionLabel ?? "",
      options: (options ?? []) as FilterOption<string>[],
      selected: (selected ?? new Set<string>()) as Set<string>,
      onToggle: onToggle as (key: string) => void,
    },
  ];
  const totalSelected = resolvedSections.reduce((n, s) => n + s.selected.size, 0);

  // Internal mount flag — keep the Modal alive while the exit animation plays
  // out, then unmount when it finishes.
  const [rendered, setRendered] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(WINDOW_H)).current;
  const wasVisible = useRef(false);

  useEffect(() => {
    const becameVisible = visible && !wasVisible.current;
    const becameHidden = !visible && wasVisible.current;
    wasVisible.current = visible;

    if (becameVisible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: SCRIM_MAX_OPACITY,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (becameHidden) {
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: WINDOW_H,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, scrimOpacity, sheetY]);

  if (!rendered) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View style={sheetStyles.root}>
          {/* Scrim — opacity driven separately from the sheet. */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000", opacity: scrimOpacity },
            ]}
          />

          {/* Tap-outside dismiss layer, between scrim and sheet. */}
          <Pressable
            accessibilityLabel="Fermer le filtre"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />

          {/* Sheet — slides up while the scrim fades in. */}
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: sheetY }],
            }}
          >
            <SafeAreaView
              edges={["bottom"]}
              style={{
                backgroundColor: t.surface.default,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              {/* No drag handle: this sheet isn't draggable (dismiss via the X
                  or the backdrop), so a grabber would imply an affordance that
                  doesn't exist and confuse users. */}

              {/* Title row */}
              <View style={sheetStyles.titleRow}>
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: displayFamily("700"),
                    fontWeight: "700",
                    color: t.text.body,
                    letterSpacing: -0.4,
                  }}
                >
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le filtre"
                  hitSlop={12}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <X size={22} color={t.text.muted} />
                </Pressable>
              </View>

              {/* Sections: each is a label + a wrapped row of toggleable chips. */}
              {resolvedSections.map((section, si) => (
                <View key={section.label || si}>
                  <Text style={[sheetStyles.sectionLabel, { color: t.text.muted }]}>
                    {section.label}
                  </Text>
                  <View style={sheetStyles.chipRow}>
                    {section.options.map((opt) => {
                      const isSelected = section.selected.has(opt.key);
                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={opt.label}
                          onPress={() => section.onToggle(opt.key)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: isSelected
                              ? t.brand.accent
                              : pressed ? t.border.subtle : t.surface.subtle,
                            borderWidth: 1,
                            borderColor: isSelected ? t.brand.accent : t.border.subtle,
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Text
                            style={{
                              color: isSelected ? "#FFFFFF" : t.text.body,
                              fontSize: 14,
                              fontFamily: ralewayFamily(isSelected ? "600" : "500"),
                              fontWeight: isSelected ? "600" : "500",
                            }}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* Actions */}
              <View style={sheetStyles.actionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Réinitialiser les filtres"
                  onPress={onReset}
                  disabled={totalSelected === 0}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: t.border.default,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: totalSelected === 0 ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: t.text.body,
                      fontSize: 15,
                      fontFamily: ralewayFamily("600"),
                      fontWeight: "600",
                    }}
                  >
                    Réinitialiser
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Voir ${resultCount} résultats`}
                  onPress={onClose}
                  style={({ pressed }) => ({
                    flex: 2,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontFamily: ralewayFamily("600"),
                      fontWeight: "600",
                    }}
                  >
                    Voir {resultCount} {resultCount === 1 ? "résultat" : "résultats"}
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 10,
    fontSize: 12,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  chipRow: {
    paddingHorizontal: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
  },
  actionsRow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: "row",
    columnGap: 12,
  },
});
