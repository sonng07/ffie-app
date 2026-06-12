// EventDetailScreen — la page par événement atteinte en tapant un événement dans
// l'onglet Événements. Le contenu provient de data/events.ts (les pages publiées par la
// FFIE) ; aucun détail fabriqué. Mise en page :
//   • une étiquette de lieu (épingle de carte + ville) en haut,
//   • la date + le titre,
//   • les lignes d'infos date/heure,
//   • deux CTA — « Détails » (la page FFIE complète) et « Inscription » (le
//     formulaire d'inscription) — tous deux ouverts dans le navigateur intégré, à
//     l'image du lecteur Actualités et de l'annuaire Partenaires.
// Les événements que la FFIE n'a pas encore publiés se rabattent sur un texte d'attente
// « Détails à venir ».

import React from "react";
import { Calendar, ChevronLeft, Clock, MapPin } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { Button } from "@/components/ui/Button";
import { EVENTS } from "@/data/events";

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function EventDetailScreen({
  id,
  themeName = "light",
  onBack,
}: {
  id: number;
  themeName?: ThemeName;
  onBack: () => void;
}) {
  const t = themes[themeName];
  const event = EVENTS.find((e) => e.id === id);

  // Ouvre les liens externes dans le navigateur intégré natif (feuille de page), à
  // l'image du lecteur Actualités / de l'annuaire Partenaires — fermer renvoie
  // directement ici.
  const openInBrowser = (url: string) => {
    WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: t.brand.accent,
      toolbarColor: t.surface.default,
      dismissButtonStyle: "close",
    }).catch(() => {});
  };

  const hasCtas = !!(event?.detailsUrl || event?.registrationUrl);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: t.surface.default }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          columnGap: 1,
          alignSelf: "flex-start",
          paddingVertical: 8,
          paddingHorizontal: 12,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <ChevronLeft size={26} color={t.brand.accent} />
        <Text style={{ color: t.brand.accent, fontSize: 16 }}>Agenda</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}>
        {event ? (
          <>
            {/* Étiquette de lieu — épingle de carte + ville. */}
            {event.city ? (
              <View
                accessibilityLabel={`Lieu : ${event.city}`}
                style={{
                  flexDirection: "row",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  columnGap: 5,
                  backgroundColor: t.brand.accent,
                  borderRadius: primitives.radii.full,
                  paddingLeft: 9,
                  paddingRight: 12,
                  paddingVertical: 6,
                  marginBottom: 16,
                }}
              >
                <MapPin size={14} color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontFamily: ralewayFamily("600"),
                    fontWeight: "600",
                    letterSpacing: 0.1,
                  }}
                >
                  {event.city}
                </Text>
              </View>
            ) : null}

            <Text
              accessibilityRole="header"
              style={{
                color: t.text.body,
                fontSize: 26,
                lineHeight: 32,
                fontFamily: displayFamily("700"),
                fontWeight: "700",
                letterSpacing: -0.5,
              }}
            >
              {event.title}
            </Text>

            {/* Lignes d'infos date / heure. */}
            <View style={{ marginTop: 18, rowGap: 10 }}>
              <InfoRow
                icon={<Calendar size={17} color={t.brand.accent} />}
                text={formatLongDate(event.date)}
                themeName={themeName}
              />
              {event.schedule ? (
                <InfoRow
                  icon={<Clock size={17} color={t.brand.accent} />}
                  text={event.schedule}
                  themeName={themeName}
                />
              ) : null}
            </View>

            {/* CTA — Détails (la page FFIE) + Inscription (le formulaire). */}
            {hasCtas ? (
              <View style={{ flexDirection: "row", columnGap: 12, marginTop: 28 }}>
                {event.detailsUrl ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      fullWidth
                      themeName={themeName}
                      onPress={() => openInBrowser(event.detailsUrl!)}
                      accessibilityHint="Ouvre la page de l'événement sur ffie.fr"
                    >
                      Détails
                    </Button>
                  </View>
                ) : null}
                {event.registrationUrl ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="primary"
                      fullWidth
                      themeName={themeName}
                      onPress={() => openInBrowser(event.registrationUrl!)}
                      accessibilityHint="Ouvre le formulaire d'inscription"
                    >
                      Inscription
                    </Button>
                  </View>
                ) : null}
              </View>
            ) : (
              // Texte d'attente — la FFIE n'a pas encore publié le détail de cet événement.
              <Text style={{ color: t.text.muted, fontSize: 15, lineHeight: 22, marginTop: 24 }}>
                Détails à venir.
              </Text>
            )}
          </>
        ) : (
          <Text style={{ color: t.text.muted, fontSize: 15, lineHeight: 22 }}>
            Événement introuvable.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// InfoRow — une icône + une ligne de texte, utilisée pour les informations date/heure.
function InfoRow({
  icon,
  text,
  themeName,
}: {
  icon: React.ReactNode;
  text: string;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", columnGap: 10 }}>
      {icon}
      <Text style={{ flex: 1, color: t.text.body, fontSize: 15, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}
