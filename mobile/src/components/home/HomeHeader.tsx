// HomeHeader — l'en-tête « héros » marine en haut de l'onglet Accueil.
//
// Une surface de marque bleu marine profond qui remonte derrière la barre
// d'état et porte :
//   - le verrou de co-marque FFIE + FFB à gauche (FFIE-01) : les deux logos côte à
//     côte, puis la mention « La FFIE est membre adhérent de la FFB » en dessous.
//     Le logo FFIE est touchable → ouvre « La FFIE en chiffres » (FFIE-02).
//   - PAS de bouton d'action en haut à droite : le Profil (adhérent) et l'adhésion
//     (invité) vivent désormais dans la barre d'onglets du bas.
//   - un bloc d'accueil + identité :
//       · adhérent → « Bonjour, » + nom + une pastille « Adhérent actif · N° ____ »,
//         tout le bloc étant cliquable pour ouvrir le Profil
//       · invité   → un en-tête « Bienvenue à la FFIE » + le sous-titre + une
//         pastille « Adhérer à la FFIE »
//
// C'est une surface de marque fixe, pas une surface de thème : le fond est
// toujours le marine institutionnel FFIE (brand.navy[700]) avec des couleurs de
// premier plan blanc / sarcelle, de la même façon que FFIELogo traite les
// couleurs de marque comme des constantes. Seul le contenu de la page *sous*
// l'en-tête suit le thème actif.
//
// Statique par choix — aucune animation d'entrée. La bascule squelette→contenu
// de l'onglet (TabSkeletonGate) couvre déjà la transition de chargement : animer
// l'en-tête à chaque visite de l'Accueil serait du mouvement gratuit (voir
// emil-design-eng : quand *ne pas* animer).

import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, UserPlus } from "lucide-react-native";
import { primitives, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER } from "@/components/ui/ios";
import { FFIELogo } from "@/components/ui/FFIELogo";
import { FFBLogo } from "@/components/ui/FFBLogo";
import { HEADER_SURFACE } from "@/theme/brandHeader";
import { type MemberProfile } from "@/data/member";

// --- couleurs de surface de marque fixes (héros sarcelle) -----------------
const WHITE = primitives.colors.white;
// Pastille de statut / adhésion : une pastille claire OPAQUE avec un texte
// sarcelle foncé. Une pastille blanche avec un texte teal[800] atteint ~7:1
// (AAA) — une emphase plus forte que blanc-sur-sarcelle, et qui reste robuste
// quelle que soit la dérive du sarcelle de l'en-tête. (L'étiquette de 13 px est
// le cas contraignant : le petit texte exige 4,5:1, donc c'est la pastille qui
// le porte, pas le sarcelle.)
const PILL_BG = WHITE;
const PILL_TEXT = primitives.colors.brand.teal[800]; // #045764 — AAA sur blanc
const PILL_ICON = primitives.colors.brand.teal[700]; // #027489 — lisible sur blanc

// Voiles translucides dérivés des couleurs de token (les tokens n'ont pas de
// variantes alpha ; cela garde les valeurs source pilotées par les tokens plutôt
// que littérales).
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HELLO = withAlpha(WHITE, 0.82); // message d'accueil / sous-titre atténué sur le héros sarcelle

// Écart sous le bord supérieur de la zone sûre avant la rangée de marque. Gardé
// identique au TOP_GAP de AppHeader pour que le logo soit à la même position
// verticale sur chaque page — passer de l'Accueil aux autres onglets ne doit pas
// décaler le bloc-marque.
const TOP_GAP = Platform.OS === "android" ? 14 : 12;

// Héros invité : de l'air ajouté des DEUX côtés du sous-titre (sous la rangée de
// marque, et au-dessus du CTA) en plus du débord mesuré de la pastille — pour
// que le sous-titre dégage le logo au lieu de le coller, tout en restant centré.
const GUEST_GAP = 8;

// Verrou de co-marque FFIE + FFB (FFIE-01) — les deux logos sont rendus à la
// MÊME hauteur. Attention : les deux composants n'interprètent pas `size` de la
// même façon — FFIELogo.size = LARGEUR (hauteur = size / 1,188) ; FFBLogo.size =
// HAUTEUR. On choisit donc une largeur FFIE de 42 (≈ 35,4 de haut) et une hauteur
// FFB de 35 pour que les deux pastilles s'alignent exactement à la même hauteur.
const FFIE_LOGO_SIZE = 42; // largeur FFIE → hauteur ≈ 35,4
const FFB_LOGO_SIZE = 35; // hauteur FFB → 35

export type HomeHeaderProps = {
  themeName?: ThemeName;
  /** « member » affiche l'identité + la pastille adhérent ; « guest » affiche un CTA d'adhésion. */
  variant: "member" | "guest";
  /** Requis pour la variante adhérent. */
  member?: MemberProfile;
  /** Affiche le point rouge sur la cloche (variante adhérent uniquement). */
  hasUnread?: boolean;
  /** Adhérent : ouvrir les notifications. Omettre pour masquer la cloche. */
  onPressNotifications?: () => void;
  /** Ouvrir la recherche. Omettre pour masquer le bouton de recherche. */
  onPressSearch?: () => void;
  /** Adhérent : toucher le bloc d'identité → ouvrir le Profil. */
  onPressIdentity?: () => void;
  /** Invité : toucher la pastille « Adhérer à la FFIE ». */
  onPressJoin?: () => void;
  /** Toucher le logo FFIE → ouvrir « La FFIE en chiffres » (FFIE-02). Omettre pour
   *  rendre le logo non interactif (simple image de marque). */
  onPressFigures?: () => void;
};

export function HomeHeader({
  themeName = "light",
  variant,
  member,
  hasUnread = false,
  onPressNotifications,
  onPressSearch,
  onPressIdentity,
  onPressJoin,
  onPressFigures,
}: HomeHeaderProps) {
  void themeName; // le héros marine ignore le thème ; prop conservée par symétrie d'API
  const insets = useSafeAreaInsets();
  const isMember = variant === "member" && member != null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + TOP_GAP }]}>
      {/* Verrou de co-marque (plus aucune action en haut à droite — voir l'en-tête de fichier) */}
      <View style={styles.topRow}>
        {/* Verrou de co-marque FFIE + FFB (FFIE-01) : les deux logos côte à côte, à
            la MÊME hauteur, chacun dans sa pastille blanche ; la mention
            d'affiliation est en pleine largeur sous la rangée (voir plus bas). Le
            logo FFIE est touchable et ouvre « La FFIE en chiffres » (FFIE-02) ; le
            logo FFB reste décoratif. Chaque pastille porte son propre libellé
            d'accessibilité. */}
        <View style={styles.logoLockup}>
          <Pressable
            onPress={onPressFigures}
            disabled={!onPressFigures}
            accessibilityRole={onPressFigures ? "button" : "image"}
            accessibilityLabel="FFIE"
            accessibilityHint={onPressFigures ? "Ouvre les chiffres clés de la FFIE" : undefined}
            style={({ pressed }) => [
              styles.logoChip,
              pressed && onPressFigures ? { opacity: 0.7 } : null,
            ]}
          >
            <FFIELogo size={FFIE_LOGO_SIZE} themeName="light" />
          </Pressable>
          <View style={styles.logoChip} accessibilityRole="image" accessibilityLabel="FFB">
            <FFBLogo size={FFB_LOGO_SIZE} />
          </View>
        </View>
        {/* Plus de bouton d'action en haut à droite : le Profil (adhérent) vit
            désormais dans la barre d'onglets du bas. Le bloc d'identité plus bas
            reste cliquable pour ouvrir le Profil (raccourci, pas un bouton de coin). */}
      </View>

      {/* Mention d'affiliation FFB (FFIE-01) — pleine largeur sous le verrou de
          co-marque, à l'image de la carte « membre de la FFB » plus bas dans le hub. */}
      <Text style={styles.affiliation}>La FFIE est membre adhérent de la FFB</Text>

      {/* Identité / message d'accueil */}
      {isMember ? (
        <Pressable
          onPress={onPressIdentity}
          disabled={!onPressIdentity}
          accessibilityRole={onPressIdentity ? "button" : undefined}
          accessibilityLabel={`${member.fullName}, ${member.statusLabel}, numéro ${member.memberNo}`}
          accessibilityHint={onPressIdentity ? "Ouvre votre profil" : undefined}
          style={({ pressed }) => [
            styles.identity,
            pressed && onPressIdentity ? { opacity: 0.85 } : null,
          ]}
        >
          <Text style={styles.hello}>Bonjour,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {member.fullName}
          </Text>
          <View style={styles.pill}>
            <CheckCircle2 size={14} color={PILL_ICON} />
            <Text style={styles.pillText} numberOfLines={1}>
              {member.statusLabel} · N° {member.memberNo}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={[styles.identity, styles.identityGuest]}>
          {/* Le message « Bienvenue à la FFIE » vit désormais ici (il était
              auparavant en ligne à côté du logo, place reprise par le verrou de
              co-marque FFIE + FFB). */}
          <Text style={styles.guestWelcome} accessibilityRole="header" numberOfLines={1}>
            Bienvenue à la FFIE
          </Text>
          <Text style={styles.subtitle}>
            Explorez les actualités, les ressources et les avantages adhérents.
          </Text>
          {onPressJoin ? (
            <Pressable
              onPress={onPressJoin}
              accessibilityRole="button"
              accessibilityLabel="Adhérer à la FFIE"
              accessibilityHint="Ouvre les informations d'adhésion"
              style={({ pressed }) => [
                styles.pill,
                { marginTop: 14 },
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <UserPlus size={14} color={PILL_ICON} />
              <Text style={styles.pillText}>Adhérer à la FFIE</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: HEADER_SURFACE,
    paddingHorizontal: GUTTER,
    // Marge basse ajustée pour que la surface de marque *visible* sous la
    // pastille d'identité corresponde à la marge basse de 16 px de AppHeader sur
    // toutes les autres pages. La feuille du tableau de bord la recouvre de
    // SHEET.lift (12), donc 28 - 12 = 16 px de sarcelle visible — l'espacement
    // bas de l'en-tête reste cohérent dans toute l'app.
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Hauteur plancher dimensionnée pour contenir confortablement la pastille du
    // logo (désormais plus grande).
    minHeight: 44,
  },
  // Verrou de co-marque — les deux pastilles de logo côte à côte. flexShrink pour
  // que la rangée cède la place à l'action de profil plutôt que de la pousser hors champ.
  logoLockup: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    flexShrink: 1,
  },
  logoChip: {
    backgroundColor: WHITE,
    borderRadius: 6, // entre radii.sm (4) et radii.md (8) — pas de token exact
    padding: 5,
  },
  // Mention d'affiliation FFB sous le verrou de co-marque (FFIE-01). Reprend le
  // traitement « texte atténué sur le héros » du sous-titre invité.
  affiliation: {
    color: HELLO,
    fontFamily: ralewayFamily("500"),
    fontWeight: "500",
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: 0.1,
    marginTop: 10,
  },
  // En-tête « Bienvenue à la FFIE » de la variante invité — désormais dans le bloc
  // d'identité (la rangée de marque porte le verrou de co-marque à la place).
  guestWelcome: {
    color: WHITE,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  identity: {
    marginTop: 14,
  },
  // Surcharge invité : la rangée de marque est plus haute que son texte à cause
  // de la pastille du logo. Le sous-titre se place GUEST_GAP sous le bord
  // inférieur de la pastille (de l'air pour ne pas coller le logo) ; le CTA en
  // dessous reçoit ce même décalage plus le débord mesuré de la pastille, ce qui
  // garde le sous-titre visuellement centré.
  identityGuest: {
    marginTop: GUEST_GAP,
  },
  hello: {
    color: HELLO,
    fontFamily: ralewayFamily("500"),
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 1,
  },
  name: {
    color: WHITE,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: HELLO,
    fontFamily: ralewayFamily("400"),
    fontSize: 13.5,
    lineHeight: 19,
    // Pas de marge haute : l'écart supérieur du bloc invité provient du débord de
    // la pastille du logo (voir identityGuest) pour équilibrer l'écart
    // sous-titre→CTA en dessous.
    marginTop: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    columnGap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: primitives.radii.full,
    // Pastille claire opaque (sans bordure) pour que l'étiquette sarcelle foncé
    // se lise en AAA sur le héros sarcelle — un fond translucide avec texte blanc
    // échouerait au AA ici.
    backgroundColor: PILL_BG,
    marginTop: 12,
  },
  pillText: {
    color: PILL_TEXT,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
