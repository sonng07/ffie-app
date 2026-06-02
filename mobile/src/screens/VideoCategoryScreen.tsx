// Video category reader — pushed when a tile on the Vidéos segment of the
// Trades tab is tapped. Clones an FFIE video page (e.g. "L'intelligence
// artificielle"): a slim back/share bar, the category title, then each film as
// a title + an inline YouTube player (YouTubeEmbed) that plays IN the app — no
// redirect to the website (FFIE-VIDEO-01, captions on by default).
//
// Stateless beyond the Share call — the parent (DiscoverScreen's stack) owns
// which category is open and the back transition.

import React from "react";
import { ChevronLeft, Share2 } from "lucide-react-native";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import type { VideoCategory } from "@/data/videos";

export function VideoCategoryScreen({
  category,
  themeName = "light",
  onBack,
}: {
  category: VideoCategory;
  themeName?: ThemeName;
  onBack: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  const share = async () => {
    try {
      await Share.share({ title: category.title, message: `${category.title}\n\nvia FFIE` });
    } catch {
      // User dismissed the share sheet — no-op.
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Slim nav bar: back + share (mirrors the News / formation readers). */}
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
          accessibilityLabel="Retour aux vidéos"
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
          <Text style={{ color: t.brand.accent, fontSize: 16 }}>Vidéos</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager cette vidéo"
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

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Category title. */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 18 }}>
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
            {category.title}
          </Text>
        </View>

        {/* One title + inline player per film. */}
        <View style={{ paddingHorizontal: GUTTER, rowGap: 28 }}>
          {category.videos.map((video) => (
            <View key={video.youtubeId} style={{ rowGap: 12 }}>
              {video.title && video.title !== category.title ? (
                <Text
                  style={{
                    color: t.text.body,
                    fontSize: 18,
                    lineHeight: 24,
                    fontFamily: ralewayFamily("700"),
                    fontWeight: "700",
                    letterSpacing: -0.2,
                  }}
                >
                  {video.title}
                </Text>
              ) : null}
              <YouTubeEmbed
                youtubeId={video.youtubeId}
                accessibilityLabel={`Vidéo : ${video.title ?? category.title}`}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
