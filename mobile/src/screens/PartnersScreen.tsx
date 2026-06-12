// Onglet Partenaires — la vitrine des partenaires de la fédération, organisée en
// trois segments sous l'en-tête persistant de l'app : Écosystème, Lab_FFIE et
// Partenaires. Chaque segment est un ensemble de listes groupées iOS-HIG (p. ex.
// Distributeurs, Fabricants) de lignes de marque : une puce de logo, le nom du
// partenaire, un descripteur d'une ligne, et un chevron qui ouvre le site
// officiel du partenaire dans le navigateur intégré natif (expo-web-browser →
// SFSafariViewController sur iOS / Chrome Custom Tabs sur Android, présenté en
// page sheet). Le segment Lab_FFIE se termine par une carte explicative « À
// propos du Lab_FFIE ».
//
// L'écran est piloté par les données : les segments, leurs sections et chaque
// ligne proviennent de PARTNER_TABS dans data/partners.ts. Pour changer ce qui
// est listé (ou ajouter un segment / une section), éditez ce fichier de données,
// pas cet écran. Le squelette de chargement correspondant vit dans
// components/skeletons/PartnersSkeleton.tsx — gardez les deux en phase quand la
// disposition change.

import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import * as WebBrowser from "expo-web-browser";
import {
  PARTNER_TABS,
  type PartnerEntry,
  type PartnerLogo,
  type PartnerNote,
  type PartnerTabKey,
} from "@/data/partners";
import { ralewayFamily } from "@/theme/fonts";
import { HEADER_SURFACE } from "@/theme/brandHeader";
import { FFBLogo } from "@/components/ui/FFBLogo";
import { GUTTER, InsetGroup, useGroupedColors } from "@/components/ui/ios";

// Taille de la puce de logo de marque en tête. Un peu plus grande que l'ancien
// monogramme (38) pour que le logotype se lise, comme les tuiles de logo de la maquette.
const TILE = 46;

// Segments pour le contrôle, dans l'ordre de la page, dérivés des données.
const SEGMENT_OPTIONS: { key: PartnerTabKey; label: string }[] = PARTNER_TABS.map(
  (t) => ({ key: t.key, label: t.label }),
);

// PartnerLogoTile — tient lieu du vrai logo d'un partenaire : une tuile teintée
// portant le logotype de la marque, mis à l'échelle pour s'ajuster. Une bordure
// fine garde la puce lisible sur la carte : sur le thème clair, elle est tracée
// pour les puces claires/blanches (logo.outlined) qui se fondraient sinon dans la
// carte blanche ; sur les thèmes sombre / sunlight, elle est tracée pour chaque
// puce (un bord clair/fort) pour que les puces sombres se détachent de la carte
// sombre ou bordée. Décoratif : le libellé d'accessibilité de la ligne nomme déjà
// le partenaire, la tuile est donc masquée aux technologies d'assistance.
function PartnerLogoTile({ logo, themeName }: { logo: PartnerLogo; themeName: ThemeName }) {
  const borderColor =
    themeName === "dark"
      ? "rgba(255,255,255,0.16)"
      : themeName === "sunlight"
        ? "rgba(0,0,0,0.30)"
        : "rgba(17,24,39,0.12)";
  const showBorder = logo.outlined || themeName !== "light";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: TILE,
        height: TILE,
        borderRadius: 11,
        backgroundColor: logo.bg,
        borderWidth: showBorder ? StyleSheet.hairlineWidth * 2 : 0,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        overflow: "hidden",
      }}
    >
      {logo.brand === "ffb" ? (
        // Vrai logo FFB vectoriel (FFIE-06). FFBLogo.size = hauteur ; on le borne
        // à l'intérieur de la tuile avec une petite marge.
        <FFBLogo size={TILE - 16} />
      ) : (
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{
            color: logo.fg,
            fontSize: 12.5,
            lineHeight: 13.5,
            textAlign: "center",
            fontFamily: ralewayFamily("800"),
            fontWeight: "800",
            letterSpacing: -0.3,
          }}
        >
          {logo.text}
        </Text>
      )}
    </View>
  );
}

// PartnerRow — une ligne de liste groupée : puce de logo + nom en gras +
// descripteur atténué + chevron. Le séparateur fin est décalé au-delà de la puce
// pour s'aligner sous le texte (le détail des listes groupées iOS). Toucher ouvre
// le site du partenaire ; les lignes sans URL se rendent de la même façon mais ne
// sont pas touchables (pas de chevron).
function PartnerRow({
  entry,
  themeName,
  isLast,
  onPress,
}: {
  entry: PartnerEntry;
  themeName: ThemeName;
  isLast: boolean;
  onPress?: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;
  const separatorInset = GUTTER + TILE + 12;

  return (
    <Wrapper
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${entry.name}. ${entry.descriptor}`}
      accessibilityHint={onPress ? "Ouvre le site web du partenaire dans l'app" : undefined}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => ({
        // La teinte pressée descend d'un cran plus foncé que la carte grise pour
        // que le retour survive sur les éléments gris-sur-blanc.
        backgroundColor: pressed && onPress ? t.border.subtle : "transparent",
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          columnGap: 12,
          paddingHorizontal: GUTTER,
          minHeight: 64, // plus haut que le plancher de 48 — la puce + deux lignes ont besoin de place
          paddingVertical: 12,
        }}
      >
        <PartnerLogoTile logo={entry.logo} themeName={themeName} />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              color: t.text.body,
              fontFamily: ralewayFamily("700"),
              fontWeight: "700",
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          <Text
            style={{ fontSize: 13, color: t.text.muted, marginTop: 2, lineHeight: 17 }}
            numberOfLines={1}
          >
            {entry.descriptor}
          </Text>
        </View>

        {onPress ? (
          <ChevronRight size={18} color={t.text.muted} style={{ opacity: 0.5 }} />
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
    </Wrapper>
  );
}

// AboutCard — la note explicative sous les groupes d'un segment (Lab_FFIE). Une
// carte d'information teintée de teal, alignée sur la marque (tokens
// subtle.syncing) pour qu'elle se lise comme « informative », distincte des
// lignes de partenaires touchables au-dessus.
function AboutCard({ note, themeName }: { note: PartnerNote; themeName: ThemeName }) {
  const t = themes[themeName];
  const tint = t.feedback.subtle.syncing;
  return (
    <View
      style={{
        marginHorizontal: GUTTER,
        marginBottom: 12,
        backgroundColor: tint.bg,
        borderWidth: 1,
        borderColor: tint.border,
        borderRadius: primitives.radii.lg,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: t.text.body,
          fontSize: 15,
          fontFamily: ralewayFamily("700"),
          fontWeight: "700",
          letterSpacing: -0.2,
          marginBottom: 6,
        }}
      >
        {note.title}
      </Text>
      <Text style={{ color: t.text.muted, fontSize: 13.5, lineHeight: 20 }}>
        {note.body}
      </Text>
    </View>
  );
}

export function PartnersScreen({ themeName = "light" }: { themeName?: ThemeName }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const [tab, setTab] = useState<PartnerTabKey>("ecosystem");
  const scrollRef = useRef<ScrollView>(null);

  const activeTab = PARTNER_TABS.find((tt) => tt.key === tab) ?? PARTNER_TABS[0];

  // Ouvre le site d'un partenaire dans le navigateur intégré natif (page sheet,
  // glisse vers le haut depuis le bas). Sa fermeture revient ici automatiquement.
  const openPartner = (entry: PartnerEntry) => {
    if (!entry.url) return;
    WebBrowser.openBrowserAsync(entry.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: t.brand.accent,
      toolbarColor: t.surface.default,
      dismissButtonStyle: "close",
    }).catch(() => {});
  };

  // Changer de segment repart en haut.
  const onChangeTab = (key: PartnerTabKey) => {
    setTab(key);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    // Le titre de page vit dans l'AppHeader partagé (shell) ; le contenu se rend en dessous.
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sélecteur de segment — Écosystème / Lab_FFIE / Partenaires. */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 16 }}>
          {/* La pastille sélectionnée utilise le teal exact de la marque de
              l'en-tête de l'app au-dessus (HEADER_SURFACE) pour que le sélecteur
              se lise comme faisant partie de la même barre de marque plutôt que
              comme un accent séparé. */}
          <SegmentedControl
            themeName={themeName}
            value={tab}
            options={SEGMENT_OPTIONS}
            onChange={onChangeTab}
            tint={HEADER_SURFACE}
          />
        </View>

        {/* Les listes groupées de chaque segment, puis sa carte de note optionnelle. */}
        {activeTab.groups.map((group) => (
          <InsetGroup key={group.header} header={group.header} themeName={themeName}>
            {group.entries.map((entry, i) => (
              <PartnerRow
                key={entry.id}
                entry={entry}
                themeName={themeName}
                isLast={i === group.entries.length - 1}
                onPress={entry.url ? () => openPartner(entry) : undefined}
              />
            ))}
          </InsetGroup>
        ))}

        {activeTab.note ? <AboutCard note={activeTab.note} themeName={themeName} /> : null}
      </ScrollView>
    </View>
  );
}
