// BottomTabBar — bande d'onglets faite maison.
//
// Pourquoi faite maison, pas react-navigation :
//   - la v1 a 1 écran principal par rôle ; les onglets du bas sont du pur habillage
//   - garde le design system comme source de vérité unique (tokens, thème)
//   - basculer vers react-navigation plus tard préserve le contrat :
//     la même forme `tabs` + `activeKey` + `onSelect` vit derrière
//     une enveloppe Navigator.
//
// Contrat :
//   - tabs : config ordonnée ; la barre rend dans cet ordre, à largeurs égales
//   - activeKey : pilote le style de l'état actif
//   - onSelect : appelé avec la clé de l'onglet touché
//
// Mouvement (selon emil-design-eng) : pas d'animation d'entrée sur les onglets — ce sont
// de l'habillage, pas du contenu. La seule animation est une réduction d'échelle de 100ms
// à l'appui (gérée par la prop pressed de Pressable). Pas d'indicateur d'actif rebondissant.
//
// Accessibilité :
//   - role="tab" + état sélectionné selon WCAG
//   - cible tactile ≥48pt (hauteur : 56 + inset de safe area)
//   - le libellé est lu par VoiceOver même s'il est aussi visible
//   - état actif communiqué par couleur + graisse (PAS la couleur seule)
//     pour qu'il survive aux utilisateurs daltoniens (selon accessibility-decisions)

import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import type { AnyTabConfig, TabKey } from "@/navigation/tabs";

export type BottomTabBarProps = {
  tabs: ReadonlyArray<AnyTabConfig>;
  activeKey: TabKey;
  onSelect: (key: TabKey) => void;
  themeName?: ThemeName;
};

export function BottomTabBar({
  tabs,
  activeKey,
  onSelect,
  themeName = "light",
}: BottomTabBarProps) {
  const t = themes[themeName];
  const insets = useSafeAreaInsets();

  // Espace de respiration supplémentaire au-dessus et en dessous de la rangée d'onglets,
  // en plus de l'inset de safe area du bas de l'appareil (indicateur d'accueil).
  const VERTICAL_PADDING = 12;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: t.surface.default,
          borderTopColor: t.border.subtle,
          paddingTop: VERTICAL_PADDING,
          paddingBottom: insets.bottom + VERTICAL_PADDING,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={isActive}
            themeName={themeName}
            onPress={() => onSelect(tab.key)}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  tab,
  isActive,
  themeName,
  onPress,
}: {
  tab: AnyTabConfig;
  isActive: boolean;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const Icon = tab.icon;

  // Un onglet-ACTION (role:"button", ex. « Adhérer ») ouvre une modale au lieu de
  // devenir l'onglet actif : il s'annonce comme un bouton, SANS état « sélectionné »
  // (sinon VoiceOver l'annoncerait comme un onglet sélectionnable qui ne l'est jamais
  // — WCAG 4.1.2). Il ne reçoit jamais la teinte/graisse d'actif non plus.
  const isAction = tab.role === "button";

  // Les barres d'onglets iOS communiquent l'onglet actif avec la TEINTE d'accent. On ajoute
  // une différence de graisse sur le libellé comme signal non chromatique (WCAG 1.4.1) pour
  // que les utilisateurs daltoniens perçoivent encore la sélection sans un point façon Material.
  const fg = isActive ? t.brand.accent : t.text.muted;
  const weight: "600" | "400" = isActive ? "600" : "400";

  return (
    <Pressable
      accessibilityRole={isAction ? "button" : "tab"}
      accessibilityState={isAction ? undefined : { selected: isActive }}
      accessibilityLabel={tab.label}
      accessibilityHint={tab.accessibilityHint}
      onPress={onPress}
      style={({ pressed }): ViewStyle => ({
        ...styles.tab,
        opacity: pressed ? 0.5 : 1,
      })}
      hitSlop={4}
    >
      <Icon size={26} color={fg} strokeWidth={isActive ? 2.2 : 1.8} />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          fontFamily: ralewayFamily(weight),
          fontWeight: weight,
          color: fg,
          marginTop: 3,
          letterSpacing: 0,
        }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth, // séparateur fin façon iOS
  },
  tab: {
    flex: 1,
    minHeight: 50, // hauteur de barre d'onglets iOS ; toujours une cible ≥44 avec le hitSlop
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
});
