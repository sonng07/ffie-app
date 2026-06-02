// LibrarySkeleton — loading placeholder for DocLibraryScreen. Mirrors it:
// large title, the rounded search field + filter button, a result-count line,
// then ONE grouped inset card of document rows (PDF-thumbnail leading, two text
// lines, a trailing "saved"/lock badge), a "show more" button, and the bottom
// pagination. Same gutters, thumb size, row min-height, and page rhythm — so
// nothing shifts when the real paginated list lands.

import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, type ThemeName } from "@tokens";
import { GUTTER, LargeTitleHeader, useGroupedColors } from "@/components/ui/ios";
import {
  SkeletonBlock,
  SkeletonCircle,
  SkeletonGroup,
  SkeletonTextLine,
} from "@/components/ui/Skeleton";

const THUMB_WIDTH = 50;
const THUMB_HEIGHT = 66;
// The screen opens showing INITIAL_VISIBLE rows before "Afficher plus".
const VISIBLE_ROWS = 10;

// One grouped-list document row: thumbnail + title/subtitle + trailing badge,
// with the iOS hairline separator inset past the thumbnail.
function DocRowSkeleton({
  isLast,
  themeName,
}: {
  isLast: boolean;
  themeName: ThemeName;
}) {
  const c = useGroupedColors(themeName);
  const separatorInset = GUTTER + THUMB_WIDTH + 12;
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          columnGap: 12,
          paddingHorizontal: GUTTER,
          minHeight: 48,
          paddingVertical: 14,
        }}
      >
        <SkeletonBlock
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          radius={3}
          themeName={themeName}
        />
        <View style={{ flex: 1, rowGap: 7 }}>
          <SkeletonTextLine width="80%" height={14} themeName={themeName} />
          <SkeletonTextLine width="50%" height={12} themeName={themeName} />
        </View>
        <SkeletonBlock width={44} height={18} radius={primitives.radii.full} themeName={themeName} />
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
    </View>
  );
}

export function LibrarySkeleton({ themeName = "light" }: { themeName?: ThemeName }) {
  const c = useGroupedColors(themeName);
  const searchH = Platform.OS === "android" ? 46 : 38;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <SkeletonGroup>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} scrollEnabled={false}>
          <LargeTitleHeader title="Bibliothèque" themeName={themeName} />

          {/* Search field + filter button */}
          <View
            style={{
              paddingHorizontal: GUTTER,
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "center",
              columnGap: 10,
            }}
          >
            <SkeletonBlock width="100%" height={searchH} radius={10} themeName={themeName} style={{ flex: 1 }} />
            <SkeletonBlock width={searchH} height={searchH} radius={10} themeName={themeName} />
          </View>

          {/* Result-count line ("335 documents") */}
          <View style={{ paddingHorizontal: GUTTER + 4, marginBottom: 14 }}>
            <SkeletonBlock width={104} height={13} themeName={themeName} />
          </View>

          {/* One grouped inset card for the current (paged) slice. */}
          <View
            style={{
              marginHorizontal: GUTTER,
              backgroundColor: c.cardBg,
              borderRadius: primitives.radii.lg,
              borderWidth: c.cardBorder ? 1 : 0,
              borderColor: c.cardBorder,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: VISIBLE_ROWS }).map((_, i) => (
              <DocRowSkeleton key={i} isLast={i === VISIBLE_ROWS - 1} themeName={themeName} />
            ))}
          </View>

          {/* "Afficher plus" button */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <SkeletonBlock width={170} height={40} radius={20} themeName={themeName} />
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
