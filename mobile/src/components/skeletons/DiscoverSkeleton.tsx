// DiscoverSkeleton — loading placeholder for DiscoverScreen (Trades). Mirrors
// it: large title + intro paragraph, the domains accordion (titles + "+" with
// hairlines), two full-width feature cards, the "professions of tomorrow"
// heading + intro, the 2-column training grid, and the "See more" button.

import React from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { GUTTER, LargeTitleHeader, useGroupedColors } from "@/components/ui/ios";
import { SkeletonBlock, SkeletonGroup, SkeletonTextLine } from "@/components/ui/Skeleton";

const GRID_GAP = 14;

function FeatureCardSkeleton({ themeName }: { themeName: ThemeName }) {
  const c = useGroupedColors(themeName);
  return (
    <View
      style={{
        backgroundColor: c.cardBg,
        borderRadius: primitives.radii.lg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        padding: 18,
      }}
    >
      <SkeletonTextLine width="60%" height={16} themeName={themeName} />
      <SkeletonBlock width={32} height={3} radius={2} themeName={themeName} style={{ marginTop: 10 }} />
      <View style={{ marginTop: 14, rowGap: 6 }}>
        <SkeletonTextLine width="100%" height={13} themeName={themeName} />
        <SkeletonTextLine width="72%" height={13} themeName={themeName} />
      </View>
    </View>
  );
}

function TrainingCardSkeleton({ width, themeName }: { width: number; themeName: ThemeName }) {
  const c = useGroupedColors(themeName);
  return (
    <View
      style={{
        width,
        backgroundColor: c.cardBg,
        borderRadius: primitives.radii.lg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        overflow: "hidden",
      }}
    >
      <SkeletonBlock width="100%" aspectRatio={4 / 3} radius={0} themeName={themeName} />
      <View style={{ padding: 12 }}>
        <SkeletonTextLine width="85%" height={14} themeName={themeName} />
        <View style={{ marginTop: 8, rowGap: 5 }}>
          <SkeletonTextLine width="100%" height={12} themeName={themeName} />
          <SkeletonTextLine width="60%" height={12} themeName={themeName} />
        </View>
        <SkeletonTextLine width={72} height={12} themeName={themeName} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

export function DiscoverSkeleton({ themeName = "light" }: { themeName?: ThemeName }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { width: screenW } = useWindowDimensions();
  const colW = (screenW - GUTTER * 2 - GRID_GAP) / 2;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <SkeletonGroup>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} scrollEnabled={false}>
          <LargeTitleHeader title="Métiers" themeName={themeName} />

          {/* Métiers / Vidéos / Calculateurs segmented control. */}
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 18 }}>
            <SkeletonBlock width="100%" height={40} radius={primitives.radii.md} themeName={themeName} />
          </View>

          {/* Intro paragraph */}
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 2, rowGap: 6 }}>
            <SkeletonTextLine width="100%" height={14} themeName={themeName} />
            <SkeletonTextLine width="95%" height={14} themeName={themeName} />
            <SkeletonTextLine width="60%" height={14} themeName={themeName} />
          </View>

          {/* Domains accordion */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    columnGap: 12,
                    minHeight: 52,
                    paddingVertical: 16,
                  }}
                >
                  <SkeletonTextLine width="55%" height={16} themeName={themeName} style={{ flex: 0 }} />
                  <View style={{ flex: 1 }} />
                  <SkeletonBlock width={22} height={22} radius={primitives.radii.sm} themeName={themeName} />
                </View>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />
              </View>
            ))}
          </View>

          {/* Feature cards */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 24, rowGap: 14 }}>
            <FeatureCardSkeleton themeName={themeName} />
            <FeatureCardSkeleton themeName={themeName} />
          </View>

          {/* "Professions of tomorrow" heading + intro */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 34, rowGap: 10 }}>
            <SkeletonTextLine width="70%" height={20} themeName={themeName} />
            <View style={{ rowGap: 6, marginTop: 4 }}>
              <SkeletonTextLine width="100%" height={13} themeName={themeName} />
              <SkeletonTextLine width="80%" height={13} themeName={themeName} />
            </View>
          </View>

          {/* Training grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              columnGap: GRID_GAP,
              rowGap: 18,
              paddingHorizontal: GUTTER,
              marginTop: 20,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <TrainingCardSkeleton key={i} width={colW} themeName={themeName} />
            ))}
          </View>

          {/* "See more training" button */}
          <View style={{ alignItems: "center", marginTop: 22 }}>
            <SkeletonBlock width={220} height={48} radius={primitives.radii.md} themeName={themeName} />
          </View>
        </ScrollView>
      </SkeletonGroup>
    </SafeAreaView>
  );
}
