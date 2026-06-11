// News tab — article feed → reader, shared by all personas (Epic 2).
//
// Layout: a horizontal rail of category pills sits under the large title
// ("All" + one pill per NewsCategory, single-select), then every article
// renders as a full-width card in a single column, publication order. Picking
// a pill filters the whole list in place; "All" restores it.
//
// Navigation: NewsScreen is a self-contained native stack (Feed → Article /
// Locked) via @react-navigation/native-stack, so the reader gets the platform
// back gestures — iOS left-edge swipe and Android system back — natively.
// Tapping an article opens the reader. A guest who taps a member-only article
// is sent to the membership upsell instead — the public/member boundary inside
// News, which doubles as a conversion surface.
//
// Role gating uses the shared canAccess() so it stays consistent with route
// guards elsewhere. onApply / onSignIn are forwarded to the upsell by the
// guest shell; members never hit the locked branch.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { ArrowUp } from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Pagination } from "@/components/ui/Pagination";
import { LockTag } from "@/components/ui/LockTag";
import { ARTICLES, type Article, type NewsCategory } from "@/data/news";
import { NavigationContainer, useNavigationContainerRef, StackActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { canAccess, useRole } from "@/auth/roleContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  ASSISTANT_FAB_SIZE,
  ASSISTANT_FAB_GAP,
} from "@/components/assistant/AssistantChatWidget";
import { NewsArticleScreen } from "./NewsArticleScreen";
import { MemberOnlyPrompt } from "./MemberOnlyPrompt";

// Categories users can filter the feed by — the pill rail at the top of the
// feed. Single-select: "All" shows everything, a category pill narrows the
// list to that category. Keep in sync with the NewsCategory union in
// data/news.ts.
type CategoryKey = NewsCategory | "all";
const CATEGORY_PILLS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Technical", label: "Technical" },
  { key: "Training", label: "Training" },
  { key: "Communication", label: "Communication" },
  { key: "Economical", label: "Economy" },
];

// Vertical rhythm between the full-width cards in the feed column.
const ROW_GAP = 18;

// Scroll depth (px) past which the floating back-to-top button fades in. Matches
// the threshold used on the Library feed for a consistent feel across tabs.
const BACK_TO_TOP_AT = 520;

// The Claude assistant FAB (AssistantChatWidget) owns the bottom-right corner.
// This button lives in the screen's content area, which already sits ABOVE the
// tab bar (the bottom inset is absorbed there) — so it's measured from the tab
// bar's top, not the device edge, and needs no safe-area inset. The FAB rises
// ASSISTANT_FAB_GAP + ASSISTANT_FAB_SIZE into this space, so the button stacks
// one 12pt gap above it.
const BACK_TO_TOP_LIFT = ASSISTANT_FAB_GAP + ASSISTANT_FAB_SIZE + 12;

// The News tab is a native stack so the article reader gets the platform's
// real back affordances for free: iOS's left-edge swipe-back and Android's
// system back (button or gesture-nav swipe) both pop the stack natively — no
// home-rolled BackHandler needed. The bottom tab bar lives above this in the
// shell, so it stays visible while a screen is pushed.
//
// Routes carry only an article id — react-navigation params must be
// serialisable (it warns on objects/functions), so each screen resolves the
// article from ARTICLES by id rather than receiving the object.
type NewsStackParamList = {
  Feed: undefined;
  Article: { id: number };
  Locked: { id: number };
};

const Stack = createNativeStackNavigator<NewsStackParamList>();

export function NewsScreen({
  themeName = "light",
  onApply,
  onSignIn,
  resetSignal,
  onDetailChange,
}: {
  themeName?: ThemeName;
  onApply?: () => void;
  onSignIn?: () => void;
  /** Incremented by the shell when the News tab is re-tapped while already
   *  active. We use it to pop the stack back to the feed from an open article. */
  resetSignal?: number;
  /** Fired with `true` when a sub-view (article reader, member-only prompt)
   *  is pushed, `false` back on the feed. The shell uses it to hide the
   *  floating account avatar on detail pages — it belongs on main pages only. */
  onDetailChange?: (isDetail: boolean) => void;
}) {
  const reducedMotion = useReducedMotion();
  const navRef = useNavigationContainerRef<NewsStackParamList>();

  // Re-tapping the active News tab pops the reader/upsell back to the feed.
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
    <NavigationContainer
      ref={navRef}
      // Report whether we're on a pushed sub-view (anything but the feed) so
      // the shell can hide the floating avatar on detail pages.
      onStateChange={(state) => {
        if (!state) return;
        const route = state.routes[state.index];
        onDetailChange?.(route?.name !== "Feed");
      }}
    >
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
            <NewsFeed
              themeName={themeName}
              onOpenArticle={(id) => navigation.navigate("Article", { id })}
              onOpenLocked={(id) => navigation.navigate("Locked", { id })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Article">
          {({ navigation, route }) => (
            <ArticleRoute
              id={route.params.id}
              themeName={themeName}
              onBack={() => navigation.goBack()}
              // Prev/next replaces the current article: back (button or swipe)
              // still returns to the feed and the reader remounts at the top,
              // matching the pre-stack behaviour.
              onNavigateId={(id) => navigation.replace("Article", { id })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Locked">
          {({ navigation }) => (
            <MemberOnlyPrompt
              themeName={themeName}
              onBack={() => navigation.goBack()}
              onApply={onApply}
              onSignIn={onSignIn}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ArticleRoute — resolves the route's article id into the reader and computes
// the prev/next neighbours in feed order (prev is null on the first article,
// next on the last → the in-article nav buttons disable there).
function ArticleRoute({
  id,
  themeName,
  onBack,
  onNavigateId,
}: {
  id: number;
  themeName: ThemeName;
  onBack: () => void;
  onNavigateId: (id: number) => void;
}) {
  const idx = ARTICLES.findIndex((a) => a.id === id);
  const article = idx >= 0 ? ARTICLES[idx] : null;

  // Defensive: an unknown id (shouldn't happen) just pops back to the feed.
  useEffect(() => {
    if (!article) onBack();
  }, [article, onBack]);
  if (!article) return null;

  const prev = idx > 0 ? ARTICLES[idx - 1] : null;
  const next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;

  return (
    <NewsArticleScreen
      article={article}
      themeName={themeName}
      onBack={onBack}
      prev={prev}
      next={next}
      onNavigate={(a) => onNavigateId(a.id)}
    />
  );
}

// NewsFeed — the feed itself (category rail + single-column cards +
// pagination). Owns the filter/pagination state; it stays mounted beneath a
// pushed article (native stack), so scroll position and the active category
// survive the round-trip.
function NewsFeed({
  themeName = "light",
  onOpenArticle,
  onOpenLocked,
}: {
  themeName?: ThemeName;
  onOpenArticle: (id: number) => void;
  onOpenLocked: (id: number) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { role } = useRole();
  const reducedMotion = useReducedMotion();
  const [category, setCategory] = useState<CategoryKey>("all");

  // Floating "back to top" — the feed scroll ref, plus a visibility flag the
  // scroll handler flips once the user is far enough down to want a shortcut.
  const scrollRef = useRef<ScrollView>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollToTop = (animated = true) => {
    scrollRef.current?.scrollTo({ y: 0, animated: animated && !reducedMotion });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = y > BACK_TO_TOP_AT;
    if (next !== showBackToTop) setShowBackToTop(next);
  };

  // Visual-only pagination. The arrows move the indicator and toggle their own
  // disabled state at the ends; they don't actually re-page the feed yet.
  const TOTAL_PAGES = 130;
  const [page, setPage] = useState(1);

  const canReadMemberContent = canAccess(role, "member-only");

  // The whole feed responds to the rail — no featured/hero exemption.
  const filtered = useMemo<Article[]>(
    () =>
      category === "all"
        ? ARTICLES
        : ARTICLES.filter((a) => a.category === category),
    [category],
  );

  // A guest tapping a member-only article gets the upsell; everyone else the
  // reader. The public/member boundary inside News.
  const open = (a: Article) => {
    if (a.memberOnly && !canReadMemberContent) onOpenLocked(a.id);
    else onOpenArticle(a.id);
  };

  return (
    // Page title now lives in the shared AppHeader (shell); content renders
    // directly beneath it.
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
      >
        {/* Category rail — horizontally scrollable filter pills under the
            large title. Selection swaps state instantly (no animation), so
            there is nothing to gate on reduced motion. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 6, marginBottom: 16 }}
          contentContainerStyle={{ paddingHorizontal: GUTTER, columnGap: 8 }}
        >
          {CATEGORY_PILLS.map((p) => (
            <CategoryPill
              key={p.key}
              label={p.label}
              selected={category === p.key}
              themeName={themeName}
              onPress={() => setCategory(p.key)}
            />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: GUTTER, paddingTop: 4 }}>
          {filtered.length > 0 ? (
            <View style={{ rowGap: ROW_GAP }}>
              {filtered.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  themeName={themeName}
                  locked={a.memberOnly && !canReadMemberContent}
                  onPress={() => open(a)}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>
                No articles in this category.
              </Text>
              <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
                Pick another category to see more.
              </Text>
            </View>
          )}
        </View>

        {/* Page indicator — visual only. Arrows disable at the first/last page. */}
        <Pagination
          themeName={themeName}
          page={page}
          totalPages={TOTAL_PAGES}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
          onJump={(p) => setPage(p)}
        />
      </ScrollView>

      {/* Back-to-top — floats in once scrolled down. Stacked above the Claude
          assistant FAB (which owns the corner) rather than overlapping it. */}
      {showBackToTop ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to top"
          onPress={() => scrollToTop()}
          style={({ pressed }) => ({
            position: "absolute",
            right: GUTTER,
            bottom: BACK_TO_TOP_LIFT,
            // Same diameter as the assistant FAB it stacks above.
            width: ASSISTANT_FAB_SIZE,
            height: ASSISTANT_FAB_SIZE,
            borderRadius: ASSISTANT_FAB_SIZE / 2,
            backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg,
            alignItems: "center",
            justifyContent: "center",
            // Lift it off the list.
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 5,
            elevation: 4,
          })}
        >
          <ArrowUp size={22} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// CategoryPill — one filter pill in the rail. Selected = brand teal[700] fill
// (matching the segmented control + primary actions) with a white label;
// unselected = card surface with a hairline border.
// The state is exposed to assistive tech via accessibilityState, and the
// weight bump keeps selection readable beyond the colour flip (P4).
// ---------------------------------------------------------------------------
function CategoryPill({
  label,
  selected,
  themeName,
  onPress,
}: {
  label: string;
  selected: boolean;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      // The 38pt pill alone misses the 44pt touch floor — hitSlop makes up the
      // vertical shortfall without inflating the visual.
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => ({
        height: 38,
        paddingHorizontal: 16,
        borderRadius: primitives.radii.full,
        backgroundColor: selected
          ? primitives.colors.brand.teal[700]
          : pressed ? t.border.subtle : c.cardBg,
        // Border on both states so the pill doesn't change size on selection.
        borderWidth: 1,
        borderColor: selected ? primitives.colors.brand.teal[700] : (c.cardBorder ?? t.border.subtle),
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          color: selected ? "#FFFFFF" : t.text.body,
          fontSize: 14,
          fontFamily: ralewayFamily(selected ? "600" : "500"),
          fontWeight: selected ? "600" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// CategoryTag — pill carrying the article category. Colour + label (never
// colour alone, P4). `muted` renders the locked/member-only treatment.
// ---------------------------------------------------------------------------
function CategoryTag({
  label,
  themeName,
  muted = false,
}: {
  label: string;
  themeName: ThemeName;
  muted?: boolean;
}) {
  const t = themes[themeName];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: muted ? t.surface.subtle : t.brand.accent,
        borderRadius: primitives.radii.full,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          color: muted ? t.text.muted : "#FFFFFF",
          fontSize: 10.5,
          fontFamily: ralewayFamily("600"),
          fontWeight: "600",
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ArticleCard — one full-width card in the single-column feed: 16:9 image,
// category tag, Raleway headline, date. The excerpt stays out of the card (it
// reads in the article) but is kept in the accessibility label for context.
// ---------------------------------------------------------------------------
function ArticleCard({
  article,
  themeName,
  locked,
  onPress,
}: {
  article: Article;
  themeName: ThemeName;
  locked: boolean;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.title}.${locked ? " Members only." : ""} ${article.excerpt}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? t.border.subtle : c.cardBg,
        borderRadius: primitives.radii.lg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        overflow: "hidden",
        transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
      })}
    >
      <RemoteImage
        seed={`ffie-news-${article.id}`}
        uri={article.imageUrl}
        width="100%"
        aspectRatio={16 / 9}
        pixelWidth={1200}
        pixelHeight={675}
        themeName={themeName}
        accessibilityLabel={`Illustration for ${article.title}`}
      />

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 9 }}>
          <CategoryTag label={article.category} themeName={themeName} muted={locked} />
          <View style={{ flex: 1 }} />
          {locked ? <LockTag themeName={themeName} /> : null}
        </View>

        <Text
          style={{
            color: t.text.body,
            fontSize: 17,
            lineHeight: 22,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
          numberOfLines={3}
        >
          {article.title}
        </Text>

        <Text style={{ color: t.text.muted, fontSize: 12, marginTop: 9, opacity: 0.85 }}>
          {article.date}
        </Text>
      </View>
    </Pressable>
  );
}
