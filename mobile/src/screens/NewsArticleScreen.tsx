// News article reader. iOS-style: a slim back/share bar, a category chip,
// the headline (Sora display), a meta line, and the body. The share action
// covers Julien's "screen-share the article in a client meeting" behaviour.
//
// Stateless beyond the Share call — the parent (NewsScreen) owns which
// article is open and the back transition.

import React from "react";
import { ChevronLeft, ChevronRight, FileText, Download, Share2 } from "lucide-react-native";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import type { Article } from "@/data/news";

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
      // User dismissed the share sheet — no-op.
    }
  };

  // Open an in-article link in the native in-app browser (page sheet, slides
  // up from the bottom), matching the Partners directory. Keeps the reader in
  // the app — dismissing returns straight to the article.
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
        {/* Hero image — seeded placeholder (swap for real CMS image later) */}
        <RemoteImage
          seed={`ffie-news-${article.id}`}
          uri={article.imageUrl}
          width="100%"
          height={210}
          pixelWidth={1000}
          pixelHeight={600}
          themeName={themeName}
          accessibilityLabel={`Illustration de ${article.title}`}
        />

        <View style={{ paddingHorizontal: GUTTER }}>
        {/* Category chip */}
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

        {/* Headline */}
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

        {/* Meta */}
        <Text style={{ color: t.text.muted, fontSize: 13, marginTop: 10, marginBottom: 20 }}>
          {article.date}
        </Text>

        {/* Body. The first block renders as a larger "lead" line. Each block is
            a plain string paragraph, or a rich line with bold / link spans;
            link spans with a url open it on tap. */}
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

        {/* Associated documents (NEWS-02). The real FFIE files the article
            references, surfaced as a tappable list rather than only inline
            links. Opens in the in-app browser for now (download = FFIE-DOC-03). */}
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
                  accessibilityHint="Ouvre le document dans l'application"
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

        {/* Previous / next article navigation. Previous is disabled on the
            first article, next on the last. */}
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
// ArticleNavButton — bottom-of-article "previous / next" control. Shows the
// target article's title with a back/forward arrow. Disabled (no target) on
// the first article (prev) and the last article (next).
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
        flex: 1, // split the row into two equal halves
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
