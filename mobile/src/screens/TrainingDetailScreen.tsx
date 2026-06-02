// Formation reader — the detail screen pushed when a "Découvrez les formations"
// card on the Trades tab is tapped (FFIE-TRADES-01). Mirrors the News article
// reader (NewsArticleScreen) so the two read identically: a slim back bar, an
// accent chip, the headline (Sora display), a muted meta line, then the body —
// plain paragraphs or rich lines whose bold / link spans render, links opening
// in the native in-app browser. Prev/next walk the 8 formations.
//
// A formation without `detail` (FFIE hasn't supplied copy yet) falls back to an
// honest "Détails à venir" state — never fabricated content (see CLAUDE.md).
//
// Stateless beyond the link taps and the Share call — the parent (DiscoverScreen's
// stack) owns which formation is open and the back transition.

import React from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Share2 } from "lucide-react-native";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import type { Training } from "@/data/trades";

export function TrainingDetailScreen({
  training,
  themeName = "light",
  onBack,
  prev = null,
  next = null,
  onNavigate,
}: {
  training: Training;
  themeName?: ThemeName;
  onBack: () => void;
  prev?: Training | null;
  next?: Training | null;
  onNavigate?: (tr: Training) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const detail = training.detail;

  const share = async () => {
    try {
      await Share.share({
        title: training.title,
        message: `${training.title}\n\nvia FFIE`,
      });
    } catch {
      // User dismissed the share sheet — no-op.
    }
  };

  // Open an in-article link in the native in-app browser (page sheet, slides up
  // from the bottom), matching the News reader and Partners directory.
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
      {/* Slim nav bar: back + share (mirrors the News reader). */}
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
          accessibilityLabel="Retour aux formations"
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
          <Text style={{ color: t.brand.accent, fontSize: 16 }}>Métiers</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager cette formation"
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
        {/* Hero image — seeded placeholder (swap for real FFIE photo later). */}
        <RemoteImage
          seed={training.seed}
          uri={training.imageUrl}
          width="100%"
          height={210}
          pixelWidth={1000}
          pixelHeight={600}
          themeName={themeName}
          accessibilityLabel={training.alt}
        />

        <View style={{ paddingHorizontal: GUTTER }}>
          {/* Accent chip — defaults to "Formation" when none supplied. */}
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
                {detail?.chip ?? "Formation"}
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
            {training.title}
          </Text>

          {/* Meta line — where the News reader shows the date. */}
          {detail?.meta ? (
            <Text style={{ color: t.text.muted, fontSize: 13, marginTop: 10, marginBottom: 20 }}>
              {detail.meta}
            </Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {detail && detail.body.length > 0 ? (
            <>
              {/* Body. The first block renders as a larger "lead" line. Each
                  block is a paragraph, a rich line (bold / link spans, links
                  opening in the in-app browser), a section sub-heading, or a
                  bulleted list. */}
              {detail.body.map((block, i) => {
                // Section sub-heading.
                if (typeof block === "object" && !Array.isArray(block) && "heading" in block) {
                  return (
                    <Text
                      key={i}
                      accessibilityRole="header"
                      style={{
                        color: t.text.body,
                        fontSize: 19,
                        lineHeight: 25,
                        fontFamily: displayFamily("700"),
                        fontWeight: "700",
                        letterSpacing: -0.3,
                        marginTop: 8,
                        marginBottom: 12,
                      }}
                    >
                      {block.heading}
                    </Text>
                  );
                }

                // Bulleted list — accent bullet + body line per item.
                if (typeof block === "object" && !Array.isArray(block) && "list" in block) {
                  return (
                    <View key={i} style={{ marginBottom: 16, rowGap: 8 }}>
                      {block.list.map((item, k) => (
                        <View key={k} style={{ flexDirection: "row", columnGap: 10 }}>
                          <Text style={{ color: t.brand.accent, fontSize: 16, lineHeight: 25 }}>•</Text>
                          <Text style={{ flex: 1, color: t.text.body, fontSize: 16, lineHeight: 25 }}>
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                }

                // Paragraph (string) or rich line (segment array).
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

              {/* Optional "En savoir plus →" external link. */}
              {detail.link ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={detail.link.label}
                  onPress={() => openInBrowser(detail.link!.url)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    columnGap: 6,
                    alignSelf: "flex-start",
                    marginTop: 4,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: t.brand.accent,
                      fontSize: 15,
                      fontFamily: ralewayFamily("700"),
                      fontWeight: "700",
                    }}
                  >
                    {detail.link.label}
                  </Text>
                  <ArrowRight size={17} color={t.brand.accent} />
                </Pressable>
              ) : null}
            </>
          ) : (
            // No copy yet — honest placeholder, never fabricated content.
            <Text style={{ color: t.text.muted, fontSize: 16, lineHeight: 25 }}>
              Détails à venir.
            </Text>
          )}

          {/* Previous / next formation navigation. Previous is disabled on the
              first formation, next on the last. */}
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
            <TrainingNavButton dir="prev" training={prev} onNavigate={onNavigate} themeName={themeName} />
            <TrainingNavButton dir="next" training={next} onNavigate={onNavigate} themeName={themeName} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// TrainingNavButton — bottom-of-reader "previous / next" control. Shows the
// target formation's title with a back/forward arrow. Disabled (no target) on
// the first formation (prev) and the last (next). Mirrors the News reader's
// ArticleNavButton.
// ---------------------------------------------------------------------------
function TrainingNavButton({
  dir,
  training,
  onNavigate,
  themeName,
}: {
  dir: "prev" | "next";
  training: Training | null;
  onNavigate?: (tr: Training) => void;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  const disabled = !training || !onNavigate;
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const caption = dir === "prev" ? "Précédent" : "Suivant";
  const alignText = dir === "prev" ? "left" : "right";

  return (
    <Pressable
      disabled={disabled}
      onPress={training && onNavigate ? () => onNavigate(training) : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={
        training
          ? `Formation ${caption.toLowerCase()} : ${training.title}`
          : `Formation ${caption.toLowerCase()}, indisponible`
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
          {training ? training.title : "—"}
        </Text>
      </View>
      {dir === "next" ? <Icon size={20} color={t.brand.accent} /> : null}
    </Pressable>
  );
}
