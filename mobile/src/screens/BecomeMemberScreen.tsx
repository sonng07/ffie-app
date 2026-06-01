// Become-a-member tab — the "Join FFIE" page.
//
// FFIE's membership model is federated: you join through your *departmental*
// federation, not a single national form. So the page is a directory — a
// subtitle pointing people to their department, then the full list of
// departmental federations as a searchable, grouped-inset list (same
// data-driven pattern as the Library). Each row expands to reveal that
// federation's local contacts (Chairman, Secretary General, phone, address).
//
// Structure:
//   - Large title + subtitle ("go to your departmental federation below")
//   - Departmental federation directory (search + expandable rows, show more)
//   - Eligibility note
//
// Federation contact details come from data/federations.ts. Entries not yet
// filled expand to a clean "details coming" state — nothing fabricated.

import React, { useMemo, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Globe,
  Mail,
  MapPin,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { primitives, semantics, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { SearchClearButton, useGroupedColors } from "@/components/ui/ios";
import {
  FEDERATIONS,
  FEDERATIONS_WITH_COORDS,
  hasContactDetails,
  type Federation,
} from "@/data/federations";

const GUTTER = semantics.spacing.gutter.mobile;

// Initial map view centred on metropolitan France. The overseas federations
// (Réunion, Guadeloupe, Nouvelle-Calédonie) sit far outside this frame — their
// pins exist; zoom/pan out to reach them.
const FRANCE_REGION = {
  latitude: 46.6,
  longitude: 2.5,
  latitudeDelta: 9.5,
  longitudeDelta: 9.5,
};
const MAP_HEIGHT = 220;

// Top padding for the page content above the safe-area inset. On Android we
// match the Debug chip's offset (its TOP_GAP = 24) so the title lines up with
// it; iOS keeps the tighter 12.
const PAGE_TOP_PADDING = Platform.OS === "android" ? 24 : 12;

// Reduced-motion: read once and subscribe. Gates the chevron spin + the
// expand/collapse height animation so vestibular-sensitive users get an
// instant snap instead of motion (harm prevention, non-negotiable).
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => setReduced(v)
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// ContactLine — one labelled detail inside an expanded federation. Tappable
// when it resolves to an action (tel:, mailto:, https:).
// ---------------------------------------------------------------------------
function ContactLine({
  icon: Icon,
  value,
  href,
  themeName,
}: {
  icon: LucideIcon;
  value: string;
  href?: string;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  const open = href ? () => Linking.openURL(href).catch(() => {}) : undefined;
  const Wrapper: typeof Pressable | typeof View = open ? Pressable : View;
  return (
    <Wrapper
      onPress={open}
      accessibilityRole={open ? "link" : undefined}
      style={{ flexDirection: "row", alignItems: "flex-start", columnGap: 10 }}
    >
      <Icon size={16} color={t.brand.accent} style={{ marginTop: 2 }} />
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          lineHeight: 20,
          color: t.text.muted,
        }}
      >
        {value}
      </Text>
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// FederationRow — accordion row. Area + federation name, with a chevron that
// rotates down when open. Tapping reveals the contact panel.
// ---------------------------------------------------------------------------
function FederationRow({
  federation,
  themeName,
  reducedMotion,
  open,
  onToggle,
  onMeasure,
  registerRef,
}: {
  federation: Federation;
  themeName: ThemeName;
  reducedMotion: boolean;
  /** Controlled by the parent so only one row is open at a time (accordion). */
  open: boolean;
  onToggle: () => void;
  /** Reports the row's y offset (within the list card) so a map-pin tap can
   *  scroll the list to it. */
  onMeasure?: (y: number) => void;
  /** Hands the parent a live handle to the card's outer view, so a map-pin tap
   *  can measure its *current* position (the cached offset goes stale while the
   *  previously-open card is collapsing). */
  registerRef?: (node: View | null) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  // One progress value (0 = closed, 1 = open) drives the panel height, its
  // fade, and the chevron together. Non-native so we can animate `height`;
  // a single row's worth of JS-driven animation is cheap.
  const progress = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  // Natural height of the panel content, measured off-flow so we can animate
  // the container between 0 and it.
  const [contentHeight, setContentHeight] = useState(0);

  // Drive from the controlled `open` prop — a row may be closed by the parent
  // (when another row opens), not only by its own tap.
  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reducedMotion ? 0 : primitives.motion.duration.slow,
      easing: Easing.bezier(0.4, 0, 0.2, 1), // standard ease — smooth in/out
      useNativeDriver: false,
    }).start();
  }, [open, reducedMotion, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const panelHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });
  // Fade the content over the first ~60% of the travel so it's fully visible
  // before the slide finishes (and gone early on close) — no lingering ghost.
  const panelOpacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 1],
  });
  // The open card lifts: shadow (iOS) + elevation (Android) grow with progress.
  const cardShadowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });
  const cardElevation = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  const hasDetails = hasContactDetails(federation);

  return (
    <Animated.View
      ref={registerRef as never}
      onLayout={onMeasure ? (e) => onMeasure(e.nativeEvent.layout.y) : undefined}
      style={{
        marginHorizontal: GUTTER,
        marginBottom: 10,
        borderRadius: primitives.radii.lg,
        backgroundColor: c.cardBg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: cardShadowOpacity,
        elevation: cardElevation,
      }}
    >
      {/* Inner clip — rounds + clips the header press tint and the expanding
          panel, while the shadow lives on the (unclipped) card above. */}
      <View
        style={{
          borderRadius: primitives.radii.lg,
          overflow: "hidden",
          borderWidth: c.cardBorder ? 1 : 0,
          borderColor: c.cardBorder,
        }}
      >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${federation.area}. ${federation.name}`}
        accessibilityHint={open ? "Réduire les coordonnées de la fédération" : "Afficher les coordonnées de la fédération"}
        onPress={onToggle}
        style={({ pressed }) => ({
          backgroundColor: pressed ? t.border.subtle : "transparent",
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            columnGap: 12,
            paddingHorizontal: GUTTER,
            minHeight: 48, // P1 touch-target floor
            paddingVertical: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: ralewayFamily("500"),
                fontWeight: "500",
                color: t.text.body,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {federation.area}
            </Text>
            <Text
              style={{ fontSize: 12.5, color: t.text.muted, marginTop: 4, lineHeight: 17 }}
              numberOfLines={1}
            >
              {federation.name}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDown size={20} color={t.text.muted} style={{ opacity: 0.6 }} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expanded contact panel — height-animated reveal. The content is kept
          mounted and measured off-flow (absolute) so the container can slide
          smoothly between 0 and its natural height. */}
      <Animated.View
        style={{ height: panelHeight, opacity: panelOpacity, overflow: "hidden" }}
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      >
        <View
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            paddingLeft: GUTTER,
            paddingRight: GUTTER,
            paddingBottom: 16,
            paddingTop: 2,
            rowGap: 10,
          }}
        >
          {hasDetails ? (
            <View style={{ rowGap: 10 }}>
              {/* Named contacts — role + name, then their email/phone */}
              {federation.members?.map((m, i) => (
                <View key={`${m.role}-${i}`} style={{ rowGap: 6 }}>
                  <Text style={{ fontSize: 13.5, color: t.text.muted, lineHeight: 19 }}>
                    {`${m.role} : `}
                    <Text style={{ fontFamily: ralewayFamily("700"), fontWeight: "700", color: t.text.muted }}>
                      {m.name}
                    </Text>
                  </Text>
                  {m.email ? (
                    <ContactLine
                      icon={Mail}
                      value={m.email}
                      href={`mailto:${m.email}`}
                      themeName={themeName}
                    />
                  ) : null}
                  {m.phone ? (
                    <ContactLine
                      icon={Phone}
                      value={m.phone}
                      href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}
                      themeName={themeName}
                    />
                  ) : null}
                  {m.fax ? (
                    <ContactLine icon={Printer} value={`Fax ${m.fax}`} themeName={themeName} />
                  ) : null}
                </View>
              ))}
              {federation.address ? (
                <ContactLine icon={MapPin} value={federation.address} themeName={themeName} />
              ) : null}
              {federation.website ? (
                <ContactLine
                  icon={Globe}
                  value={federation.website.replace(/^https?:\/\//, "")}
                  href={federation.website}
                  themeName={themeName}
                />
              ) : null}
            </View>
          ) : (
            // No fabricated coordinates — clean placeholder until FFIE provides
            // this federation's contact block.
            <Text style={{ fontSize: 13, color: t.text.muted, lineHeight: 19 }}>
              Les coordonnées de cette fédération départementale apparaîtront ici.
              La FFIE finalise l'annuaire.
            </Text>
          )}
        </View>
      </Animated.View>
      </View>
    </Animated.View>
  );
}

export function BecomeMemberScreen({
  themeName = "light",
}: {
  themeName?: ThemeName;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState("");
  // Accordion: at most one federation expanded at a time. Opening a new row
  // collapses the previously open one.
  const [openId, setOpenId] = useState<number | null>(null);
  // Show a short list by default; "Show more" reveals the rest. A live search
  // bypasses the cap so every match is visible.
  const [showAll, setShowAll] = useState(false);

  // The federation list scrolls inside this fixed-height window so the page can
  // still scroll as a whole around it (nested scroll). ~half the screen.
  const listWindowHeight = Math.max(300, Math.round(windowHeight * 0.5));

  // Two scrolls: the whole page (pageRef) and the inner list window (scrollRef).
  // "Back to top" surfaces once the user has scrolled deep in the list.
  const pageRef = React.useRef<ScrollView>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const backToTopAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(backToTopAnim, {
      toValue: showBackToTop ? 1 : 0,
      duration: reducedMotion ? 0 : primitives.motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showBackToTop, reducedMotion, backToTopAnim]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    // Hysteresis so the button doesn't flicker around the threshold.
    if (y > 700 && !showBackToTop) setShowBackToTop(true);
    else if (y < 500 && showBackToTop) setShowBackToTop(false);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
    pageRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  };

  const toggleFederation = (id: number) => {
    // Each row animates its own height; opening one and closing the previously
    // open one run in parallel off their `open` prop.
    setOpenId((prev) => (prev === id ? null : id));
  };

  // Map-pin → list bridge. Each row reports its y offset within the list card;
  // the list card reports its own offset within the scroll content. Tapping a
  // pin clears any search, expands the full list, opens that row, and scrolls
  // to it (after a beat so the newly-mounted/expanded row has laid out).
  const listTop = React.useRef(0);
  const rowOffsets = React.useRef<Record<number, number>>({});
  // Live handles to the scroll content and to each card, so a pin tap can read
  // the card's *current* position rather than a cached offset (which is stale
  // while the previously-open card is still collapsing above it).
  const listContentRef = React.useRef<View>(null);
  const rowRefs = React.useRef<Record<number, View | null>>({});

  const focusFederation = (id: number) => {
    setQuery("");
    setShowAll(true);
    setOpenId(id);

    // The reliable fix: don't scroll on a fixed timer (the target card is still
    // moving while the previously-open card collapses above it — scroll then
    // and you land on a mid-animation position, seeing only the card's bottom).
    // Instead poll the card's *live* position via measureLayout until it stops
    // changing, then scroll once to align its top with the window's top edge.
    const scrollToCached = () => {
      const y = listTop.current + (rowOffsets.current[id] ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: !reducedMotion });
    };

    let lastY = Number.NaN;
    let stable = 0;
    let tries = 0;
    const MAX_TRIES = 24; // ~0.75s ceiling at ~32ms/poll

    const attempt = () => {
      tries += 1;
      const node = rowRefs.current[id];
      const listNode = listContentRef.current;
      if (!node || !listNode || typeof (node as any).measureLayout !== "function") {
        scrollToCached();
        return;
      }
      // New architecture (Fabric): measureLayout takes the *ref* of the
      // ancestor to measure against, not a findNodeHandle() number.
      (node as any).measureLayout(
        listNode,
        (_x: number, y: number) => {
          stable = Math.abs(y - lastY) < 0.5 ? stable + 1 : 0;
          lastY = y;
          // Settled (two matching reads), reduced motion, or hit the ceiling →
          // commit the scroll. Otherwise wait a frame and re-measure.
          if (reducedMotion || stable >= 2 || tries >= MAX_TRIES) {
            scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: !reducedMotion });
          } else {
            setTimeout(attempt, 32);
          }
        },
        scrollToCached
      );
    };

    // Let the open/close animations start (and any newly-revealed rows mount)
    // before the first measurement.
    setTimeout(attempt, reducedMotion ? 30 : 80);
  };

  // Recenter the map on whichever federation is open. Fires on every openId
  // change, so opening a row, switching to another, or tapping a pin all move
  // the map to that location. Closing a row leaves the map where it is.
  const mapRef = React.useRef<MapView>(null);
  React.useEffect(() => {
    if (openId == null) return;
    const f = FEDERATIONS.find((x) => x.id === openId);
    if (!f || typeof f.lat !== "number" || typeof f.lng !== "number") return;
    mapRef.current?.animateToRegion(
      { latitude: f.lat, longitude: f.lng, latitudeDelta: 1.5, longitudeDelta: 1.5 },
      reducedMotion ? 0 : 500
    );
  }, [openId, reducedMotion]);

  const filtered = useMemo<Federation[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEDERATIONS;
    return FEDERATIONS.filter(
      (f) =>
        f.code.toLowerCase().includes(q) ||
        f.area.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
    );
  }, [query]);

  const INITIAL_COUNT = 10;
  const isSearching = query.trim().length > 0;
  const collapsedList = !showAll && !isSearching;
  const visible = collapsedList ? filtered.slice(0, INITIAL_COUNT) : filtered;
  const hiddenCount = filtered.length - visible.length;

  // Android's scrollbar is pinned to the ScrollView's right edge and ignores
  // scrollIndicatorInsets, so we inset the ScrollView itself by a hair to lift
  // the bar off the screen edge like iOS. iOS keeps full width + indicator
  // insets.
  const ANDROID_BAR_INSET = Platform.OS === "android" ? 8 : 0;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <View style={{ flex: 1 }}>
      <ScrollView
        ref={pageRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* The page scrolls as a whole, so you can reach the bottom. The map
            pans when touched and the federation list scrolls inside its own
            window — each keeps its own gesture; the page scrolls everywhere
            else. */}
        {/* Large title + the requested subtitle */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: PAGE_TOP_PADDING, paddingBottom: 6 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 34,
              lineHeight: 41,
              fontFamily: displayFamily("700"),
              fontWeight: "700",
              color: t.text.body,
              letterSpacing: -0.8,
            }}
          >
            Adhérer à la FFIE
          </Text>
          <Text style={{ fontSize: 15, color: t.text.muted, marginTop: 6, lineHeight: 21 }}>
            Pour adhérer, adressez-vous à votre fédération départementale ci-dessous.
          </Text>
        </View>

        {/* Map — one pin per federation. Tapping a pin shows its name/area in a
            callout. Native module (react-native-maps): Apple Maps on iOS,
            Google Maps on Android. */}
        <View
          style={{
            marginHorizontal: GUTTER,
            marginTop: 12,
            borderRadius: primitives.radii.lg,
            overflow: "hidden",
            borderWidth: c.cardBorder ? 1 : 0,
            borderColor: c.cardBorder,
          }}
        >
          <MapView
            ref={mapRef}
            style={{ width: "100%", height: MAP_HEIGHT }}
            initialRegion={FRANCE_REGION}
            accessibilityLabel="Carte des fédérations départementales"
          >
            {FEDERATIONS_WITH_COORDS.map((f) => (
              <Marker
                key={f.id}
                coordinate={{ latitude: f.lat as number, longitude: f.lng as number }}
                title={f.area}
                description={f.name}
                onPress={() => focusFederation(f.id)}
              />
            ))}
          </MapView>
        </View>

        {/* Search field — same affordance as the Library */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            marginTop: 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              // A touch taller on Android — the native text baseline sits
              // higher there, so 38 felt cramped; iOS keeps the tighter figure.
              height: Platform.OS === "android" ? 46 : 38,
              borderRadius: 10,
              backgroundColor: t.border.subtle,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              columnGap: 7,
            }}
          >
            <Search size={17} color={t.text.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un département ou une fédération"
              placeholderTextColor={t.text.placeholder}
              style={{ flex: 1, color: t.text.body, fontSize: 16 }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Rechercher une fédération départementale"
            />
            {query.length > 0 ? (
              <SearchClearButton themeName={themeName} onPress={() => setQuery("")} />
            ) : null}
          </View>
        </View>

        {/* Departmental federation directory — scrolls inside its own fixed
            window so the page can still scroll around it (nested scroll). */}
        {filtered.length === 0 ? (
          <View style={{ padding: 48, alignItems: "center" }}>
            <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>Aucune fédération trouvée.</Text>
            <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
              Essayez un numéro de département (« 69 »), un nom (« Rhône ») ou « Bâtiment ».
            </Text>
          </View>
        ) : (
          <>
          <View style={{ paddingRight: ANDROID_BAR_INSET }}>
          <ScrollView
            ref={scrollRef}
            nestedScrollEnabled
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            style={{ height: listWindowHeight }}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator
            indicatorStyle={themeName === "dark" ? "white" : "default"}
            scrollIndicatorInsets={{ right: 3, top: 4, bottom: 4 }}
          >
          <View
            ref={listContentRef}
            onLayout={(e) => {
              listTop.current = e.nativeEvent.layout.y;
            }}
          >
            {/* Each FederationRow is now its own card (margins + shadow live on
                the row); this is just a plain container. */}
            <View>
              {visible.map((f) => (
                <FederationRow
                  key={f.id}
                  federation={f}
                  themeName={themeName}
                  reducedMotion={reducedMotion}
                  open={openId === f.id}
                  onToggle={() => toggleFederation(f.id)}
                  onMeasure={(y) => {
                    rowOffsets.current[f.id] = y;
                  }}
                  registerRef={(node) => {
                    rowRefs.current[f.id] = node;
                  }}
                />
              ))}
            </View>
          </View>
          </ScrollView>
          </View>

            {/* Show more — reveals the rest of the directory */}
            {collapsedList && hiddenCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Afficher les ${filtered.length} fédérations`}
                onPress={() => setShowAll(true)}
                style={({ pressed }) => ({
                  marginTop: 12,
                  marginHorizontal: GUTTER,
                  minHeight: 44,
                  borderRadius: primitives.radii.md,
                  backgroundColor: pressed ? t.border.subtle : t.surface.subtle,
                  borderWidth: 1,
                  borderColor: t.border.subtle,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  columnGap: 6,
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: ralewayFamily("600"),
                    fontWeight: "600",
                    color: t.text.body,
                  }}
                >
                  Afficher {hiddenCount} de plus
                </Text>
                <ChevronDown size={18} color={t.brand.accent} />
              </Pressable>
            ) : null}

            {/* Show less — collapses back to the short list (only when the user
                expanded it themselves; search manages its own result count) */}
            {showAll && !isSearching ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Afficher moins de fédérations`}
                onPress={() => {
                  setShowAll(false);
                  scrollToTop();
                }}
                style={({ pressed }) => ({
                  marginTop: 12,
                  marginHorizontal: GUTTER,
                  minHeight: 44,
                  borderRadius: primitives.radii.md,
                  backgroundColor: pressed ? t.border.subtle : t.surface.subtle,
                  borderWidth: 1,
                  borderColor: t.border.subtle,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  columnGap: 6,
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: ralewayFamily("600"),
                    fontWeight: "600",
                    color: t.text.body,
                  }}
                >
                  Afficher moins
                </Text>
                <ChevronUp size={18} color={t.brand.accent} />
              </Pressable>
            ) : null}

            {collapsedList ? (
              <Text
                style={{
                  color: t.text.muted,
                  fontSize: 12,
                  lineHeight: 16,
                  marginTop: 10,
                  marginHorizontal: GUTTER + 4,
                }}
              >
                {`${visible.length} fédérations départementales affichées sur ${FEDERATIONS.length}.`}
              </Text>
            ) : null}
          </>
        )}

        {/* Eligibility */}
        <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
          <View
            style={{
              padding: 16,
              borderRadius: primitives.radii.md,
              backgroundColor: themeName === "dark" ? t.surface.raised : t.surface.subtle,
              borderWidth: 1,
              borderColor: t.border.subtle,
              flexDirection: "row",
              columnGap: 10,
            }}
          >
            <ShieldCheck size={18} color={t.brand.accent} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: t.text.muted, lineHeight: 19 }}>
              Ouvert aux entreprises d'intégration électrique immatriculées en France. Les demandes sont traitées par votre
              fédération départementale, puis examinées par la FFIE avant l'octroi de l'accès. Vous serez notifié par e-mail.
            </Text>
          </View>
        </View>
      </ScrollView>
      </View>

      {/* Back to top — floats over the list once scrolled deep. The whole
          button fades in/out (opacity only, no slide). */}
      <Animated.View
        pointerEvents={showBackToTop ? "box-none" : "none"}
        style={{
          position: "absolute",
          right: GUTTER,
          bottom: 24,
          opacity: backToTopAnim,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour en haut"
          onPress={scrollToTop}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 6,
            elevation: 4,
          })}
        >
          <ArrowUp size={22} color={t.action.primary.fg} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
