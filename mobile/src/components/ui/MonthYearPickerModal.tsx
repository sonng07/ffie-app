// MonthYearPickerModal — wraps the OS date picker so the user can jump the
// Events week-calendar to a chosen month/year. Uses the *system* picker
// (@react-native-community/datetimepicker), so it looks and feels native on
// each platform:
//
//   • iOS     → the wheel spinner sits in a bottom sheet with Annuler / OK.
//               (iOS has no month-year-only mode, so it's a full date spinner;
//               we only use the month + year — the caller snaps to that week.)
//   • Android → the OS dialog presents itself; we just translate its result.
//
// Reduced motion (P5): the iOS sheet uses no slide animation when the user has
// reduced motion enabled.
//
// IMPORTANT — like FederationMap, the native picker is loaded with a guarded
// `require()` rather than a static `import`: the library calls
// `TurboModuleRegistry.getEnforcing('RNCDatePicker')` the moment its JS
// evaluates, which *throws* on any binary that doesn't have the module linked
// (Expo Go, or a dev client built before `@react-native-community/datetimepicker`
// was added). We therefore (a) check `TurboModuleRegistry.get` first and only
// `require` when the module is actually linked, and (b) fall back to a short
// "rebuild required" notice otherwise. Run `npx expo run:ios` (or rebuild the
// dev client) to link it; production/EAS builds include it automatically.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
// Type-only import — erased at compile time, so it never touches the native module.
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type PickerComponent = React.ComponentType<{
  value: Date;
  mode?: "date" | "time" | "datetime";
  display?: "default" | "spinner" | "compact" | "inline" | "calendar" | "clock";
  locale?: string;
  textColor?: string;
  themeVariant?: "light" | "dark";
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  style?: object;
}>;

// Resolve the native picker LAZILY (first render), wrapped in try/catch. The
// library's spec does `TurboModuleRegistry.getEnforcing('RNCDatePicker')` on
// import, which throws on a binary that lacks the module — so we require it at
// runtime (when the TurboModule proxy is ready) and fall back to null if it
// throws. A module-top `.get` runs too early in bundle eval to be reliable.
function loadPicker(): PickerComponent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@react-native-community/datetimepicker").default as PickerComponent;
  } catch {
    return null;
  }
}

export function MonthYearPickerModal({
  visible,
  value,
  onConfirm,
  onClose,
  themeName = "light",
}: {
  visible: boolean;
  /** Date the picker opens on (the currently displayed month). */
  value: Date;
  /** Called with the picked date when the user confirms. */
  onConfirm: (date: Date) => void;
  onClose: () => void;
  themeName?: ThemeName;
}) {
  const t = themes[themeName];
  const reducedMotion = useReducedMotion();

  // Resolve the native picker once, lazily (runtime ready by first render).
  const DateTimePicker = useMemo(loadPicker, []);

  // iOS edits a draft until OK; Android commits straight from the dialog.
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  // iOS open/close animation (declared before the early returns to keep hook
  // order stable). A single 0→1 progress value drives BOTH the backdrop's
  // opacity (the tinted black fades) and the sheet's translateY (it slides) —
  // opacity + transform only, so it rides the native driver. We keep the modal
  // mounted through the exit so the fade-out can play before it unmounts.
  // Reduced motion (P5): snap, no fade/slide.
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reducedMotion) {
        anim.setValue(1);
        return;
      }
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.bezier(0.32, 0.72, 0, 1), // iOS drawer curve
        useNativeDriver: true,
      }).start();
    } else {
      if (reducedMotion) {
        anim.setValue(0);
        setMounted(false);
        return;
      }
      Animated.timing(anim, {
        toValue: 0,
        duration: 200, // exit a touch faster than enter
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, reducedMotion, anim]);

  // Native module missing (un-rebuilt binary): show a graceful notice instead
  // of crashing. Production builds always have it.
  if (!DateTimePicker) {
    if (!visible) return null;
    return (
      <Modal
        visible={visible}
        transparent
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={onClose}
      >
        <Pressable
          onPress={onClose}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 32 }}
        >
          <View
            style={{
              backgroundColor: t.surface.default,
              borderRadius: primitives.radii.lg,
              padding: 20,
            }}
          >
            <Text style={{ color: t.text.body, fontSize: 15, lineHeight: 21 }}>
              Le sélecteur de date nécessite une reconstruction de l'application.
            </Text>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // Android: the OS owns the dialog. Render the picker only while visible and
  // map its callback back onto confirm/close.
  if (Platform.OS !== "ios") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        onChange={(e: DateTimePickerEvent, d?: Date) => {
          if (e.type === "set" && d) onConfirm(d);
          else onClose();
        }}
      />
    );
  }

  // iOS: inline wheel spinner in a bottom sheet. Modal animation is "none" — we
  // drive the backdrop fade + sheet slide ourselves so the tinted black fades
  // (rather than sliding up with the sheet).
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetH || 600, 0], // 600 = pre-measurement fallback (stays offscreen)
  });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {/* Tinted black backdrop — fades in/out via opacity. */}
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", opacity: anim }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={onClose}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Animated.View
        onLayout={(e: LayoutChangeEvent) => setSheetH(e.nativeEvent.layout.height)}
        style={{
          backgroundColor: t.surface.default,
          borderTopLeftRadius: primitives.radii.xl,
          borderTopRightRadius: primitives.radii.xl,
          paddingBottom: 28,
          transform: [{ translateY }],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: t.border.default,
          }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ color: t.text.muted, fontSize: 16 }}>Annuler</Text>
          </Pressable>
          <Text
            style={{
              color: t.text.body,
              fontSize: 15,
              fontFamily: ralewayFamily("700"),
              fontWeight: "700",
            }}
          >
            Choisir le mois
          </Text>
          <Pressable onPress={() => onConfirm(draft)} hitSlop={8}>
            <Text
              style={{
                color: t.brand.accent,
                fontSize: 16,
                fontFamily: ralewayFamily("700"),
                fontWeight: "700",
              }}
            >
              OK
            </Text>
          </Pressable>
        </View>

        <DateTimePicker
          value={draft}
          mode="date"
          display="spinner"
          locale="fr-FR"
          textColor={t.text.body}
          themeVariant={themeName === "dark" ? "dark" : "light"}
          onChange={(_e: DateTimePickerEvent, d?: Date) => {
            if (d) setDraft(d);
          }}
          style={{ alignSelf: "stretch" }}
        />
      </Animated.View>
    </Modal>
  );
}
