// Trades tab — the public discovery surface for guests (Karim + Léa).
//
// A segmented control under the large title splits the tab into three segments,
// mirroring the News / Partners tabs' toggle:
//   • Trades       — the careers content (the original Discover screen, below).
//   • Videos       — multimedia content (FFIE-VIDEO-01, 🔵 Phase 1): a clone of
//                    the FFIE "Videos" page — four themed categories that open
//                    the federation's video pages in the in-app browser.
//   • Calculators  — technical calculation tools (FFIE-CALC-01/02, 🟢 Phase 2,
//                    member-only). The module + the power↔current tool
//                    are built (see CalculatorsView); guests get a locked state.
//
// The "Trades" segment (TradesBody) mirrors the client careers page
// (ffie.fr/les-metiers-de-lelectricite/metiers-et-formations) section-by-section:
//   1. The client's intro paragraph (verbatim).
//   2. Explore the field — the 5 domains as tappable rows opening a detail sheet.
//   3. Two feature cards — "7 Reasons…" and the "kit professions"; each opens
//      its page (the kit is a PDF) in the in-app browser.
//   4. "Professions of tomorrow" — heading + intro + a 2-column TRAINING grid
//      + a "See more training" button (opens the trades index).
//
// Scope: Trades is FFIE-TRADES-01 (career profiles + educational content). All
// imagery is placeholder (see data/trades.ts); links open externally (P6).

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, useNavigationContainerRef, StackActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { useHomeColors } from "@/components/home/homeColors";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { VideoCategoryScreen } from "./VideoCategoryScreen";
import { ToolsHubView } from "./ToolsHubView";
import { ProfessionsView } from "./ProfessionsView";
import {
  VIDEOS_INTRO,
  VIDEO_CATEGORIES,
  YOUTUBE_CHANNEL_URL,
  youtubeThumb,
  type VideoCategory,
} from "@/data/videos";

// Open an external link in the native in-app browser (page sheet, slides up
// from the bottom), matching the News / training readers and the Partners
// directory. Used by the Trades feature cards, the "See more training"
// button, and the Videos channel link.
function openInBrowser(url: string, themeName: ThemeName) {
  const t = themes[themeName];
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: t.brand.accent,
    toolbarColor: t.surface.default,
    dismissButtonStyle: "close",
  }).catch(() => {});
}

// The Discover tab is a self-contained native stack (Feed → VideoCategory),
// like the News tab: opening a video category pushes the in-app player, which
// gets the platform back affordances for free (iOS left-edge swipe, Android
// system back). Routes carry only the category id (params must be serialisable).
type TradesStackParamList = {
  Feed: undefined;
  VideoCategory: { id: string };
};

const Stack = createNativeStackNavigator<TradesStackParamList>();

const GRID_GAP = 14;

// The segments inside the Discover tab. "trades" is the public careers content
// (the default landing — a blank placeholder for now, pending FFIE content);
// "tools" is the launcher grid that now also hosts the calculators (see
// ToolsHubView); "videos" clones the FFIE videos page. A segmented control at
// the top toggles between them, like the News tab.
type TradesTab = "trades" | "tools" | "videos";

// Large-title text per segment (the header re-titles like the News tab does).
const TAB_TITLES: Record<TradesTab, string> = {
  trades: "Trades",
  tools: "Tools",
  videos: "Videos",
};

export function DiscoverScreen({
  themeName = "light",
  resetSignal,
  initialSegment,
}: {
  themeName?: ThemeName;
  /** Incremented by the shell when the Trades tab is re-tapped while already
   *  active. We use it to pop the stack back to the grid from an open reader. */
  resetSignal?: number;
  /** Open on a specific segment (e.g. "tools" when arriving from the Home
   *  "Tools FFIE" shortcut). Defaults to the careers content ("trades"). */
  initialSegment?: TradesTab;
}) {
  const reducedMotion = useReducedMotion();
  const navRef = useNavigationContainerRef<TradesStackParamList>();

  // Re-tapping the active Trades tab pops the training reader back to the grid.
  // Skip the first run (mount) so we only react to genuine re-taps.
  const isFirstResetRun = useRef(true);
  useEffect(() => {
    if (isFirstResetRun.current) {
      isFirstResetRun.current = false;
      return;
    }
    if (navRef.isReady() && navRef.canGoBack()) {
      navRef.dispatch(StackActions.popToTop());
    }
  }, [resetSignal, navRef]);

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // each screen draws its own iOS-HIG header
          // Reduced motion is non-negotiable (P5): collapse the push/pop
          // transition to an instant cut. The left-edge swipe-back gesture
          // stays enabled either way — it's an input, not decorative motion.
          animation: reducedMotion ? "none" : "default",
        }}
      >
        <Stack.Screen name="Feed">
          {({ navigation }) => (
            <DiscoverFeed
              themeName={themeName}
              initialTab={initialSegment}
              onOpenVideo={(id) => navigation.navigate("VideoCategory", { id })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="VideoCategory">
          {({ navigation, route }) => (
            <VideoCategoryRoute
              id={route.params.id}
              themeName={themeName}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// VideoCategoryRoute — resolves the route's category id into the video reader.
// An unknown id just pops back to the grid.
function VideoCategoryRoute({
  id,
  themeName,
  onBack,
}: {
  id: string;
  themeName: ThemeName;
  onBack: () => void;
}) {
  const category = VIDEO_CATEGORIES.find((cat) => cat.id === id) ?? null;

  useEffect(() => {
    if (!category) onBack();
  }, [category, onBack]);
  if (!category) return null;

  return <VideoCategoryScreen category={category} themeName={themeName} onBack={onBack} />;
}

// DiscoverFeed — the Trades tab feed itself: the segmented control (Trades /
// Videos / Calculators) and, on the Trades segment, the careers content. Owns
// the active-segment state; stays mounted beneath a pushed training reader
// (native stack), so scroll and segment survive the round-trip.
function DiscoverFeed({
  themeName = "light",
  initialTab,
  onOpenVideo,
}: {
  themeName?: ThemeName;
  initialTab?: TradesTab;
  onOpenVideo?: (id: string) => void;
}) {
  const c = useGroupedColors(themeName);
  // The "Tools" launcher grid takes the Home dashboard look — recessed grey
  // page behind raised white cards — so it gets the Home palette, not the list
  // screens' inverted (white page / grey card) one.
  const homeC = useHomeColors(themeName);

  // Active segment. The "Trades" careers content is the default landing (a blank
  // placeholder for now). "Tools" is the launcher grid (now hosting the
  // calculators) and "Videos" clones the FFIE videos page. `initialTab` lets a
  // deep link (Home "Tools FFIE" / "Our trades" shortcut) open a specific segment.
  const [tab, setTab] = useState<TradesTab>(initialTab ?? "trades");

  // Switching segment starts fresh at the top, matching News / Partners.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  // The Tools launcher sits on the recessed grey dashboard page; the other
  // segments keep the list screens' page background.
  const pageBg = tab === "tools" || tab === "trades" ? homeC.pageBg : c.pageBg;

  return (
    // Page title now lives in the shared AppHeader (shell); content renders
    // directly beneath it.
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Segment toggle. Sits under the large title like an iOS segmented
            control: Trades (careers content, default), Tools (launcher grid +
            calculators) and Videos. */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 18 }}>
          <SegmentedControl
            themeName={themeName}
            value={tab}
            options={[
              { key: "trades", label: "Trades" },
              { key: "tools", label: "Tools" },
              { key: "videos", label: "Videos" },
            ]}
            onChange={setTab}
          />
        </View>

        {tab === "tools" ? (
          // The "Tools FFIE" launcher grid — now also hosts the calculators as
          // tiles (PowerCalculatorSheet / VoltageDropSheet), member-gated.
          // See ToolsHubView.
          <ToolsHubView themeName={themeName} />
        ) : tab === "videos" ? (
          // FFIE-VIDEO-01 (🔵 Phase 1) — clone of the FFIE "Videos" page.
          <VideosView themeName={themeName} onOpenCategory={onOpenVideo} />
        ) : (
          // "Trades" (default) — the public "Discover the professions" section
          // (WBS Epic 4): career profiles + training paths + presentation
          // videos. The earlier careers content is kept in TradesBody (below).
          <ProfessionsView themeName={themeName} />
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// VideosView — the "Videos" segment: a clone of the FFIE "Videos" page. An
// intro line, a 2-up grid of themed video categories (each pushing an in-app
// category reader that plays the films), and a button to the federation's
// YouTube channel. Data lives in data/videos.ts.
// ---------------------------------------------------------------------------
function VideosView({
  themeName,
  onOpenCategory,
}: {
  themeName: ThemeName;
  onOpenCategory?: (id: string) => void;
}) {
  const t = themes[themeName];
  const { width: screenW } = useWindowDimensions();
  const colW = (screenW - GUTTER * 2 - GRID_GAP) / 2;

  return (
    <>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 2 }}>
        <Text style={{ color: t.text.muted, fontSize: 15, lineHeight: 22 }}>{VIDEOS_INTRO}</Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          columnGap: GRID_GAP,
          rowGap: 18,
          paddingHorizontal: GUTTER,
          marginTop: 20,
        }}
      >
        {VIDEO_CATEGORIES.map((category) => (
          <VideoTile
            key={category.id}
            category={category}
            width={colW}
            themeName={themeName}
            onPress={() => onOpenCategory?.(category.id)}
          />
        ))}
      </View>

      {/* The intro points users to the federation's channel "to see everything" —
          this is that link, opening the channel in the in-app browser. */}
      <View style={{ alignItems: "center", marginTop: 24 }}>
        <ChannelButton themeName={themeName} />
      </View>
    </>
  );
}

// ChannelButton — the outlined "View our YouTube channel" button under the
// Videos grid. Mirrors SeeMoreButton, with an external-link glyph (the channel
// opens in the in-app browser, not inline) — YOUTUBE_CHANNEL_URL.
function ChannelButton({ themeName }: { themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View our YouTube channel."
      accessibilityHint="Opens the FFIE YouTube channel"
      onPress={() => openInBrowser(YOUTUBE_CHANNEL_URL, themeName)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
        minHeight: 48,
        paddingHorizontal: 22,
        borderRadius: primitives.radii.md,
        borderWidth: 1.5,
        borderColor: t.brand.accent,
        backgroundColor: pressed ? t.border.subtle : "transparent",
      })}
    >
      <ExternalLink size={17} color={t.brand.accent} />
      <Text
        style={{
          color: t.brand.accent,
          fontSize: 13,
          fontFamily: ralewayFamily("700"),
          fontWeight: "700",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        View our YouTube channel
      </Text>
    </Pressable>
  );
}

// VideoTile — a 2-up grid card for a video category: 16:9 thumbnail with a
// centered play badge, then the title and the number of films.
function VideoTile({
  category,
  width,
  themeName,
  onPress,
}: {
  category: VideoCategory;
  width: number;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const count = category.videos.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.title}. ${count > 1 ? `${count} videos` : "1 video"}.`}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        backgroundColor: pressed ? t.border.subtle : c.cardBg,
        borderRadius: primitives.radii.lg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        overflow: "hidden",
        transform: pressed ? [{ scale: 0.985 }] : [{ scale: 1 }],
      })}
    >
      <View>
        <RemoteImage
          uri={category.videos[0] ? youtubeThumb(category.videos[0].youtubeId) : category.imageUrl}
          seed={category.seed}
          width="100%"
          aspectRatio={16 / 9}
          pixelWidth={640}
          pixelHeight={360}
          themeName={themeName}
          accessibilityLabel={category.alt}
        />
        {/* Centered play badge over the thumbnail. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text
          style={{
            color: t.text.body,
            fontSize: 14.5,
            lineHeight: 19,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.1,
          }}
        >
          {category.title}
        </Text>
        <Text style={{ color: t.text.muted, fontSize: 12.5, marginTop: 4 }}>
          {count > 1 ? `${count} videos` : "1 video"}
        </Text>
      </View>
    </Pressable>
  );
}
