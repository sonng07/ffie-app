// FfieFiguresScreen — l'écran « La FFIE en chiffres », ouvert en appuyant sur le
// logo FFIE de l'en-tête Accueil (FFIE-02). Une modale plein écran qui glisse depuis
// le bas (les deux rôles) et héberge l'infographie animée des chiffres clés de la
// fédération (MissionInfographic) sous un grand titre + un bouton de fermeture.
//
// L'infographie est un composant autonome (carte au dégradé marine) qui possède
// toute la présentation + le mouvement (comptage des nombres, balayage des jauges,
// apparition en cascade, et le respect du mouvement réduit — voir MissionInfographic).
// Ici on ne fait que l'encadrer : titre, sous-titre, fermeture. Comme l'écran s'ouvre
// directement SUR l'infographie (au lieu de la trouver loin sous le pli d'une page),
// on ne passe pas de `scrollY` — l'infographie se révèle au montage, en cascade.

import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER, LargeTitleHeader, useGroupedColors } from "@/components/ui/ios";
import { MissionInfographic } from "@/components/MissionInfographic";

export function FfieFiguresScreen({
  themeName = "light",
  onClose,
}: {
  themeName?: ThemeName;
  /** Ferme la modale des chiffres. */
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LargeTitleHeader
          title="La FFIE en chiffres"
          themeName={themeName}
          trailing={<CloseButton themeName={themeName} onPress={onClose} />}
        />

        {/* Sous-titre court sous le grand titre — situe l'infographie. */}
        <Text
          style={{
            paddingHorizontal: GUTTER,
            marginTop: 4,
            marginBottom: 16,
            color: t.text.muted,
            fontSize: 15,
            lineHeight: 21,
            fontFamily: ralewayFamily("400"),
          }}
        >
          La fédération de l'intégration électrique en un coup d'œil.
        </Text>

        <MissionInfographic />
      </ScrollView>
    </SafeAreaView>
  );
}

// Fermeture de modale façon iOS : un disque gris plein avec un X, dans l'emplacement
// de fin du grand titre. hitSlop élève le disque de 30 pt à une cible ≥ 44 pt.
// (Reprend le CloseButton d'AgendaModalScreen pour rester cohérent.)
function CloseButton({
  themeName,
  onPress,
}: {
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Fermer"
      accessibilityHint="Ferme les chiffres clés de la FFIE"
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.border.default,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <X size={18} color={t.text.muted} strokeWidth={2.5} />
    </Pressable>
  );
}
