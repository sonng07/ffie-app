// News tab — article feed → reader, shared by all personas (Epic 2).
//
// Layout mirrors the FFIE web news page: ONE highlighted (hero) article at the
// top, full-width, then the remaining articles in a 2-column grid. The hero is
// the latest article; the grid is the rest in publication order.
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
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, LargeTitleHeader, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Pagination } from "@/components/ui/Pagination";
import { LockTag } from "@/components/ui/LockTag";
import { FilterButton, FilterSheet, type FilterOption } from "@/components/ui/FilterControls";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ARTICLES, type Article, type NewsCategory } from "@/data/news";
import { NavigationContainer, useNavigationContainerRef, StackActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { canAccess, useRole } from "@/auth/roleContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NewsArticleScreen } from "./NewsArticleScreen";
import { MemberOnlyPrompt } from "./MemberOnlyPrompt";
import { EventsView } from "./EventsView";
import { EventDetailScreen } from "./EventDetailScreen";

// Categories users can filter the feed by. Multi-select: an empty set shows
// everything, otherwise only the chosen types appear. Keep in sync with the
// NewsCategory union in data/news.ts.
const CATEGORY_OPTIONS: FilterOption<NewsCategory>[] = [
  { key: "Technical", label: "Technique" },
  { key: "Training", label: "Formation" },
  { key: "Communication", label: "Communication" },
  { key: "Economical", label: "Économie" },
];

// Horizontal gap between the two grid columns. Vertical rhythm between rows is
// set separately (rowGap) so columns can sit tighter than rows read.
const COL_GAP = 14;
const ROW_GAP = 18;

// The two top-level views inside the News tab. "news" is the article feed;
// "events" is a placeholder for the upcoming Events feature (blank for now).
// A segmented control at the top of the feed toggles between them.
type NewsTab = "news" | "events";

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
  Event: { id: number };
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
  /** Fired with `true` when a sub-view (article reader, event, member-only
   *  prompt) is pushed, `false` back on the feed. The shell uses it to hide the
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
              onOpenEvent={(id) => navigation.navigate("Event", { id })}
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

        <Stack.Screen name="Event">
          {({ navigation, route }) => (
            <EventDetailScreen
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

// NewsFeed — the feed itself (hero + 2-up grid + filter + pagination). Owns the
// filter/pagination state; it stays mounted beneath a pushed article (native
// stack), so scroll position and active filters survive the round-trip.
function NewsFeed({
  themeName = "light",
  onOpenArticle,
  onOpenLocked,
  onOpenEvent,
}: {
  themeName?: ThemeName;
  onOpenArticle: (id: number) => void;
  onOpenLocked: (id: number) => void;
  onOpenEvent: (id: number) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { role } = useRole();
  const { width: screenW } = useWindowDimensions();
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Set<NewsCategory>>(new Set());

  // Toggle between the article feed ("news") and the Events view (weekly
  // calendar + event list). Both render within this same feed scroll.
  const [tab, setTab] = useState<NewsTab>("news");

  // Visual-only pagination. The arrows move the indicator and toggle their own
  // disabled state at the ends; they don't actually re-page the feed yet.
  const TOTAL_PAGES = 130;
  const [page, setPage] = useState(1);

  const canReadMemberContent = canAccess(role, "member-only");

  // The featured (hero) article is always ARTICLES[0] and is shown regardless
  // of the filter. Only the articles BELOW it respond to the category filter.
  const hero = ARTICLES[0];
  const filteredRest = useMemo<Article[]>(() => {
    const rest = ARTICLES.slice(1);
    if (categoryFilter.size === 0) return rest;
    return rest.filter((a) => categoryFilter.has(a.category));
  }, [categoryFilter]);

  const activeFilterCount = categoryFilter.size;

  // A guest tapping a member-only article gets the upsell; everyone else the
  // reader. The public/member boundary inside News.
  const open = (a: Article) => {
    if (a.memberOnly && !canReadMemberContent) onOpenLocked(a.id);
    else onOpenArticle(a.id);
  };

  // Two equal columns inset by the page gutter, with COL_GAP between them.
  const colWidth = (screenW - GUTTER * 2 - COL_GAP) / 2;
  // When a filter is active the articles below the hero collapse to a single
  // full-width column — a focused "results" list. The hero never changes.
  const isFiltered = activeFilterCount > 0;
  const fullWidth = screenW - GUTTER * 2;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <LargeTitleHeader
          title={tab === "news" ? "Actualités" : "Événements"}
          themeName={themeName}
        />

        {/* News / Events toggle. Sits under the large title like an iOS
            segmented control; switching to Events reveals a blank placeholder
            (the feature is not built yet). */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 4 }}>
          <SegmentedControl
            themeName={themeName}
            value={tab}
            options={[
              { key: "news", label: "Actualités" },
              { key: "events", label: "Événements" },
            ]}
            onChange={setTab}
          />
        </View>

        {tab === "events" ? (
          <EventsView themeName={themeName} onOpenEvent={onOpenEvent} onOpenLocked={onOpenLocked} />
        ) : (
        <>
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 4 }}>
          {/* Featured article — always shown, unaffected by the filter. */}
          {hero ? (
            <HeroCard
              article={hero}
              themeName={themeName}
              locked={hero.memberOnly && !canReadMemberContent}
              onPress={() => open(hero)}
            />
          ) : null}

          {/* Divider section between the hero and the rest. The filter control
              lives here now (label + button, right-aligned), with a rule
              filling the space on the left. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              columnGap: 10,
              marginTop: 22,
              marginBottom: 4,
            }}
          >
            <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />
            <Text
              style={{
                color: t.text.muted,
                fontSize: 12,
                fontFamily: ralewayFamily("600"),
                fontWeight: "600",
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Filtrer par
            </Text>
            <FilterButton
              themeName={themeName}
              activeCount={activeFilterCount}
              onPress={() => setFilterOpen(true)}
              accessibilityLabel={
                activeFilterCount > 0
                  ? `Filtrer les actualités, ${activeFilterCount} actif(s)`
                  : "Filtrer les actualités"
              }
            />
          </View>

          {/* Articles below the hero: 2-up grid by default, single column when
              filtered. Only this region responds to the category filter. */}
          {isFiltered ? (
            filteredRest.length > 0 ? (
              <View style={{ rowGap: ROW_GAP, marginTop: 8 }}>
                {filteredRest.map((a) => (
                  <GridCard
                    key={a.id}
                    article={a}
                    width={fullWidth}
                    themeName={themeName}
                    locked={a.memberOnly && !canReadMemberContent}
                    onPress={() => open(a)}
                  />
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>
                  Aucun autre article dans cette catégorie.
                </Text>
                <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
                  Ajustez le filtre pour en voir plus.
                </Text>
              </View>
            )
          ) : filteredRest.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: COL_GAP,
                rowGap: ROW_GAP,
                marginTop: 8,
              }}
            >
              {filteredRest.map((a) => (
                <GridCard
                  key={a.id}
                  article={a}
                  width={colWidth}
                  themeName={themeName}
                  locked={a.memberOnly && !canReadMemberContent}
                  onPress={() => open(a)}
                />
              ))}
            </View>
          ) : null}
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
        </>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        themeName={themeName}
        sectionLabel="Catégorie"
        options={CATEGORY_OPTIONS}
        selected={categoryFilter}
        resultCount={filteredRest.length}
        onToggle={(key) => {
          setCategoryFilter((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        }}
        onReset={() => setCategoryFilter(new Set())}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
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
  small = false,
}: {
  label: string;
  themeName: ThemeName;
  muted?: boolean;
  small?: boolean;
}) {
  const t = themes[themeName];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: muted ? t.surface.subtle : t.brand.accent,
        borderRadius: primitives.radii.full,
        paddingHorizontal: small ? 8 : 9,
        paddingVertical: small ? 2.5 : 3,
      }}
    >
      <Text
        style={{
          color: muted ? t.text.muted : "#FFFFFF",
          fontSize: small ? 9.5 : 10.5,
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
// HeroCard — the single highlighted article. Full-width, 16:9 image, display
// headline. The "feature" moment at the top of the feed.
// ---------------------------------------------------------------------------
function HeroCard({
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
      accessibilityLabel={`À la une : ${article.title}.${locked ? " Réservé aux adhérents." : ""} ${article.excerpt}`}
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
        accessibilityLabel={`Illustration de ${article.title}`}
      />

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <CategoryTag label={article.category} themeName={themeName} muted={locked} />
          <View style={{ flex: 1 }} />
          {locked ? <LockTag themeName={themeName} /> : null}
        </View>

        <Text
          style={{
            color: t.text.body,
            fontSize: 23,
            lineHeight: 29,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.4,
          }}
          numberOfLines={3}
        >
          {article.title}
        </Text>

        <Text
          style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 21, marginTop: 8 }}
          numberOfLines={2}
        >
          {article.excerpt}
        </Text>

        <Text style={{ color: t.text.muted, fontSize: 12, marginTop: 12, opacity: 0.85 }}>
          {article.date}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// GridCard — compact card for the 2-column grid. Fixed width (passed in so the
// two columns stay equal), 4:3 image, Raleway headline clamped to 3 lines so
// neighbouring cards keep even heights.
// ---------------------------------------------------------------------------
function GridCard({
  article,
  width,
  themeName,
  locked,
  onPress,
}: {
  article: Article;
  width: number;
  themeName: ThemeName;
  locked: boolean;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.title}.${locked ? " Réservé aux adhérents." : ""} ${article.excerpt}`}
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
      <RemoteImage
        seed={`ffie-news-${article.id}`}
        uri={article.imageUrl}
        width="100%"
        aspectRatio={4 / 3}
        pixelWidth={600}
        pixelHeight={450}
        themeName={themeName}
        accessibilityLabel={`Illustration de ${article.title}`}
      />

      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <CategoryTag label={article.category} themeName={themeName} muted={locked} small />
          <View style={{ flex: 1 }} />
          {locked ? <LockTag themeName={themeName} small /> : null}
        </View>

        <Text
          style={{
            color: t.text.body,
            fontSize: 14.5,
            lineHeight: 19,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.1,
          }}
          numberOfLines={3}
        >
          {article.title}
        </Text>

        <Text style={{ color: t.text.muted, fontSize: 11, marginTop: 8, opacity: 0.85 }}>
          {article.date}
        </Text>
      </View>
    </Pressable>
  );
}
