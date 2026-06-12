// Onglet Accueil — la surface d'atterrissage de l'app (premier onglet du bas, les deux rôles).
//
// S'ouvre sur l'en-tête « hero » bleu marine (HomeHeader) : le logo FFIE, les
// actions en haut à droite (notifications + recherche), et un bloc salutation +
// identité (nom de l'adhérent + pastille de statut, ou un message de bienvenue
// invité + CTA d'adhésion). En dessous, une « feuille tableau de bord » grise
// surélevée (coins supérieurs arrondis, remontée par-dessus le bleu marine)
// accueille le contenu du hub :
//   • Accès rapide — une grille 2×2 de cartes raccourcis vers les onglets porteurs
//   • Espace public — les deux cartes publiques en dégradé (Trouver un pro / Nos métiers)
//     + la carte d'affiliation « membre de la FFB »
//   • Actualités récentes — un rail horizontal d'aperçus des articles les plus récents
//
// L'en-tête est une surface de marque bleu marine fixe qui déborde derrière la
// barre d'état, donc cet écran n'utilise PAS SafeAreaView pour le bord supérieur —
// HomeHeader consomme lui-même l'inset supérieur. Une couche bleu marine de la
// hauteur de la barre d'état se trouve derrière la vue de défilement pour qu'un
// rebond de sur-défilement en haut révèle le bleu marine (et non le gris),
// tandis que le fond du tableau de bord reste gris en dessous.
//
// Navigation : les cartes signalent une `HomeNavTarget` abstraite ; le shell
// (App.tsx) résout chacune en un changement d'onglet ou une action, de sorte que
// cet écran reste présentationnel et que le routage accueil → onglet vit à côté
// de l'état des onglets.

import React from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { primitives, themes, type ThemeName } from "@tokens";
import { useRole } from "@/auth/roleContext";
import { HomeHeader } from "@/components/home/HomeHeader";
import { SectionLabel } from "@/components/home/SectionLabel";
import { QuickAccessGrid } from "@/components/home/QuickAccessGrid";
import { PublicSpaceCards } from "@/components/home/PublicSpaceCards";
import { FFBMembershipCard } from "@/components/home/FFBMembershipCard";
import { RecentNews } from "@/components/home/RecentNews";
import { SHEET, useHomeColors } from "@/components/home/homeColors";
import { HEADER_SURFACE } from "@/theme/brandHeader";
import { currentMember } from "@/data/member";

// Arrière-plan derrière la feuille tableau de bord surélevée — assorti à la surface de HomeHeader.
const NAVY = HEADER_SURFACE;

// Destinations abstraites qu'une carte de l'Accueil peut demander. Le shell mappe
// chacune vers un onglet/une action réelle (p. ex. "docs" → onglet Bibliothèque,
// "find-pro" → annuaire de la fédération), en gardant cet écran découplé du
// modèle de navigation.
export type HomeNavTarget =
  | "docs"
  | "tools"
  | "partners"
  | "agenda"
  | "find-pro"
  | "trades"
  | "news";

export function HomeScreen({
  themeName = "light",
  onOpenNotifications,
  onOpenSearch,
  onOpenProfile,
  onOpenFigures,
  onJoin,
  onNavigate,
}: {
  themeName?: ThemeName;
  /** Adhérent : ouvrir l'écran des notifications (cloche). */
  onOpenNotifications?: () => void;
  /** Ouvrir la recherche. */
  onOpenSearch?: () => void;
  /** Adhérent : ouvrir la page Profil personnelle (toucher le bloc identité). */
  onOpenProfile?: () => void;
  /** Toucher le logo FFIE → ouvrir « La FFIE en chiffres » (FFIE-02). */
  onOpenFigures?: () => void;
  /** Invité : ouvrir le parcours d'adhésion. */
  onJoin?: () => void;
  /** Router une carte du tableau de bord vers un onglet/une action (résolu par le shell). */
  onNavigate?: (target: HomeNavTarget) => void;
}) {
  const c = useHomeColors(themeName);
  const { role } = useRole();
  const variant = role === "member" || role === "admin" ? "member" : "guest";

  // La carte d'affiliation FFB ouvre le site de la fédération dans le navigateur
  // intégré (page sheet), comme les lecteurs de liens externes Actualités / Métiers.
  const openFFB = () => {
    const t = themes[themeName];
    WebBrowser.openBrowserAsync("https://www.ffbatiment.fr", {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: t.brand.accent,
      toolbarColor: t.surface.default,
      dismissButtonStyle: "close",
    }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Contenu clair de la barre d'état (horloge / signal) par-dessus le hero bleu marine. */}
      <StatusBar style="light" />

      {/* Arrière-plan bleu marine derrière la barre d'état pour qu'un rebond de
          sur-défilement en haut révèle le bleu marine plutôt que la page grise.
          Se trouve sous le contenu de défilement, qui le couvre au repos. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 400, backgroundColor: NAVY }}
      />

      {/* contentInsetAdjustmentBehavior="never" : l'en-tête bleu marine applique
          lui-même l'inset supérieur de safe-area (padding insets.top). Sans cela,
          iOS applique AUSSI automatiquement l'inset de safe-area au contenu de
          défilement, le comptant deux fois et poussant l'en-tête vers le bas avec
          un espace bleu marine vide au-dessus. */}
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          themeName={themeName}
          variant={variant}
          member={currentMember}
          hasUnread
          onPressNotifications={onOpenNotifications}
          onPressSearch={onOpenSearch}
          onPressIdentity={onOpenProfile}
          onPressJoin={onJoin}
          onPressFigures={onOpenFigures}
        />

        {/* Feuille tableau de bord — surélevée par-dessus le bleu marine avec des
            coins supérieurs arrondis. L'arrière-plan bleu marine au-dessus
            transparaît à travers les coins pour l'effet « feuille qui s'élève
            par-dessus le hero ». */}
        <View
          style={{
            flex: 1,
            backgroundColor: c.pageBg,
            borderTopLeftRadius: SHEET.radius,
            borderTopRightRadius: SHEET.radius,
            marginTop: -SHEET.lift,
            paddingTop: SHEET.padTop,
            paddingBottom: SHEET.padBottom,
          }}
        >
          {/* Accès rapide — grille de raccourcis */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Accès rapide" themeName={themeName} />
            <QuickAccessGrid themeName={themeName} variant={variant} onNavigate={onNavigate} />
          </View>

          {/* Espace public — points d'entrée en dégradé + affiliation FFB */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Espace public" themeName={themeName} />
            <PublicSpaceCards themeName={themeName} onNavigate={onNavigate} />
            <View style={{ height: 12 }} />
            <FFBMembershipCard themeName={themeName} onPress={openFFB} />
          </View>

          {/* Actualités récentes — rail horizontal d'aperçus */}
          <View>
            <SectionLabel
              title="Actualités récentes"
              themeName={themeName}
              actionLabel="Tout voir"
              onActionPress={() => onNavigate?.("news")}
            />
            <RecentNews
              themeName={themeName}
              onPressArticle={() => onNavigate?.("news")}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
