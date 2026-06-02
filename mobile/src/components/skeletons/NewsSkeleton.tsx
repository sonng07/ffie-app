// NewsSkeleton — loading placeholder for NewsScreen. Mirrors its layout 1:1:
// large title, a full-width hero card (16:9 image + tags + headline + excerpt),
// the "Filter by" divider, then the 2-column grid of article cards, and the
// bottom pagination. Same gutters / aspect ratios / column math as NewsScreen,
// so nothing shifts when the real feed lands.

import React from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { GUTTER, LargeTitleHeader, useGroupedColors } from "@/components/ui/ios";
import {
  SkeletonBlock,
  SkeletonCircle,
  SkeletonGroup,
  SkeletonTextLine,
} from "@/components/ui/Skeleton";

const COL_GAP = 14;
const ROW_GAP = 18;

// One grid card placeholder: 4:3 image, a small tag, a 2-line title, a date.
function GridCardSkeleton({ width, themeName }: { width: number; themeName: ThemeName }) {
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
        <SkeletonBlock width={64} height={16} radius={primitives.radii.full} themeName={themeName} />
        <View style={{ marginTop: 10, rowGap: 5 }}>
          <SkeletonTextLine width="95%" height={12} themeName={themeName} />
          <SkeletonTextLine width="70%" height={12} themeName={themeName} />
        </View>
        <SkeletonTextLine width={56} height={10} themeName={themeName} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

export function NewsSkeleton({ themeName = "light" }: { themeName?: ThemeName }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { width: screenW } = useWindowDimensions();
  const colWidth = (screenW - GUTTER * 2 - COL_GAP) / 2;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <SkeletonGroup>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} scrollEnabled={false}>
          <LargeTitleHeader title="Actualités" themeName={themeName} />

          {/* News / Events segmented control (sits under the large title). */}
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 4 }}>
            <SkeletonBlock width="100%" height={40} radius={primitives.radii.md} themeName={themeName} />
          </View>

          <View style={{ paddingHorizontal: GUTTER, paddingTop: 4 }}>
            {/* Hero card */}
            <View
              style={{
                backgroundColor: c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: c.cardBorder ? 1 : 0,
                borderColor: c.cardBorder,
                overflow: "hidden",
              }}
            >
              <SkeletonBlock width="100%" aspectRatio={16 / 9} radius={0} themeName={themeName} />
              <View style={{ padding: 16 }}>
                <SkeletonBlock
                  width={84}
                  height={18}
                  radius={primitives.radii.full}
                  themeName={themeName}
                />
                <View style={{ marginTop: 12, rowGap: 7 }}>
                  <SkeletonTextLine width="92%" height={20} themeName={themeName} />
                  <SkeletonTextLine width="66%" height={20} themeName={themeName} />
                </View>
                <View style={{ marginTop: 12, rowGap: 5 }}>
                  <SkeletonTextLine width="100%" height={13} themeName={themeName} />
                  <SkeletonTextLine width="80%" height={13} themeName={themeName} />
                </View>
                <SkeletonTextLine
                  width={72}
                  height={11}
                  themeName={themeName}
                  style={{ marginTop: 14 }}
                />
              </View>
            </View>

            {/* "Filter by" divider row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                columnGap: 10,
                marginTop: 22,
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />
              <SkeletonBlock width={56} height={12} themeName={themeName} />
              <SkeletonBlock width={40} height={32} radius={primitives.radii.md} themeName={themeName} />
            </View>

            {/* 2-column grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: COL_GAP,
                rowGap: ROW_GAP,
                marginTop: 8,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <GridCardSkeleton key={i} width={colWidth} themeName={themeName} />
              ))}
            </View>
          </View>

          {/* Pagination — arrows + page tokens */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              columnGap: 14,
              marginTop: 28,
            }}
          >
            <SkeletonCircle size={40} themeName={themeName} />
            <View style={{ flexDirection: "row", columnGap: 6 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} width={30} height={30} radius={15} themeName={themeName} />
              ))}
            </View>
            <SkeletonCircle size={40} themeName={themeName} />
          </View>
        </ScrollView>
      </SkeletonGroup>
    </SafeAreaView>
  );
}
