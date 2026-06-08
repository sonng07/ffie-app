// Document detail — the member-only reader for a Library document.
//
// This is where the spec'd offline + share behaviours live:
//   - FFIE-DOC-03 (member): download a document "to keep locally". Surfaced
//     here as a "Saved for offline" toggle. Guests can browse the Library list
//     (GUEST_TABS), but tapping a member-only doc routes them to the upsell
//     (MemberOnlyPrompt) instead of here — so this detail is only reached for
//     docs the viewer may open (every doc for members; the public doc for all).
//   - PERSONAS #8: "Share-to-WhatsApp / share-to-Mail must be one tap from
//     any document." → the share action in the nav bar.
//
// "Ouvrir le document" opens a real PDF (doc.sourceUrl) in the in-app
// PdfViewerScreen — an embedded react-native-webview reader with the app's own
// chrome (FFIE-DOC-02: "opened in the application"). Documents that only have an
// HTML detail page (no public file URL) open in the in-app browser instead — the
// expo-web-browser PAGE_SHEET pattern used across the app, the right tool for a
// web page. Once the backend syncs real member-doc file URLs they'll all route
// through the embedded reader.

import React, { useState } from "react";
import { ChevronLeft, FileText, Share2, WifiOff } from "lucide-react-native";
import { Image, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { primitives, themes, type ThemeName } from "@tokens";
import { displayFamily } from "@/theme/fonts";
import { GUTTER, InsetGroup, InsetRow, useGroupedColors } from "@/components/ui/ios";
import { SavedBadge } from "@/components/ui/SavedBadge";
import { PdfViewerScreen } from "@/screens/PdfViewerScreen";
import { docSubtitle, type Doc } from "@/data/docs";

export function DocDetailScreen({
  doc,
  themeName = "light",
  onBack,
}: {
  doc: Doc;
  themeName?: ThemeName;
  onBack: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  // Mock offline state — seeded from the doc's saved flag. In production this
  // reflects the real local-cache state and the toggle triggers the
  // download / eviction.
  const [savedOffline, setSavedOffline] = useState(doc.saved);
  // Real cover image — drops to the FileText placeholder if it can't be fetched.
  const [coverFailed, setCoverFailed] = useState(false);
  // Embedded PDF reader open over the detail (real-PDF docs only).
  const [pdfOpen, setPdfOpen] = useState(false);

  const share = async () => {
    try {
      await Share.share({ title: doc.title, message: `${doc.title}\n\nvia FFIE` });
    } catch {
      // dismissed — no-op
    }
  };

  // A real PDF opens in the embedded reader; an HTML-only detail page opens in
  // the in-app browser (the right tool for a web page).
  const hasPdf = !!doc.sourceUrl;
  const openLabel = hasPdf ? "Ouvrir le document (PDF)" : "Voir sur ffie.fr";
  const openDocument = () => {
    if (hasPdf) {
      setPdfOpen(true);
      return;
    }
    WebBrowser.openBrowserAsync(doc.detailUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).catch(() => {
      // browser unavailable — no-op
    });
  };

  // Embedded reader replaces the detail while open (home-rolled nav pattern).
  if (pdfOpen && doc.sourceUrl) {
    return (
      <PdfViewerScreen
        uri={doc.sourceUrl}
        title={doc.title}
        themeName={themeName}
        onBack={() => setPdfOpen(false)}
        onShare={share}
      />
    );
  }

  const showCover = !!doc.thumbUrl && !coverFailed;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Slim nav bar: back + share */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: GUTTER - 4,
          height: 44,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour à la bibliothèque"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            columnGap: 1,
            opacity: pressed ? 0.5 : 1,
            paddingVertical: 6,
            paddingRight: 8,
          })}
        >
          <ChevronLeft size={26} color={t.brand.accent} />
          <Text style={{ color: t.brand.accent, fontSize: 16 }}>Bibliothèque</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager ce document"
          onPress={share}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Share2 size={20} color={t.brand.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Preview — the real FFIE cover, with an honest placeholder fallback */}
        <View style={{ paddingHorizontal: GUTTER, marginBottom: 20 }}>
          <View
            style={{
              height: 220,
              borderRadius: primitives.radii.lg,
              backgroundColor: themeName === "dark" ? t.surface.raised : t.surface.subtle,
              borderWidth: c.cardBorder ? 1 : 0,
              borderColor: c.cardBorder,
              alignItems: "center",
              justifyContent: "center",
              rowGap: 10,
              overflow: "hidden",
            }}
          >
            {showCover ? (
              <Image
                source={{ uri: doc.thumbUrl }}
                onError={() => setCoverFailed(true)}
                resizeMode="contain"
                style={StyleSheet.absoluteFill}
                accessibilityLabel={`Couverture : ${doc.title}`}
              />
            ) : (
              <>
                <View
                  style={{
                    width: 56,
                    height: 68,
                    borderRadius: 8,
                    backgroundColor: t.brand.institutional,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={28} color="#FFFFFF" />
                </View>
                <Text style={{ color: t.text.muted, fontSize: 12 }}>Aperçu du document FFIE</Text>
              </>
            )}
          </View>
        </View>

        {/* Title + meta */}
        <View style={{ paddingHorizontal: GUTTER, marginBottom: 20 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: t.text.body,
              fontSize: 24,
              lineHeight: 30,
              fontFamily: displayFamily("700"),
              fontWeight: "700",
              letterSpacing: -0.4,
            }}
          >
            {doc.title}
          </Text>
          <Text style={{ color: t.text.muted, fontSize: 14, marginTop: 6 }}>{docSubtitle(doc)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <SavedBadge saved={savedOffline} size="sm" themeName={themeName} />
          </View>
        </View>

        {/* Offline — the FFIE-DOC-03 control (member only) */}
        <InsetGroup
          header="Hors ligne"
          footer="Les documents enregistrés s'ouvrent sans connexion internet."
          themeName={themeName}
        >
          <InsetRow
            icon={WifiOff}
            iconBg={t.brand.accent}
            title="Enregistré hors ligne"
            subtitle={savedOffline ? "Disponible sans internet" : "Télécharger pour conserver sur cet appareil"}
            themeName={themeName}
            isLast
            showChevron={false}
            trailing={
              <Switch
                value={savedOffline}
                onValueChange={setSavedOffline}
                trackColor={{ true: t.brand.accent, false: t.border.default }}
                accessibilityLabel="Enregistrer ce document pour un accès hors ligne"
              />
            }
          />
        </InsetGroup>

        {/* Actions */}
        <InsetGroup themeName={themeName}>
          <InsetRow
            icon={FileText}
            iconBg={t.brand.institutional}
            title={openLabel}
            themeName={themeName}
            onPress={openDocument}
          />
          <InsetRow
            icon={Share2}
            iconBg="#5B6577"
            title="Partager"
            themeName={themeName}
            isLast
            showChevron={false}
            onPress={share}
          />
        </InsetGroup>

        {/* Details */}
        <InsetGroup header="Détails" themeName={themeName}>
          <InsetRow title="Format" value="PDF" themeName={themeName} showChevron={false} />
          <InsetRow
            title="Famille"
            value={doc.family}
            themeName={themeName}
            showChevron={false}
            isLast={doc.categories.length === 0}
          />
          {doc.categories.length > 0 ? (
            <InsetRow
              title={doc.categories.length > 1 ? "Catégories" : "Catégorie"}
              subtitle={doc.categories.join(" · ")}
              themeName={themeName}
              showChevron={false}
              isLast
            />
          ) : null}
        </InsetGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
