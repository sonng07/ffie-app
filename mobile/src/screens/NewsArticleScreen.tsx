// Lecteur d'article d'actualité. Style iOS : une barre fine retour/partage, une
// puce de catégorie, le titre (display Sora), une ligne de méta, et le corps.
// L'action de partage couvre le comportement de Julien « partager l'écran de
// l'article lors d'une réunion client ».
//
// Sans état au-delà de l'appel à Share — le parent (NewsScreen) détient quel
// article est ouvert et la transition de retour.

import React from "react";
import { ChevronLeft, ChevronRight, FileText, Download, Share2 } from "lucide-react-native";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import {
  NEWS_IMAGE_ASPECT_RATIO,
  NEWS_IMAGE_PIXELS,
  type Article,
} from "@/data/news";

export function NewsArticleScreen({
  article,
  themeName = "light",
  onBack,
  prev = null,
  next = null,
  onNavigate,
}: {
  article: Article;
  themeName?: ThemeName;
  onBack: () => void;
  prev?: Article | null;
  next?: Article | null;
  onNavigate?: (a: Article) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  const share = async () => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nvia FFIE`,
      });
    } catch {
      // L'utilisateur a fermé la feuille de partage — sans effet.
    }
  };

  // Ouvre un lien dans l'article dans le navigateur intégré natif (page sheet,
  // glisse vers le haut depuis le bas), comme l'annuaire Partenaires. Garde le
  // lecteur dans l'app — la fermeture revient directement à l'article.
  const openInBrowser = (url: string) => {
    WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: t.brand.accent,
      toolbarColor: t.surface.default,
      dismissButtonStyle: "close",
    }).catch(() => {});
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Barre de navigation fine : retour + partage */}
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
          accessibilityLabel="Retour aux actualités"
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
          <Text style={{ color: t.brand.accent, fontSize: 16 }}>Actualités</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager cet article"
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
        {/* Image hero — au format d'actualité standard 16:9 (FFIE-15) plutôt qu'une
            hauteur fixe : l'image se met à l'échelle proportionnellement, sans
            recadrage. Espace réservé avec graine (remplacer par une vraie image CMS plus tard). */}
        <RemoteImage
          seed={`ffie-news-${article.id}`}
          uri={article.imageUrl}
          width="100%"
          aspectRatio={NEWS_IMAGE_ASPECT_RATIO}
          pixelWidth={NEWS_IMAGE_PIXELS.width}
          pixelHeight={NEWS_IMAGE_PIXELS.height}
          themeName={themeName}
          accessibilityLabel={`Illustration pour ${article.title}`}
        />

        <View style={{ paddingHorizontal: GUTTER }}>
        {/* Puce de catégorie */}
        <View style={{ flexDirection: "row", marginTop: 16, marginBottom: 12 }}>
          <View
            style={{
              backgroundColor: t.brand.accent,
              borderRadius: primitives.radii.full,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 11,
                fontFamily: ralewayFamily("600"),
                fontWeight: "600",
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              {article.category}
            </Text>
          </View>
        </View>

        {/* Titre */}
        <Text
          accessibilityRole="header"
          style={{
            color: t.text.body,
            fontSize: 28,
            lineHeight: 34,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.5,
          }}
        >
          {article.title}
        </Text>

        {/* Méta */}
        <Text style={{ color: t.text.muted, fontSize: 13, marginTop: 10, marginBottom: 20 }}>
          {article.date}
        </Text>

        {/* Corps. Le premier bloc se rend comme une ligne « chapô » plus grande.
            Chaque bloc est un paragraphe en chaîne simple, ou une ligne riche avec
            des segments en gras / liens ; les segments de lien avec une url l'ouvrent au toucher. */}
        {article.body.map((block, i) => {
          const lead = i === 0;
          return (
            <Text
              key={i}
              style={{
                color: t.text.body,
                fontSize: lead ? 19 : 16,
                lineHeight: lead ? 28 : 25,
                marginBottom: lead ? 20 : 16,
              }}
            >
              {typeof block === "string"
                ? block
                : block.map((seg, j) => {
                    const spanStyle = [
                      seg.bold && {
                        fontFamily: ralewayFamily("700"),
                        fontWeight: "700" as const,
                      },
                      seg.link && {
                        color: t.brand.accent,
                        textDecorationLine: "underline" as const,
                      },
                    ];
                    const href = seg.url;
                    return (
                      <Text
                        key={j}
                        style={spanStyle}
                        onPress={seg.link && href ? () => openInBrowser(href) : undefined}
                      >
                        {seg.text}
                      </Text>
                    );
                  })}
            </Text>
          );
        })}

        {/* Documents associés (NEWS-02). Les vrais fichiers FFIE référencés par
            l'article, présentés sous forme de liste touchable plutôt que de
            simples liens en ligne. S'ouvrent dans le navigateur intégré pour
            l'instant (téléchargement = FFIE-DOC-03). */}
        {article.attachments && article.attachments.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: t.text.muted,
                fontSize: 12,
                fontFamily: ralewayFamily("600"),
                fontWeight: "600",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Documents associés
            </Text>
            <View
              style={{
                backgroundColor: c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: c.cardBorder ? 1 : 0,
                borderColor: c.cardBorder,
                overflow: "hidden",
              }}
            >
              {article.attachments.map((doc, i) => (
                <Pressable
                  key={doc.url}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir le document : ${doc.label}`}
                  accessibilityHint="Ouvre le document dans l'app"
                  onPress={() => openInBrowser(doc.url)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    columnGap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    minHeight: 48,
                    backgroundColor: pressed ? t.surface.subtle : "transparent",
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: t.border.default,
                  })}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor: t.brand.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={18} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{
                      flex: 1,
                      color: t.text.body,
                      fontSize: 15,
                      lineHeight: 20,
                      fontFamily: ralewayFamily("600"),
                      fontWeight: "600",
                    }}
                  >
                    {doc.label}
                  </Text>
                  <Download size={18} color={t.brand.accent} style={{ opacity: 0.85 }} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Navigation article précédent / suivant. Précédent est désactivé sur le
            premier article, suivant sur le dernier. */}
        <View
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: t.border.default,
            flexDirection: "row",
            columnGap: 10,
          }}
        >
          <ArticleNavButton dir="prev" article={prev} onNavigate={onNavigate} themeName={themeName} />
          <ArticleNavButton dir="next" article={next} onNavigate={onNavigate} themeName={themeName} />
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ArticleNavButton — le contrôle « précédent / suivant » en bas de l'article.
// Affiche le titre de l'article cible avec une flèche arrière/avant. Désactivé
// (pas de cible) sur le premier article (précédent) et le dernier article (suivant).
// ---------------------------------------------------------------------------
function ArticleNavButton({
  dir,
  article,
  onNavigate,
  themeName,
}: {
  dir: "prev" | "next";
  article: Article | null;
  onNavigate?: (a: Article) => void;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  const disabled = !article || !onNavigate;
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const caption = dir === "prev" ? "Précédent" : "Suivant";
  const alignText = dir === "prev" ? "left" : "right";

  return (
    <Pressable
      disabled={disabled}
      onPress={article && onNavigate ? () => onNavigate(article) : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={
        article ? `Article ${caption.toLowerCase()} : ${article.title}` : `Article ${caption.toLowerCase()}, indisponible`
      }
      style={({ pressed }) => ({
        flex: 1, // diviser la rangée en deux moitiés égales
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border.default,
        backgroundColor: pressed && !disabled ? t.surface.subtle : "transparent",
        opacity: disabled ? 0.4 : 1,
      })}
    >
      {dir === "prev" ? <Icon size={20} color={t.brand.accent} /> : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: t.text.muted,
            fontSize: 11,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            textAlign: alignText,
          }}
        >
          {caption}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: t.text.body,
            fontSize: 13,
            lineHeight: 17,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
            marginTop: 2,
            textAlign: alignText,
          }}
        >
          {article ? article.title : "—"}
        </Text>
      </View>
      {dir === "next" ? <Icon size={20} color={t.brand.accent} /> : null}
    </Pressable>
  );
}
