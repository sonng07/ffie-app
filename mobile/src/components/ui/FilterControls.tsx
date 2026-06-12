// Contrôles de filtre partagés — le motif bouton de filtre + feuille du bas FFIE,
// extrait de l'écran Bibliothèque pour que chaque écran qui filtre une liste utilise
// le même style visuel et le même mouvement. Utilisé par la Bibliothèque (filtrer les
// documents par statut) et les Actualités (filtrer les articles par catégorie).
//
// Deux exports :
//   - FilterButton — le déclencheur arrondi de 38×38 avec un badge de compteur actif.
//     Remplissage à l'accent de marque quand un filtre est actif, bordure fine dans les
//     thèmes qui s'appuient sur les bordures (sunlight).
//   - FilterSheet — la feuille du bas animée de puces basculables, avec les
//     actions Réinitialiser + « Voir N résultats ». Application immédiate : les appuis
//     sur les puces mettent à jour l'état de filtre de l'appelant tout de suite et la liste
//     se réaffiche derrière le voile assombri ; le bouton d'action n'est qu'un moyen de fermer.
//
// Les deux sont génériques sur le type de clé d'option K (une union de chaînes), donc un
// appelant passe sa propre liste d'options et un Set<K> de clés sélectionnées.

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { displayFamily, ralewayFamily } from "@/theme/fonts";
import { useGroupedColors } from "@/components/ui/ios";

export type FilterOption<K extends string> = { key: K; label: string };

/** Un groupe de puces titré à l'intérieur de la feuille. Une feuille peut en empiler
 *  plusieurs — la Bibliothèque empile « Famille » + « Hors ligne ». Les clés sont de
 *  simples chaînes à cette frontière ; chaque appelant garde son propre Set typé derrière `onToggle`. */
export type FilterSection = {
  /** Libellé en majuscules au-dessus de ce groupe de puces, par ex. « Famille ». */
  label: string;
  options: FilterOption<string>[];
  selected: Set<string>;
  onToggle: (key: string) => void;
};

// ---------------------------------------------------------------------------
// FilterButton — déclencheur en ligne. À placer à côté d'un champ de recherche, ou
// dans un emplacement de fin d'en-tête. Affiche un badge de compteur rouge quand des
// filtres sont actifs.
// ---------------------------------------------------------------------------
export function FilterButton({
  themeName,
  activeCount,
  onPress,
  accessibilityLabel,
}: {
  themeName: ThemeName;
  activeCount: number;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const active = activeCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: active
          ? t.brand.accent
          : pressed ? t.border.default : t.border.subtle,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
      })}
    >
      <SlidersHorizontal size={18} color={active ? "#FFFFFF" : t.brand.accent} />
      {active ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: t.feedback.danger,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: ralewayFamily("700"), fontWeight: "700" }}>
            {activeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// FilterSheet — feuille du bas avec des puces basculables.
//
// Animation : deux Animated.Values pilotées indépendamment — un voile noir qui
// passe d'une opacité 0 → 0,45 et une feuille qui glisse translateY : window-h
// → 0. Les découpler supprime la sensation « tout le bloc remonte » de l'animation
// native `animationType="slide"` et donne le mouvement progressif assombrir-puis-monter.
// Les deux tournent sur le pilote natif. La feuille reste montée pendant l'animation de
// sortie via un drapeau interne `rendered` — la Modal ne se démonte qu'après la fin de
// l'animation de fermeture.
//
// Enveloppée dans un SafeAreaProvider neuf — empêche les insets de
// react-native-safe-area-context de se cumuler entre les vues hôtes.
// ---------------------------------------------------------------------------
const WINDOW_H = Dimensions.get("window").height;
const SCRIM_MAX_OPACITY = 0.45;

export function FilterSheet<K extends string>({
  visible,
  themeName,
  sectionLabel,
  options,
  selected,
  sections,
  collapsibleSections = false,
  resultCount,
  onToggle,
  onReset,
  onClose,
  title = "Filtrer",
}: {
  visible: boolean;
  themeName: ThemeName;
  /** API à section unique (Actualités, Partenaires) : fournir ces props OU `sections`.
   *  Libellé en majuscules au-dessus du groupe de puces, par ex. « Catégorie ». */
  sectionLabel?: string;
  options?: FilterOption<K>[];
  selected?: Set<K>;
  onToggle?: (key: K) => void;
  /** API multi-sections : empiler plusieurs groupes de puces titrés (la Bibliothèque empile
   *  « Famille » + « Hors ligne »). A priorité sur les props à section unique. */
  sections?: FilterSection[];
  /** FFIE-13 — quand activé, chaque groupe devient un accordéon repliable, FERMÉ par
   *  défaut à chaque ouverture de la feuille. L'en-tête affiche le nombre de filtres
   *  actifs de son groupe quand il est fermé, pour qu'une sélection masquée reste
   *  visible. La liste derrière la feuille se met toujours à jour à chaque appui sur
   *  une puce (application immédiate). Par défaut false → tous les groupes restent
   *  dépliés, comportement historique (Actualités, Partenaires). */
  collapsibleSections?: boolean;
  resultCount: number;
  onReset: () => void;
  onClose: () => void;
  title?: string;
}) {
  const t = themes[themeName];

  // Normaliser en une liste de sections pour que le corps ne rende qu'un seul chemin. Les
  // props à section unique se réduisent à une liste à un élément ; ce `onToggle` hérité est
  // clé par le K de l'appelant mais n'est jamais appelé qu'avec une clé issue de ses propres
  // options, donc l'élargir en string est sûr.
  const resolvedSections: FilterSection[] = sections ?? [
    {
      label: sectionLabel ?? "",
      options: (options ?? []) as FilterOption<string>[],
      selected: (selected ?? new Set<string>()) as Set<string>,
      onToggle: onToggle as (key: string) => void,
    },
  ];
  const totalSelected = resolvedSections.reduce((n, s) => n + s.selected.size, 0);

  // Drapeau de montage interne — garder la Modal en vie pendant que l'animation de sortie
  // se joue, puis la démonter quand elle se termine.
  const [rendered, setRendered] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(WINDOW_H)).current;
  const wasVisible = useRef(false);

  // FFIE-13 — indices des groupes dépliés en mode accordéon. On repart « tout
  // fermé » à chaque ouverture de la feuille (le ticket impose « fermé par
  // défaut »). Sans effet en mode non repliable.
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (visible) setExpandedSections(new Set());
  }, [visible]);
  const toggleSection = (index: number) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  useEffect(() => {
    const becameVisible = visible && !wasVisible.current;
    const becameHidden = !visible && wasVisible.current;
    wasVisible.current = visible;

    if (becameVisible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: SCRIM_MAX_OPACITY,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (becameHidden) {
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: WINDOW_H,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, scrimOpacity, sheetY]);

  if (!rendered) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View style={sheetStyles.root}>
          {/* Voile — opacité pilotée séparément de la feuille. */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000", opacity: scrimOpacity },
            ]}
          />

          {/* Couche de fermeture par appui à l'extérieur, entre le voile et la feuille. */}
          <Pressable
            accessibilityLabel="Fermer le filtre"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />

          {/* Feuille — glisse vers le haut pendant que le voile apparaît. */}
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: sheetY }],
            }}
          >
            <SafeAreaView
              edges={["bottom"]}
              style={{
                backgroundColor: t.surface.default,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              {/* Pas de poignée de glissement : cette feuille n'est pas déplaçable
                  (on la ferme via la croix ou l'arrière-plan), donc une poignée laisserait
                  croire à une affordance qui n'existe pas et déroute les utilisateurs. */}

              {/* Ligne de titre */}
              <View style={sheetStyles.titleRow}>
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: displayFamily("700"),
                    fontWeight: "700",
                    color: t.text.body,
                    letterSpacing: -0.4,
                  }}
                >
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le filtre"
                  hitSlop={12}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <X size={22} color={t.text.muted} />
                </Pressable>
              </View>

              {/* Sections : chacune est un libellé + une ligne enveloppée de puces
                  basculables. En mode accordéon (collapsibleSections), l'en-tête
                  devient une rangée touchable avec un chevron, fermée par défaut, et
                  les puces ne se rendent que lorsque le groupe est déplié. */}
              {resolvedSections.map((section, si) => {
                const isOpen = !collapsibleSections || expandedSections.has(si);
                const selectedCount = section.selected.size;
                return (
                <View key={section.label || si}>
                  {collapsibleSections ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={
                        selectedCount > 0
                          ? `${section.label}, ${selectedCount} filtre${selectedCount === 1 ? "" : "s"} actif${selectedCount === 1 ? "" : "s"}`
                          : section.label
                      }
                      onPress={() => toggleSection(si)}
                      style={sheetStyles.accordionHeader}
                    >
                      <Text style={[sheetStyles.sectionLabel, sheetStyles.accordionLabel, { color: t.text.muted }]}>
                        {section.label}
                        {selectedCount > 0 ? `  ·  ${selectedCount}` : ""}
                      </Text>
                      {isOpen ? (
                        <ChevronDown size={18} color={t.text.muted} />
                      ) : (
                        <ChevronRight size={18} color={t.text.muted} />
                      )}
                    </Pressable>
                  ) : (
                    <Text style={[sheetStyles.sectionLabel, { color: t.text.muted }]}>
                      {section.label}
                    </Text>
                  )}
                  {isOpen ? (
                  <View style={sheetStyles.chipRow}>
                    {section.options.map((opt) => {
                      const isSelected = section.selected.has(opt.key);
                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={opt.label}
                          onPress={() => section.onToggle(opt.key)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: isSelected
                              ? t.brand.accent
                              : pressed ? t.border.subtle : t.surface.subtle,
                            borderWidth: 1,
                            borderColor: isSelected ? t.brand.accent : t.border.subtle,
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Text
                            style={{
                              color: isSelected ? "#FFFFFF" : t.text.body,
                              fontSize: 14,
                              fontFamily: ralewayFamily(isSelected ? "600" : "500"),
                              fontWeight: isSelected ? "600" : "500",
                            }}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  ) : null}
                </View>
                );
              })}

              {/* Actions */}
              <View style={sheetStyles.actionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Réinitialiser les filtres"
                  onPress={onReset}
                  disabled={totalSelected === 0}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: t.border.default,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: totalSelected === 0 ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: t.text.body,
                      fontSize: 15,
                      fontFamily: ralewayFamily("600"),
                      fontWeight: "600",
                    }}
                  >
                    Réinitialiser
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Voir ${resultCount} résultats`}
                  onPress={onClose}
                  style={({ pressed }) => ({
                    flex: 2,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontFamily: ralewayFamily("600"),
                      fontWeight: "600",
                    }}
                  >
                    Voir {resultCount} {resultCount === 1 ? "résultat" : "résultats"}
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 10,
    fontSize: 12,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  // Rangée d'en-tête d'accordéon (FFIE-13) — le libellé de section + un chevron,
  // alignés sur la même gouttière de 24 pt que les puces. minHeight garde une
  // cible tactile confortable. Le libellé porte déjà son propre padding/marge
  // (accordionLabel les neutralise pour que la rangée gère l'espacement).
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingRight: 20,
    minHeight: 44,
    marginTop: 8,
  },
  accordionLabel: {
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  chipRow: {
    paddingHorizontal: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
  },
  actionsRow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: "row",
    columnGap: 12,
  },
});
