// Skeleton — loading-state placeholder primitives.
//
// A skeleton screen mirrors the SHAPE of the page that's about to land:
// same gutters, same card sizes, same row rhythm, so the layout doesn't jump
// when real content swaps in.
//
// Motion treatment: each block is a calm resting grey with a soft highlight
// "sweep" travelling left→right across it, in unison (a single shared Animated
// value under a SkeletonGroup drives every block) — the modern shimmer look,
// reading clearly as "loading" rather than decoration. One native-driven
// animation, one gradient per block.
//
// Motion safety (non-negotiable, P5): when the OS "Reduce Motion" setting is
// on, the sweep is disabled entirely and blocks render as a flat, calm grey —
// no looping animation at all.
//
// Usage:
//   <SkeletonGroup themeName={themeName}>
//     <SkeletonBlock width={120} height={16} />
//     <SkeletonBlock width="100%" aspectRatio={16 / 9} radius={primitives.radii.lg} />
//   </SkeletonGroup>

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { primitives, themes, type ThemeName } from "@tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// The shared sweep progress (0 → 1, looping). Null when no group wraps a block
// or when Reduce Motion is on — in which case the block renders flat, no sheen.
const SweepContext = createContext<Animated.Value | null>(null);

// One full traverse of the highlight across a block. Slow enough to read as a
// gentle, non-distracting shimmer; the linear loop restarts cleanly each pass.
const SWEEP_PERIOD = 1300; // ms per left→right pass

// ---------------------------------------------------------------------------
// SkeletonGroup — owns the looping sweep and shares it with every SkeletonBlock
// underneath, so the whole screen shimmers as one. One animation, native-driven.
// ---------------------------------------------------------------------------
export function SkeletonGroup({ children }: { children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      // Hold at rest — blocks fall back to a flat, calm placeholder, no loop.
      progress.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SWEEP_PERIOD,
        easing: Easing.linear, // steady travel so the loop seam is invisible
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [reducedMotion, progress]);

  // Null when reduce-motion is on → SkeletonBlock skips the sheen entirely.
  return (
    <SweepContext.Provider value={reducedMotion ? null : progress}>
      {children}
    </SweepContext.Provider>
  );
}

// Resting fill tone — visible against both the white/grey page and the grouped
// card surfaces, in every theme. border.default is the decorative divider grey
// (gray200 light / gray700 dark), which reads as a classic skeleton block.
function skeletonTone(themeName: ThemeName): string {
  return themes[themeName].border.default;
}

// The travelling highlight: a soft band brighter than the resting fill, fading
// to transparent at both edges. White reads as a sheen over the grey in every
// theme; dark mode needs far less alpha to avoid a harsh streak.
function skeletonSheen(themeName: ThemeName): [string, string, string] {
  const edge = "rgba(255,255,255,0)";
  const highlight = themeName === "dark" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.55)";
  return [edge, highlight, edge];
}

// ---------------------------------------------------------------------------
// SkeletonBlock — one placeholder rectangle. A flat resting grey with the
// shared highlight sweeping across it. Width/height/aspectRatio/radius mirror
// the real element it stands in for.
// ---------------------------------------------------------------------------
export function SkeletonBlock({
  width = "100%",
  height,
  aspectRatio,
  radius = primitives.radii.sm,
  themeName = "light",
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  radius?: number;
  themeName?: ThemeName;
  style?: ViewStyle;
}) {
  const progress = useContext(SweepContext);
  // Measured pixel width drives the sweep distance (percentage widths can't be
  // interpolated, so we read the laid-out size once).
  const [measuredW, setMeasuredW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== measuredW) setMeasuredW(w);
  };

  // Travel the highlight from fully off the left edge to fully off the right.
  // Null until the block is laid out and a (motion-enabled) group is present.
  const translateX =
    progress != null && measuredW > 0
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [-measuredW, measuredW] })
      : null;

  return (
    <View
      onLayout={onLayout}
      // Skeletons are decorative — keep them off the accessibility tree so a
      // screen reader announces nothing while content loads.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          aspectRatio,
          borderRadius: radius,
          backgroundColor: skeletonTone(themeName),
          // A touch of transparency keeps the resting block soft against the
          // page; the sheen does the "alive" work.
          opacity: 0.7,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {translateX ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}
        >
          <LinearGradient
            colors={skeletonSheen(themeName)}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

// SkeletonCircle — convenience for avatars / monograms / round tiles.
export function SkeletonCircle({
  size,
  themeName = "light",
  style,
}: {
  size: number;
  themeName?: ThemeName;
  style?: ViewStyle;
}) {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      radius={size / 2}
      themeName={themeName}
      style={style}
    />
  );
}

// SkeletonTextLine — a single line of "text". `width` lets callers vary line
// lengths so a paragraph reads as a paragraph, not a slab.
export function SkeletonTextLine({
  width = "100%",
  height = 12,
  themeName = "light",
  style,
}: {
  width?: DimensionValue;
  height?: number;
  themeName?: ThemeName;
  style?: ViewStyle;
}) {
  return (
    <SkeletonBlock
      width={width}
      height={height}
      radius={primitives.radii.sm}
      themeName={themeName}
      style={StyleSheet.flatten([{ marginVertical: 2 }, style])}
    />
  );
}
