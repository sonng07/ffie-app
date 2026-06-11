// SegmentedControl — the app's standard toggle for switching between 2+
// mutually-exclusive options (the iOS "segmented control" pattern). One shared
// component so every toggle in the app looks and moves identically; screens
// pass their own option union and selection state.
//
// Visual: a recessed track (grouped-card fill + hairline border) with one
// elevated accent "thumb" marking the selection. Labels are Raleway 600,
// muted when unselected, white over the thumb.
//
// Motion: a single Animated.Value tracks the selected index; the thumb's
// translateX and each label's white-overlay opacity both interpolate from it,
// so the colour crossfades in lockstep with the slide. Only transform/opacity
// animate → the whole thing rides the native driver. 220ms strong ease-out: a
// tap-triggered toggle should feel immediate, not glide.
//
// Reduced motion is non-negotiable (P5): we snap the value to the target index
// instead of timing to it, so the thumb jumps straight to the end state and
// the white label switches without a crossfade.

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { useGroupedColors } from "@/components/ui/ios";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SEG_PAD = 3; // track inset around the thumb
const SEG_GAP = 3; // space between segments
const SEG_H = 34; // segment / thumb height

export type SegmentOption<K extends string> = { key: K; label: string };

export function SegmentedControl<K extends string>({
  themeName = "light",
  value,
  options,
  onChange,
  tint,
}: {
  themeName?: ThemeName;
  value: K;
  options: SegmentOption<K>[];
  onChange: (key: K) => void;
  /** Selected-thumb colour. Defaults to brand teal[700] (#027489) — the app's
   *  accessible action teal, matching the primary CTAs and the News filter
   *  pills. The label over the thumb is always white, so any override must be
   *  dark enough for AA (teal[600] #0094A9 is only ~3.6:1 on white — too light). */
  tint?: string;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const reducedMotion = useReducedMotion();
  const thumbColor = tint ?? primitives.colors.brand.teal[700];

  const bw = c.cardBorder ? 1 : 0;
  const n = options.length;
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );

  // Track width is measured (onLayout); the thumb width / travel derive from
  // it. Until measured we skip the thumb to avoid a flash at the wrong spot.
  const [trackW, setTrackW] = useState(0);
  const anim = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(selectedIndex); // snap — no movement
      return;
    }
    Animated.timing(anim, {
      toValue: selectedIndex,
      duration: 220,
      easing: Easing.bezier(0.23, 1, 0.32, 1), // strong ease-out
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, reducedMotion, anim]);

  // Equal segments: content box minus the inter-segment gaps, split N ways.
  const contentW = Math.max(0, trackW - 2 * bw - 2 * SEG_PAD);
  const segW = n > 0 ? (contentW - SEG_GAP * (n - 1)) / n : 0;
  const ready = trackW > 0 && segW > 0 && n > 1;

  const translateX = anim.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * (segW + SEG_GAP)),
  });

  return (
    <View
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        backgroundColor: c.cardBg,
        borderRadius: primitives.radii.md,
        borderWidth: bw,
        borderColor: c.cardBorder,
        padding: SEG_PAD,
        columnGap: SEG_GAP,
      }}
    >
      {/* Sliding thumb — sits behind the labels, no hit testing of its own. */}
      {ready ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: SEG_PAD,
            left: SEG_PAD,
            width: segW,
            height: SEG_H,
            borderRadius: primitives.radii.sm,
            backgroundColor: thumbColor,
            transform: [{ translateX }],
          }}
        />
      ) : null}

      {options.map((opt, i) => {
        const selected = opt.key === value;
        // White label fades in as the thumb arrives over this segment and out
        // as it leaves — a 0→1→0 ramp centred on this index.
        const whiteOpacity = anim.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [0, 1, 0],
          extrapolate: "clamp",
        });
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.key)}
            style={{
              flex: 1,
              height: SEG_H,
              borderRadius: primitives.radii.sm,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            {/* Two stacked copies span the full segment width (so longer
                labels shrink-to-fit identically and stay aligned): muted base +
                white overlay. Crossfading the overlay's opacity is
                native-driver-safe, avoiding an animated `color`. */}
            <View style={{ width: "100%" }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{
                  color: t.text.muted,
                  fontSize: 13,
                  fontFamily: ralewayFamily("600"),
                  fontWeight: "600",
                  letterSpacing: 0.1,
                  textAlign: "center",
                }}
              >
                {opt.label}
              </Text>
              <Animated.Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontFamily: ralewayFamily("600"),
                  fontWeight: "600",
                  letterSpacing: 0.1,
                  opacity: reducedMotion ? (selected ? 1 : 0) : whiteOpacity,
                }}
              >
                {opt.label}
              </Animated.Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
