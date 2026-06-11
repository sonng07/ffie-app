// SSO federation connection — the identity-provider chooser.
//
// Federation SSO ("Single Sign-On") lets a member sign in with the account
// they already hold at their regional/departmental federation (the FFB
// identity network) instead of an FFIE-specific email + password. Before a
// real handoff, the member has to say WHICH federation issues their identity —
// pick your federation, then Continue.
//
// LAYOUT: deliberately mirrors the Join directory (BecomeMemberScreen) so the
// two federation surfaces feel identical — light/white surface, large title,
// map of pins, search with a clear-all (✕) button, a collapsible list ("Show
// N more" / "Show less"), and a floating "back to top" once scrolled deep.
// The one difference is BEHAVIOUR: rows here SELECT a single federation (radio)
// and a pinned "Continue" signs you in, rather than expanding to contacts.
//
// In production, Continue would open the chosen federation's secure sign-in
// (OAuth2 / OIDC redirect via expo-auth-session) and return a token. In v1
// this is mocked: select any federation + Continue authenticates locally (see
// TESTFLIGHT.md / CLAUDE.md — no backend, don't wire to a real IdP without
// instruction). Data-driven from src/data/federations.ts.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { ArrowUp, Check, ChevronDown, ChevronUp, Search, X } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { themes, primitives, semantics } from "@tokens";
import {
  FederationMap,
  type FederationMapHandle,
  type FederationPin,
} from "@/components/ui/FederationMap";
import {
  FEDERATIONS,
  FEDERATIONS_WITH_COORDS,
  type Federation,
} from "@/data/federations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SearchClearButton } from "@/components/ui/ios";
import { ralewayFamily, displayFamily } from "@/theme/fonts";

// Light surface — reads like the rest of the app (white bg, dark text), even
// though it's launched from the dark login. The app is light-only for now.
const t = themes.light;
const GUTTER = semantics.spacing.gutter.mobile; // 16 — same as the Join directory
const RADIUS = primitives.radii.lg; // 12 — fields, rows, buttons, map card
const TEAL = t.brand.accent; // #027489 — selection highlight (radio / borders); now the same brand teal as the CTA below
const TEAL_TINT = primitives.colors.brand.teal[50]; // #E6F8FB — selected-row fill
// Continue CTA uses teal[700] — the FFIE brand teal, matching the app's default
// primary action (≈5.4:1 white-on-teal, clears WCAG AA).
const CTA_BG = primitives.colors.brand.teal[700]; // #027489
const CTA_PRESSED = primitives.colors.brand.teal[800]; // #045764

// Initial map view centred on metropolitan France (same frame as the Join
// directory; overseas federations sit outside it — pan/zoom to reach them).
const FRANCE_REGION = {
  latitude: 46.6,
  longitude: 2.5,
  latitudeDelta: 9.5,
  longitudeDelta: 9.5,
};
const MAP_HEIGHT = 180;

// One pin per federation that has a coordinate. Built once — the source is
// static. (Federations without a coordinate have no pin but stay selectable
// from the list.)
const FEDERATION_PINS: FederationPin[] = FEDERATIONS_WITH_COORDS.map((f) => ({
  id: f.id,
  lat: f.lat as number,
  lng: f.lng as number,
  title: f.area,
  description: f.name,
}));

// Show a short list by default; "Show more" reveals the rest. A live search
// bypasses the cap so every match is visible.
const INITIAL_COUNT = 10;

// Android's scrollbar pins to the ScrollView's right edge and ignores
// scrollIndicatorInsets, so inset the inner list a hair to lift the bar off the
// screen edge like iOS. iOS keeps full width + indicator insets.
const ANDROID_BAR_INSET = Platform.OS === "android" ? 8 : 0;

export function SSOFederationScreen({
  onBack,
  onConnect,
}: {
  onBack: () => void;
  // A federation was chosen and confirmed — promote the session (v1 mock).
  onConnect: (federation: Federation) => void;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  // The list scrolls inside this fixed-height window so the outer page can
  // scroll around it (nested scroll). ~42% of the screen — enough rows to scan,
  // leaving the map + search visible above.
  const listWindowHeight = Math.max(260, Math.round(windowHeight * 0.42));

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [footerH, setFooterH] = useState(0);

  const mapRef = useRef<FederationMapHandle>(null);
  const pageRef = useRef<ScrollView>(null); // outer page scroll
  const listRef = useRef<ScrollView>(null); // inner list window
  const backToTopAnim = useRef(new Animated.Value(0)).current;

  // Filter by department code, area, or official name — the three things a
  // member might type to find their federation.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEDERATIONS;
    return FEDERATIONS.filter(
      (f) =>
        f.code.toLowerCase().includes(q) ||
        f.area.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q),
    );
  }, [query]);

  const isSearching = query.trim().length > 0;
  const collapsedList = !showAll && !isSearching;
  const visible = collapsedList ? results.slice(0, INITIAL_COUNT) : results;
  const hiddenCount = results.length - visible.length;

  const selected = useMemo(
    () => FEDERATIONS.find((f) => f.id === selectedId) ?? null,
    [selectedId],
  );
  const canConnect = selected !== null;

  // Back-to-top fades in once scrolled deep (opacity only — no slide), gated
  // to an instant toggle under reduced motion. Hysteresis avoids flicker.
  useEffect(() => {
    Animated.timing(backToTopAnim, {
      toValue: showBackToTop ? 1 : 0,
      duration: reducedMotion ? 0 : primitives.motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showBackToTop, reducedMotion, backToTopAnim]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 400 && !showBackToTop) setShowBackToTop(true);
    else if (y < 200 && showBackToTop) setShowBackToTop(false);
  };

  const scrollToTop = () => {
    listRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
    pageRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  };

  // One selection path for both inputs: tapping a list row or a map pin selects
  // that federation and recentres the map on it (reduced-motion → instant).
  const selectFederation = (id: number) => {
    setSelectedId(id);
    const f = FEDERATIONS.find((x) => x.id === id);
    if (f && typeof f.lat === "number" && typeof f.lng === "number") {
      mapRef.current?.animateToRegion(
        { latitude: f.lat, longitude: f.lng, latitudeDelta: 1.5, longitudeDelta: 1.5 },
        reducedMotion ? 0 : 500,
      );
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <StatusBar style="dark" />

      {/* Close — top-right, clear of the left-aligned large title (matches the
          Join directory's modal close). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onBack}
        hitSlop={10}
        // Absolute children aren't offset by the SafeAreaView's top padding, so
        // add the inset ourselves — otherwise the button sits under the status
        // bar (clock / battery). +12 then aligns it with the title below.
        style={({ pressed }) => [
          styles.close,
          { top: insets.top + 12 },
          pressed && styles.closePressed,
        ]}
      >
        <X size={18} color={t.text.muted} />
      </Pressable>

      {/* Outer page scroll — drag anywhere OUTSIDE the list box (title, map,
          search) to scroll the whole page; drag INSIDE the list box to scroll
          just the list (the nested window below). */}
      <ScrollView
        ref={pageRef}
        style={styles.page}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + subtitle */}
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.title}>
            Sign in with your federation
          </Text>
          <Text style={styles.subtitle}>
            Choose your federation below. You'll be securely redirected to
            confirm your identity.
          </Text>
        </View>

        {/* Map — tap a pin to select that federation (same component the Join
            directory uses). Native module: Apple Maps on iOS, Google on Android. */}
        <View style={styles.mapCard}>
          <FederationMap
            ref={mapRef}
            style={styles.map}
            initialRegion={FRANCE_REGION}
            pins={FEDERATION_PINS}
            accessibilityLabel="Map of departmental federations"
            onPinPress={selectFederation}
          />
        </View>

        {/* Search with clear-all */}
        <View style={styles.searchWrap}>
          <Search size={17} color={t.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a department or federation"
            placeholderTextColor={t.text.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search federations"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <SearchClearButton themeName="light" onPress={() => setQuery("")} />
          ) : null}
        </View>

        {/* Federation list */}
        {results.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No federation found.</Text>
            <Text style={styles.emptyHint}>
              Try a department number ("69"), a name ("Rhône") or "Building".
            </Text>
          </View>
        ) : (
          <>
            {/* The list scrolls inside its own fixed-height window (nested
                scroll) so the map stays in view; the outer page scrolls when you
                drag outside this box. */}
            <View style={{ paddingRight: ANDROID_BAR_INSET }}>
              <ScrollView
                ref={listRef}
                nestedScrollEnabled
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                style={{ height: listWindowHeight }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator
                indicatorStyle="default"
                scrollIndicatorInsets={{ right: 3, top: 4, bottom: 4 }}
              >
                {visible.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${item.area} — department ${item.code}`}
                      onPress={() => selectFederation(item.id)}
                      style={({ pressed }) => [
                        styles.row,
                        isSelected && styles.rowSelected,
                        pressed && !isSelected && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.code}</Text>
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowArea} numberOfLines={1}>
                          {item.area}
                        </Text>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioOn]}>
                        {isSelected ? <Check size={14} color="#FFFFFF" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Show more / less + count caption sit in the page, below the
                window — re-tapping is page-level, not list-scroll-level. */}
            {collapsedList && hiddenCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Show all ${results.length} federations`}
                onPress={() => setShowAll(true)}
                style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
              >
                <Text style={styles.toggleLabel}>Show {hiddenCount} more</Text>
                <ChevronDown size={18} color={TEAL} />
              </Pressable>
            ) : null}

            {showAll && !isSearching ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show fewer federations"
                onPress={() => {
                  setShowAll(false);
                  scrollToTop();
                }}
                style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
              >
                <Text style={styles.toggleLabel}>Show less</Text>
                <ChevronUp size={18} color={TEAL} />
              </Pressable>
            ) : null}

            {collapsedList ? (
              <Text style={styles.countCaption}>
                {`Showing ${visible.length} of ${FEDERATIONS.length} departmental federations.`}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Pinned footer — Continue signs in with the selected federation. */}
      <View
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
        style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConnect }}
          accessibilityLabel={selected ? `Continue with ${selected.area}` : "Continue"}
          disabled={!canConnect}
          onPress={() => selected && onConnect(selected)}
          style={({ pressed }) => [
            styles.cta,
            canConnect ? styles.ctaActive : styles.ctaDisabled,
            canConnect && pressed && styles.ctaPressed,
          ]}
        >
          <Text style={[styles.ctaLabel, !canConnect && styles.ctaLabelDisabled]}>
            {selected ? `Continue with ${selected.area}` : "Select a federation"}
          </Text>
        </Pressable>
      </View>

      {/* Back to top — fades in over the list once scrolled deep, lifted above
          the footer. */}
      <Animated.View
        pointerEvents={showBackToTop ? "box-none" : "none"}
        style={[styles.backToTop, { bottom: 24 + footerH, opacity: backToTopAnim }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to top"
          onPress={scrollToTop}
          style={({ pressed }) => [
            styles.backToTopBtn,
            { backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg },
          ]}
        >
          <ArrowUp size={22} color={t.action.primary.fg} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.surface.default },

  close: {
    position: "absolute",
    right: GUTTER,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.surface.subtle,
  },
  closePressed: { backgroundColor: t.border.subtle },

  head: {
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 6,
    paddingRight: 52, // clear of the close button
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: t.text.body,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: t.text.muted,
    fontFamily: ralewayFamily("400"),
  },

  mapCard: {
    marginHorizontal: GUTTER,
    marginTop: 12,
    borderRadius: RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: t.border.default,
  },
  map: { width: "100%", height: MAP_HEIGHT },

  searchWrap: {
    marginHorizontal: GUTTER,
    marginTop: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 7,
    backgroundColor: t.border.subtle,
  },
  searchInput: {
    flex: 1,
    color: t.text.body,
    fontSize: 16,
    fontFamily: ralewayFamily("400"),
  },

  emptyWrap: { padding: 48, alignItems: "center" },
  empty: { color: t.text.muted, fontSize: 15, marginBottom: 6 },
  emptyHint: { color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" },

  page: { flex: 1 },
  pageContent: { paddingBottom: 24 },
  listContent: {
    paddingHorizontal: GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: t.border.default,
    backgroundColor: t.surface.default,
    marginBottom: 8,
  },
  rowSelected: { backgroundColor: TEAL_TINT, borderColor: TEAL },
  rowPressed: { backgroundColor: t.surface.subtle },
  badge: {
    minWidth: 40,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: t.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: t.text.body,
    fontSize: 13,
    fontFamily: ralewayFamily("700"),
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  rowText: { flex: 1 },
  rowArea: {
    color: t.text.body,
    fontSize: 15,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
  },
  rowName: {
    marginTop: 2,
    color: t.text.muted,
    fontSize: 12,
    fontFamily: ralewayFamily("400"),
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: t.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: TEAL, borderColor: TEAL },

  toggle: {
    marginTop: 12,
    marginHorizontal: GUTTER,
    minHeight: 44,
    borderRadius: primitives.radii.md,
    backgroundColor: t.surface.subtle,
    borderWidth: 1,
    borderColor: t.border.subtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
  },
  togglePressed: { backgroundColor: t.border.subtle },
  toggleLabel: {
    fontSize: 15,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
    color: t.text.body,
  },
  countCaption: {
    color: t.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    marginHorizontal: GUTTER + 4,
  },

  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border.default,
    backgroundColor: t.surface.default,
  },
  cta: {
    height: 56,
    borderRadius: RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaActive: { backgroundColor: CTA_BG },
  ctaPressed: { backgroundColor: CTA_PRESSED },
  ctaDisabled: { backgroundColor: t.border.subtle },
  ctaLabel: {
    color: t.action.primary.fg,
    fontSize: 16,
    fontFamily: ralewayFamily("700"),
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  ctaLabelDisabled: { color: t.text.placeholder },

  backToTop: { position: "absolute", right: GUTTER },
  backToTopBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
});
