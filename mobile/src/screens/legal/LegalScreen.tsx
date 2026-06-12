// LegalScreen — l'écran « Conditions d'utilisation » de l'application (FFIE-18).
// Une modale plein écran qui glisse depuis le bas (les deux rôles) et présente,
// sous un grand titre + un bouton de fermeture :
//   • un préambule court ;
//   • une série d'articles DESCRIPTIFS et factuels sur l'application (objet,
//     accès/adhésion, version d'aperçu, données, propriété intellectuelle) ;
//   • une note explicite indiquant que les CGU complètes sont en cours de
//     finalisation avec la fédération ;
//   • un groupe « Documents de référence » qui ouvre les DEUX pages légales
//     réelles de ffie.fr (mentions légales + politique de confidentialité) dans
//     le navigateur intégré.
//
// IMPORTANT (convention du repo : aucune donnée réelle inventée) : on ne rédige
// PAS ici de clauses juridiques contraignantes — celles-ci doivent venir du
// service juridique de la FFIE. Les articles ci-dessous n'énoncent que des faits
// vrais sur l'app (cf. TESTFLIGHT.md / CLAUDE.md), et l'article « Évolution des
// conditions » signale ouvertement que les CGU définitives restent à fournir. La
// mise en page est complète : il suffira de remplacer le texte des articles par
// la copie validée quand elle arrivera.

import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, ScrollText, ShieldCheck, X } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import {
  GUTTER,
  InsetGroup,
  InsetRow,
  LargeTitleHeader,
  useGroupedColors,
} from "@/components/ui/ios";

// Pages légales RÉELLES de la FFIE (vérifiées sur ffie.fr — il n'existe pas de
// page « CGU » distincte, seulement ces deux-là). Ouvertes dans le navigateur
// intégré, comme la carte d'affiliation FFB de l'Accueil.
const MENTIONS_LEGALES_URL = "https://www.ffie.fr/footer/credits-et-mentions-legales";
const CONFIDENTIALITE_URL = "https://www.ffie.fr/footer/notre-politique-de-confidentialite";

// Articles DESCRIPTIFS — uniquement des faits vrais sur l'application (pas des
// clauses juridiques inventées). Le dernier article signale explicitement que
// les CGU contraignantes sont en attente du service juridique de la FFIE.
const ARTICLES: { title: string; body: string }[] = [
  {
    title: "Objet",
    body:
      "L'application FFIE met à la disposition des adhérents et du public l'information, les documents, les outils et les actualités de la Fédération Française des Intégrateurs Électriciens.",
  },
  {
    title: "Accès et adhésion",
    body:
      "L'accès à certains contenus et services est réservé aux entreprises adhérentes. La demande d'adhésion est instruite par votre fédération départementale, puis examinée par la FFIE avant l'octroi de l'accès.",
  },
  {
    title: "Version d'aperçu",
    body:
      "La présente version est un aperçu. La connexion et la demande d'adhésion sont des parcours de démonstration : ils valident vos saisies localement mais ne créent pas encore de compte réel et ne transmettent aucune donnée à un serveur.",
  },
  {
    title: "Données personnelles",
    body:
      "Le traitement de vos données personnelles est décrit dans la politique de confidentialité de la FFIE, accessible dans les documents de référence ci-dessous.",
  },
  {
    title: "Propriété intellectuelle",
    body:
      "Les contenus, marques et logos présentés dans l'application — notamment ceux de la FFIE et de la FFB — restent la propriété de leurs titulaires respectifs et ne peuvent être réutilisés sans autorisation.",
  },
  {
    title: "Évolution des conditions",
    body:
      "Les conditions générales d'utilisation complètes de l'application sont en cours de finalisation avec la fédération. Elles seront publiées et mises à jour dans une prochaine version. D'ici là, l'usage de l'application est encadré par les mentions légales et la politique de confidentialité ci-dessous.",
  },
];

export function LegalScreen({
  themeName = "light",
  onClose,
}: {
  themeName?: ThemeName;
  /** Ferme la modale des conditions d'utilisation. */
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  // Ouvre une page légale de ffie.fr dans le navigateur intégré (page sheet),
  // teinté aux couleurs de l'app — même présentation que les liens externes
  // Actualités / Métiers / affiliation FFB.
  const openExternal = (url: string) => {
    WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: t.brand.accent,
      toolbarColor: t.surface.default,
      dismissButtonStyle: "close",
    }).catch(() => {});
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LargeTitleHeader
          title="Conditions d'utilisation"
          themeName={themeName}
          trailing={<CloseButton themeName={themeName} onPress={onClose} />}
        />

        {/* Préambule sous le grand titre. */}
        <Text
          style={{
            paddingHorizontal: GUTTER,
            marginTop: 4,
            marginBottom: 20,
            color: t.text.muted,
            fontSize: 15,
            lineHeight: 22,
            fontFamily: ralewayFamily("400"),
          }}
        >
          En utilisant l'application FFIE, vous acceptez les présentes conditions
          ainsi que les documents de référence indiqués ci-dessous.
        </Text>

        {/* Articles descriptifs (faits vrais sur l'app — pas des clauses
            juridiques inventées). */}
        {ARTICLES.map((a, i) => (
          <Article key={a.title} n={i + 1} title={a.title} body={a.body} themeName={themeName} />
        ))}

        {/* Documents de référence — ouvrent les pages légales réelles de ffie.fr. */}
        <View style={{ marginTop: 8 }}>
          <InsetGroup
            header="Documents de référence"
            footer="Ces pages s'ouvrent sur le site ffie.fr dans le navigateur."
            themeName={themeName}
          >
            <InsetRow
              icon={ScrollText}
              iconBg={t.brand.accent}
              title="Mentions légales"
              themeName={themeName}
              showChevron={false}
              trailing={<ExternalLink size={18} color={t.text.muted} style={{ opacity: 0.6 }} />}
              accessibilityHint="Ouvre les mentions légales sur ffie.fr dans le navigateur"
              onPress={() => openExternal(MENTIONS_LEGALES_URL)}
            />
            <InsetRow
              icon={ShieldCheck}
              iconBg={t.brand.accent}
              title="Politique de confidentialité"
              themeName={themeName}
              isLast
              showChevron={false}
              trailing={<ExternalLink size={18} color={t.text.muted} style={{ opacity: 0.6 }} />}
              accessibilityHint="Ouvre la politique de confidentialité sur ffie.fr dans le navigateur"
              onPress={() => openExternal(CONFIDENTIALITE_URL)}
            />
          </InsetGroup>
        </View>

        {/* Pied de page — éditeur + horodatage de version (statique). */}
        <Text
          style={{
            textAlign: "center",
            paddingHorizontal: GUTTER,
            color: t.text.muted,
            opacity: 0.7,
            fontSize: 12,
            lineHeight: 17,
            fontFamily: ralewayFamily("400"),
          }}
        >
          Éditeur : Fédération Française des Intégrateurs Électriciens (FFIE){"\n"}
          Mise à jour : juin 2026 · version d'aperçu
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Un article : titre numéroté (Sora) + corps de texte (Raleway). Numéro et titre
// sur une même ligne pour un repère visuel léger, façon document légal.
function Article({
  n,
  title,
  body,
  themeName,
}: {
  n: number;
  title: string;
  body: string;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  return (
    <View style={{ paddingHorizontal: GUTTER, marginBottom: 22 }}>
      <Text
        accessibilityRole="header"
        style={{
          color: t.text.body,
          fontSize: 17,
          lineHeight: 22,
          marginBottom: 6,
          fontFamily: displayFamily("600"),
          fontWeight: "600",
          letterSpacing: -0.3,
        }}
      >
        {n}. {title}
      </Text>
      <Text
        style={{
          color: t.text.body,
          fontSize: 15,
          lineHeight: 22,
          fontFamily: ralewayFamily("400"),
        }}
      >
        {body}
      </Text>
    </View>
  );
}

// Fermeture de modale façon iOS : un disque gris plein avec un X, dans
// l'emplacement de fin du grand titre — identique à FfieFiguresScreen /
// AgendaModalScreen pour rester cohérent entre les modales plein écran.
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
      accessibilityHint="Ferme les conditions d'utilisation"
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
