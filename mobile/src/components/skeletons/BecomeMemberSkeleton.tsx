// BecomeMemberSkeleton — espace réservé de chargement pour BecomeMemberScreen (Adhérer à
// la FFIE). Le reflète : le titre 34pt + sous-titre, le champ de recherche, la carte
// d'annuaire groupée de lignes de fédération (zone + nom + chevron, séparées par une fine
// ligne), la légende « affichage de X sur Y », la note d'éligibilité et le lien « Conditions
// d'utilisation » (FFIE-18). Utilise la propre constante de marge supérieure de l'écran pour
// que le titre atterrisse au même endroit.

import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, semantics, type ThemeName } from "@tokens";
import { useGroupedColors } from "@/components/ui/ios";
import { SkeletonBlock, SkeletonGroup, SkeletonTextLine } from "@/components/ui/Skeleton";

const GUTTER = semantics.spacing.gutter.mobile;
const PAGE_TOP_PADDING = Platform.OS === "android" ? 24 : 12;

// Une ligne de fédération : ligne de zone + ligne de nom de fédération + chevron de fin,
// fine ligne décalée vers la gouttière (correspond à FederationRow — pas de visuel en tête).
function FederationRowSkeleton({
  isLast,
  themeName,
}: {
  isLast: boolean;
  themeName: ThemeName;
}) {
  const c = useGroupedColors(themeName);
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          columnGap: 12,
          paddingHorizontal: GUTTER,
          minHeight: 48,
          paddingVertical: 12,
        }}
      >
        <View style={{ flex: 1, rowGap: 7 }}>
          <SkeletonTextLine width="45%" height={15} themeName={themeName} />
          <SkeletonTextLine width="72%" height={12} themeName={themeName} />
        </View>
        <SkeletonBlock width={20} height={20} radius={primitives.radii.sm} themeName={themeName} />
      </View>
      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: c.separator,
            marginLeft: GUTTER,
          }}
        />
      ) : null}
    </View>
  );
}

export function BecomeMemberSkeleton({ themeName = "light" }: { themeName?: ThemeName }) {
  const c = useGroupedColors(themeName);
  const ROWS = 10;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <SkeletonGroup>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} scrollEnabled={false}>
          {/* Titre + sous-titre */}
          <View style={{ paddingHorizontal: GUTTER, paddingTop: PAGE_TOP_PADDING, paddingBottom: 6 }}>
            <SkeletonTextLine width="55%" height={32} themeName={themeName} />
            <View style={{ marginTop: 10 }}>
              <SkeletonTextLine width="85%" height={14} themeName={themeName} />
            </View>
          </View>

          {/* Champ de recherche */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 16, marginBottom: 12 }}>
            <SkeletonBlock width="100%" height={38} radius={10} themeName={themeName} />
          </View>

          {/* Carte d'annuaire */}
          <View style={{ marginBottom: 28 }}>
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
              {Array.from({ length: ROWS }).map((_, i) => (
                <FederationRowSkeleton key={i} isLast={i === ROWS - 1} themeName={themeName} />
              ))}
            </View>

            {/* Bouton « Voir plus » */}
            <View style={{ marginTop: 12, marginHorizontal: GUTTER }}>
              <SkeletonBlock width="100%" height={44} radius={primitives.radii.md} themeName={themeName} />
            </View>

            {/* Légende « Affichage de X sur Y » */}
            <View style={{ marginTop: 10, marginHorizontal: GUTTER + 4 }}>
              <SkeletonTextLine width="60%" height={12} themeName={themeName} />
            </View>
          </View>

          {/* Note d'éligibilité */}
          <View style={{ paddingHorizontal: GUTTER }}>
            <SkeletonBlock width="100%" height={92} radius={primitives.radii.md} themeName={themeName} />
          </View>

          {/* Lien « Conditions d'utilisation » centré (FFIE-18). */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <SkeletonTextLine width={150} height={13} themeName={themeName} />
          </View>
        </ScrollView>
      </SkeletonGroup>
    </SafeAreaView>
  );
}
