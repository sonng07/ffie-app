// RecentNews — le carrousel horizontal « Actualités récentes » qui clôt le hub
// Accueil.
//
// Un rail à défilement par aperçu présentant les articles les plus récents
// (ARTICLES est déjà trié du plus récent au plus ancien dans data/news). Chaque
// carte affiche l'image de l'article, une étiquette de catégorie, le titre et le
// temps de lecture. Toucher une carte transmet l'article au parent, qui navigue
// vers l'onglet Actualités (un lecteur complet apparaîtra quand la navigation de
// détail sera câblée).
//
// Le rail déborde au-delà de la marge de page à droite (les cartes défilent hors
// bord) : il gère donc sa propre marge horizontale plutôt que de s'insérer dans
// la marge de section du tableau de bord. snapToInterval offre un calage doux
// carte par carte sans animation personnalisée.

import React from "react";
import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { CARD_SHADOW, useHomeColors } from "./homeColors";
import {
  ARTICLES,
  NEWS_IMAGE_ASPECT_RATIO,
  NEWS_IMAGE_PIXELS,
  type Article,
} from "@/data/news";

const CARD_W = 264;
const CARD_GAP = 14;
// Seulement les plus récents — le rail est un aperçu ; le fil complet vit dans
// l'onglet Actualités.
const ITEMS = ARTICLES.slice(0, 6);

export function RecentNews({
  themeName = "light",
  onPressArticle,
}: {
  themeName?: ThemeName;
  onPressArticle?: (article: Article) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={CARD_W + CARD_GAP}
      snapToAlignment="start"
      contentContainerStyle={{
        paddingHorizontal: GUTTER,
        columnGap: CARD_GAP,
      }}
    >
      {ITEMS.map((article) => (
        <NewsCard
          key={article.id}
          article={article}
          themeName={themeName}
          onPress={() => onPressArticle?.(article)}
        />
      ))}
    </ScrollView>
  );
}

function NewsCard({
  article,
  themeName,
  onPress,
}: {
  article: Article;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useHomeColors(themeName);

  // Ombre sur le conteneur EXTÉRIEUR, découpe arrondie (overflow: hidden, pour
  // que l'image du haut respecte les coins) sur le Pressable intérieur — sur une
  // seule vue, iOS découpe sa propre ombre quand overflow est masqué.
  return (
    <View
      style={{
        width: CARD_W,
        backgroundColor: c.cardBg,
        borderRadius: primitives.radii.lg,
        ...CARD_SHADOW,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={article.title}
        accessibilityHint={`${article.category}, lecture de ${article.readMinutes} minutes`}
        style={({ pressed }): ViewStyle => ({
          borderRadius: primitives.radii.lg,
          borderWidth: 1,
          borderColor: c.cardBorder,
          overflow: "hidden",
          opacity: pressed ? 0.9 : 1,
        })}
      >
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
        <View style={{ padding: 14 }}>
        <Text
          style={{
            color: t.brand.accent,
            fontSize: 11,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 5,
          }}
        >
          {article.category}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: t.text.body,
            fontSize: 14.5,
            lineHeight: 19,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
            letterSpacing: -0.2,
            minHeight: 38, // réserve deux lignes pour aligner le bas des cartes
          }}
        >
          {article.title}
        </Text>
        <Text
          style={{
            color: t.text.muted,
            fontSize: 12,
            fontFamily: ralewayFamily("400"),
            marginTop: 8,
          }}
        >
          {article.date} · {article.readMinutes} min de lecture
        </Text>
        </View>
      </Pressable>
    </View>
  );
}
