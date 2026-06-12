// ProfileSkeleton — espace réservé de chargement pour ProfileScreen. Reflète la nouvelle
// mise en page : le hero d'identité bleu marine (avatar rond + lignes nom/rôle/adhérent) puis
// les cartes groupées Mon entreprise, Qualifications, Notifications push, Types d'alerte,
// Préférences, Compte et À propos, puis la note de version centrée. Mêmes gouttières, rayons
// de carte et largeurs de visuel en tête que le vrai écran pour que la substitution ne saute pas.
//
// Le hero se pose sur la surface de marque bleu marine fixe, ses espaces réservés sont donc
// des blocs blanc translucide plats (sans scintillement) plutôt que le SkeletonBlock gris —
// le même raisonnement que pour HomeHeader qui est statique. Le contenu groupé en dessous
// utilise le squelette à scintillement partagé.

import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { primitives, type ThemeName } from "@tokens";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonTextLine,
} from "@/components/ui/Skeleton";
import { HEADER_SURFACE } from "@/theme/brandHeader";

const NAVY = HEADER_SURFACE;
const HERO_BLOCK = "rgba(255,255,255,0.18)"; // espace réservé plat sur le bleu marine
const TOP_GAP = Platform.OS === "android" ? 14 : 12;
const LEAD_ICON_W = 24;
const LEAD_DOT_W = 12;

// Une ligne de liste groupée : un visuel en tête (boîte d'icône ou point), une ligne de
// titre, et un bloc de fin optionnel (valeur / badge / interrupteur). Le séparateur en fine
// ligne se décale au-delà du visuel en tête pour s'aligner sous le titre, comme InsetRow.
function RowSkeleton({
  isLast,
  leadingWidth = LEAD_ICON_W,
  trailingWidth,
  themeName,
}: {
  isLast: boolean;
  leadingWidth?: number;
  trailingWidth?: number;
  themeName: ThemeName;
}) {
  const c = useGroupedColors(themeName);
  const separatorInset = GUTTER + leadingWidth + 12;
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
        <SkeletonBlock width={leadingWidth} height={leadingWidth >= 20 ? 20 : 10} radius={leadingWidth >= 20 ? 6 : 5} themeName={themeName} />
        <View style={{ flex: 1 }}>
          <SkeletonTextLine width="50%" height={14} themeName={themeName} />
        </View>
        {trailingWidth ? (
          <SkeletonBlock width={trailingWidth} height={26} radius={primitives.radii.full} themeName={themeName} />
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
    </View>
  );
}

function GroupCard({ children, themeName }: { children: React.ReactNode; themeName: ThemeName }) {
  const c = useGroupedColors(themeName);
  return (
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
      {children}
    </View>
  );
}

function GroupHeader({ width, themeName }: { width: number; themeName: ThemeName }) {
  return (
    <View style={{ marginLeft: GUTTER + 4, marginBottom: 7 }}>
      <SkeletonBlock width={width} height={11} themeName={themeName} />
    </View>
  );
}

function Group({
  headerWidth,
  children,
  themeName,
}: {
  headerWidth: number;
  children: React.ReactNode;
  themeName: ThemeName;
}) {
  return (
    <View style={{ marginBottom: 28 }}>
      <GroupHeader width={headerWidth} themeName={themeName} />
      <GroupCard themeName={themeName}>{children}</GroupCard>
    </View>
  );
}

export function ProfileSkeleton({ themeName = "light" }: { themeName?: ThemeName }) {
  const c = useGroupedColors(themeName);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Fond bleu marine pour le rebond de suroscillation au-dessus du hero, correspondant
          au vrai écran (l'enveloppe couleur-page sous le hero le recouvre). */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 200, backgroundColor: NAVY }}
      />
      <SkeletonGroup>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1 }}
          scrollEnabled={false}
        >
          {/* En-tête d'identité — espaces réservés translucides plats sur la bande bleu marine.
              Correspond au hero compact de ProfileScreen (avatar 44pt, paddingBottom
              16, identité serrée sur trois lignes). */}
          <View
            style={{
              backgroundColor: NAVY,
              paddingTop: insets.top + TOP_GAP,
              paddingHorizontal: GUTTER,
              paddingBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              columnGap: 12,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: HERO_BLOCK }} />
            <View style={{ flex: 1, rowGap: 6 }}>
              <View style={{ width: "55%", height: 17, borderRadius: 5, backgroundColor: HERO_BLOCK }} />
              <View style={{ width: "38%", height: 12, borderRadius: 4, backgroundColor: HERO_BLOCK }} />
              <View style={{ width: "68%", height: 11, borderRadius: 4, backgroundColor: HERO_BLOCK }} />
            </View>
          </View>

          {/* Enveloppe couleur-page sous le hero — recouvre le fond bleu marine pour que
              la couleur d'en-tête n'enveloppe que le bloc d'identité. */}
          <View style={{ flexGrow: 1, backgroundColor: c.pageBg, paddingBottom: 32 }}>
          <View style={{ height: 12 }} />

          {/* Mon entreprise — 3 lignes de faits (icône + valeur). */}
          <Group headerWidth={95} themeName={themeName}>
            <RowSkeleton isLast={false} trailingWidth={88} themeName={themeName} />
            <RowSkeleton isLast={false} trailingWidth={88} themeName={themeName} />
            <RowSkeleton isLast trailingWidth={70} themeName={themeName} />
          </Group>

          {/* Qualifications — 2 lignes (coche + badge Valide). */}
          <Group headerWidth={110} themeName={themeName}>
            <RowSkeleton isLast={false} trailingWidth={48} themeName={themeName} />
            <RowSkeleton isLast trailingWidth={48} themeName={themeName} />
          </Group>

          {/* Notifications push — 1 ligne d'interrupteur (point + interrupteur). */}
          <Group headerWidth={130} themeName={themeName}>
            <RowSkeleton isLast leadingWidth={LEAD_DOT_W} trailingWidth={48} themeName={themeName} />
          </Group>

          {/* Types d'alerte — 5 lignes d'interrupteur. */}
          <Group headerWidth={80} themeName={themeName}>
            <RowSkeleton isLast={false} leadingWidth={LEAD_DOT_W} trailingWidth={48} themeName={themeName} />
            <RowSkeleton isLast={false} leadingWidth={LEAD_DOT_W} trailingWidth={48} themeName={themeName} />
            <RowSkeleton isLast={false} leadingWidth={LEAD_DOT_W} trailingWidth={48} themeName={themeName} />
            <RowSkeleton isLast={false} leadingWidth={LEAD_DOT_W} trailingWidth={48} themeName={themeName} />
            <RowSkeleton isLast leadingWidth={LEAD_DOT_W} trailingWidth={48} themeName={themeName} />
          </Group>

          {/* Préférences — 2 lignes. */}
          <Group headerWidth={100} themeName={themeName}>
            <RowSkeleton isLast={false} trailingWidth={80} themeName={themeName} />
            <RowSkeleton isLast themeName={themeName} />
          </Group>

          {/* Compte — 3 lignes. */}
          <Group headerWidth={75} themeName={themeName}>
            <RowSkeleton isLast={false} themeName={themeName} />
            <RowSkeleton isLast={false} themeName={themeName} />
            <RowSkeleton isLast themeName={themeName} />
          </Group>

          {/* À propos — 1 ligne (Conditions d'utilisation, FFIE-18). */}
          <Group headerWidth={70} themeName={themeName}>
            <RowSkeleton isLast themeName={themeName} />
          </Group>

          {/* Note de version centrée (« FFIE mobile v0.7 · aperçu du design »). */}
          <View style={{ alignItems: "center", marginTop: 4 }}>
            <SkeletonTextLine width={170} height={11} themeName={themeName} />
          </View>
          </View>
        </ScrollView>
      </SkeletonGroup>
    </View>
  );
}
