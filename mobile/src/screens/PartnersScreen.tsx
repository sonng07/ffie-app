// Partners tab — three segments under the large title, mirroring the News tab's
// segmented control (Actualités / Événements). The default segment, "Partenaires",
// is the full FFIE partner roster from the federation's "Nos partenaires" page,
// in the same data-driven layout as the Doc Library: large title, rounded search
// field + filter button, and a grouped inset list capped to a short view with
// "Show more". The directory content lives in data/partners.ts; this screen
// searches, filters, and renders it.
//
// The two other segments — "Mission & valeurs" and "Organisation" — are blank
// placeholder shells for now (exactly like the News tab's Événements segment):
// the segmented control and empty shell land first, content follows.
//
// Design contracts borrowed from the Library screen:
//   1. Search field at top — no autofocus.
//   2. Rows ≥48pt (InsetRow floors minHeight at 48).
//   3. Each row carries a category label as its trailing accessory (text +
//      tinted monogram, never colour alone).
//   4. Filter sheet toggles partners by category.
//   5. Tapping a row opens the partner's website in the NATIVE in-app browser
//      (expo-web-browser → SFSafariViewController on iOS / Chrome Custom Tabs
//      on Android), presented as a page sheet. Dismissing it returns here to
//      Partners. The few entries the source page lists without a link (CEETB,
//      FISUEL) are not tappable.
//
// Note: like the Library preview, this uses a ScrollView (28 partners). At
// production scale, swap to a SectionList grouped by category.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowUp,
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HeartHandshake,
  Phone,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { FilterButton, FilterSheet } from "@/components/ui/FilterControls";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import * as WebBrowser from "expo-web-browser";
import {
  PARTNERS,
  PARTNER_CATEGORY_LABELS,
  type Partner,
  type PartnerCategory,
} from "@/data/partners";
import {
  MISSION_INTRO,
  MISSION_POINTS,
  MISSION_TERRITORY_TITLE,
  MISSION_TERRITORY_BODY,
  MISSION_MARKETS_TITLE,
  MISSION_MARKETS_INTRO,
  MISSION_MARKETS,
  MISSION_CLOSING,
} from "@/data/mission";
import {
  ORG_SUBTITLE,
  ORG_BODIES,
  BUREAU_MEMBERS,
  CONSEIL_MEMBERS,
  CONSEIL_HONORARY,
  EQUIPE_MEMBERS,
  ANITEC_MEMBERS,
  ORG_CONTACTS,
  type OrgMember,
} from "@/data/organisation";
import { MissionInfographic } from "@/components/MissionInfographic";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  GUTTER,
  InsetRow,
  LargeTitleHeader,
  SearchClearButton,
  SectionHeader,
  useGroupedColors,
} from "@/components/ui/ios";

// Filter chips, in the order they read on the page's grouping. Keep in sync
// with PartnerCategory / PARTNER_CATEGORY_LABELS in data/partners.ts.
const FILTER_OPTIONS: { key: PartnerCategory; label: string }[] = [
  { key: "standards", label: PARTNER_CATEGORY_LABELS.standards },
  { key: "federation", label: PARTNER_CATEGORY_LABELS.federation },
  { key: "energy", label: PARTNER_CATEGORY_LABELS.energy },
  { key: "institution", label: PARTNER_CATEGORY_LABELS.institution },
  { key: "finance", label: PARTNER_CATEGORY_LABELS.finance },
  { key: "solidarity", label: PARTNER_CATEGORY_LABELS.solidarity },
];

// Deterministic tint per category so each partner's monogram keeps its colour
// across renders + filter changes. Hardcoded (like the Library's doc tones) so
// the screen doesn't depend on theme-token shape.
const CATEGORY_TINT: Record<PartnerCategory, string> = {
  standards: "#222D5D", // navy
  federation: "#0094A9", // teal
  energy: "#B45309", // amber
  institution: "#2563EB", // blue
  finance: "#4B5563", // slate
  solidarity: "#15803D", // green
};

const MONO = 38;

// The three top-level views inside the Partners tab. "partners" is the partner
// directory; "mission" and "organization" are placeholders for the upcoming
// Mission & valeurs / Organisation features (blank for now). A segmented control
// at the top toggles between them, like the News tab's Actualités / Événements.
type PartnersTab = "partners" | "mission" | "organization";

// Large-title text per segment (the header re-titles like the News tab does).
const TAB_TITLES: Record<PartnersTab, string> = {
  partners: "Partenaires",
  mission: "Mission & valeurs",
  organization: "Organisation",
};

// TEMPORARY: the "Mission & valeurs" and "Organisation" segments are hidden
// while they sit outside the agreed Phase-1 scope (not in the WBS). Flip this
// back to `true` to restore both segments — the views (MissionView /
// OrganizationView) and their data stay in place, so this is the only change.
const SHOW_FEDERATION_SEGMENTS = false;

// Segments shown in the control. With the federation segments hidden, only
// "Partenaires" remains and the control collapses (see the screen body).
const SEGMENT_OPTIONS: { key: PartnersTab; label: string }[] = SHOW_FEDERATION_SEGMENTS
  ? [
      { key: "partners", label: "Partenaires" },
      { key: "mission", label: "Mission & valeurs" },
      { key: "organization", label: "Organisation" },
    ]
  : [{ key: "partners", label: "Partenaires" }];

// Monogram tile — stands in for a partner logo. Tinted by category, short code
// from the data file. NOT an icon; reads as a brand chip at small size.
function PartnerMonogram({ partner }: { partner: Partner }) {
  return (
    <View
      style={{
        width: MONO,
        height: MONO,
        borderRadius: 9,
        backgroundColor: CATEGORY_TINT[partner.category],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: partner.short.length >= 3 ? 12 : 14,
          fontFamily: ralewayFamily("700"),
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {partner.short}
      </Text>
    </View>
  );
}

export function PartnersScreen({
  themeName = "light",
  onPartnerPress,
}: {
  themeName?: ThemeName;
  onPartnerPress?: (partner: Partner) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Set<PartnerCategory>>(new Set());
  // Show a short list by default; "Show more" reveals the rest. An active
  // search or filter bypasses the cap so every match stays visible.
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll position, fed to the Mission infographic so its count-ups / gauges
  // fire only once it scrolls into view (it sits far below the fold).
  const scrollY = useRef(new Animated.Value(0)).current;

  // Active segment. Switching to mission/organization reveals a blank placeholder
  // shell (those features are not built yet).
  const [tab, setTab] = useState<PartnersTab>("partners");

  // "Back to top" — a FAB that fades in once scrolled deep (matches the Join
  // FFIE screen). Hysteresis on the thresholds stops it flickering at the edge.
  const reducedMotion = useReducedMotion();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const backToTopAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(backToTopAnim, {
      toValue: showBackToTop ? 1 : 0,
      duration: reducedMotion ? 0 : primitives.motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showBackToTop, reducedMotion, backToTopAnim]);

  // Switching segment starts fresh at the top and hides the button (the
  // Organisation segment is short and would otherwise keep it lingering).
  useEffect(() => {
    setShowBackToTop(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.setValue(y); // keep the infographic's in-view trigger fed
    if (y > 700 && !showBackToTop) setShowBackToTop(true);
    else if (y < 500 && showBackToTop) setShowBackToTop(false);
  };

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });

  // Open a site in the native in-app browser (page sheet, slides up from the
  // bottom). Dismissing it returns to Partners automatically.
  const openInBrowser = (url: string, tint: string) => {
    WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: tint,
      toolbarColor: t.surface.default,
      dismissButtonStyle: "close",
    }).catch(() => {});
  };

  const openPartner = (partner: Partner) => {
    if (!partner.url) return; // CEETB / FISUEL have no site on the FFIE page
    onPartnerPress?.(partner); // preserve any external hook (analytics, etc.)
    // jump straight to the partner's official website
    openInBrowser(partner.url, CATEGORY_TINT[partner.category]);
  };

  const filtered = useMemo<Partner[]>(() => {
    const q = query.trim().toLowerCase();
    const hasCategoryFilter = categoryFilter.size > 0;
    return PARTNERS.filter((p) => {
      if (hasCategoryFilter && !categoryFilter.has(p.category)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [query, categoryFilter]);

  const activeFilterCount = categoryFilter.size;

  // Collapsed-list logic (mirrors the Join FFIE directory): cap the list at
  // INITIAL_COUNT until the user taps "Show more"; search/filter show all.
  const INITIAL_COUNT = 7;
  const searchingOrFiltering = query.trim().length > 0 || activeFilterCount > 0;
  const collapsedList = !showAll && !searchingOrFiltering;
  const visible = collapsedList ? filtered.slice(0, INITIAL_COUNT) : filtered;
  const hiddenCount = filtered.length - visible.length;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        <LargeTitleHeader title={TAB_TITLES[tab]} themeName={themeName} />

        {/* Segment toggle. Sits under the large title like an iOS segmented
            control; switching to Mission & valeurs / Organisation reveals the
            federation copy. Hidden entirely when only "Partenaires" remains
            (see SHOW_FEDERATION_SEGMENTS) so no lone pill is shown. */}
        {SEGMENT_OPTIONS.length > 1 ? (
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 16 }}>
            <SegmentedControl
              themeName={themeName}
              value={tab}
              options={SEGMENT_OPTIONS}
              onChange={setTab}
            />
          </View>
        ) : (
          <View style={{ paddingTop: 6 }} />
        )}

        {tab === "mission" ? (
          <MissionView themeName={themeName} scrollY={scrollY} />
        ) : tab === "organization" ? (
          <OrganizationView themeName={themeName} />
        ) : (
        <>
        {/* Directory section intro — order: ALL PARTNERS / search / description. */}
        <SectionHeader title="Tous les partenaires" themeName={themeName} />

        {/* iOS-style rounded search field + inline filter button */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            columnGap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
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
              placeholder="Rechercher des partenaires"
              placeholderTextColor={t.text.placeholder}
              style={{ flex: 1, color: t.text.body, fontSize: 16 }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Rechercher un partenaire"
            />
            {query.length > 0 ? (
              <SearchClearButton themeName={themeName} onPress={() => setQuery("")} />
            ) : null}
          </View>

          <FilterButton
            themeName={themeName}
            activeCount={activeFilterCount}
            onPress={() => setFilterOpen(true)}
            accessibilityLabel={
              activeFilterCount > 0
                ? `Filtrer les partenaires, ${activeFilterCount} actif(s)`
                : "Filtrer les partenaires"
            }
          />
        </View>

        {/* Description — below the search bar */}
        <Text
          style={{
            color: t.text.muted,
            fontSize: 13,
            lineHeight: 18,
            marginHorizontal: GUTTER + 4,
            marginBottom: 16,
          }}
        >
          Les partenaires et organismes affiliés de la fédération.
        </Text>

        {/* Grouped inset partner list */}
        {filtered.length === 0 ? (
          <View style={{ padding: 48, alignItems: "center" }}>
            <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>Aucun partenaire.</Text>
            <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
              Essayez « Consuel », « Enedis » ou « normes ».
            </Text>
          </View>
        ) : (
          <View style={{ marginBottom: 28 }}>
            {/* Card built manually (not InsetGroup) so the Show more/less button
                tucks right under it, matching the Join FFIE directory. */}
            <View
              style={{
                marginHorizontal: GUTTER,
                backgroundColor: c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: c.cardBorder ? 1 : 0,
                borderColor: c.cardBorder,
                overflow: "hidden",
              }}
            >
              {visible.map((p, i) => (
                <InsetRow
                  key={p.id}
                  leading={<PartnerMonogram partner={p} />}
                  leadingWidth={MONO}
                  title={p.name}
                  subtitle={p.description}
                  themeName={themeName}
                  isLast={i === visible.length - 1}
                  // Render the chevron ourselves (in trailing) so every row —
                  // tappable or not — keeps the same arrow + aligned category.
                  showChevron={false}
                  accessibilityLabel={`${p.name}. ${p.description}`}
                  accessibilityHint={p.url ? "Ouvre le site du partenaire dans l'application" : undefined}
                  onPress={p.url ? () => openPartner(p) : undefined}
                  trailing={
                    <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          color: t.text.muted,
                          maxWidth: 84,
                          textAlign: "right",
                          lineHeight: 14,
                        }}
                        numberOfLines={2}
                      >
                        {PARTNER_CATEGORY_LABELS[p.category]}
                      </Text>
                      <ChevronRight size={18} color={t.text.muted} style={{ opacity: 0.5 }} />
                    </View>
                  }
                />
              ))}
            </View>

            {/* Show more — reveals the rest of the directory */}
            {collapsedList && hiddenCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Afficher les ${filtered.length} partenaires`}
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
                <Text style={{ fontSize: 15, fontFamily: ralewayFamily("600"), fontWeight: "600", color: t.text.body }}>
                  Afficher {hiddenCount} de plus
                </Text>
                <ChevronDown size={18} color={t.brand.accent} />
              </Pressable>
            ) : null}

            {/* Show less — collapses back to the short list (only when the user
                expanded it themselves; search/filter manage their own count) */}
            {showAll && !searchingOrFiltering ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Afficher moins de partenaires"
                onPress={() => {
                  setShowAll(false);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
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
                <Text style={{ fontSize: 15, fontFamily: ralewayFamily("600"), fontWeight: "600", color: t.text.body }}>
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
                {`${visible.length} partenaires affichés sur ${PARTNERS.length}.`}
              </Text>
            ) : null}
          </View>
        )}
        </>
        )}
      </ScrollView>

      {/* Back to top — floats over the content once scrolled deep (Partners /
          Mission segments). Fades in/out (opacity only, no slide). */}
      <Animated.View
        pointerEvents={showBackToTop ? "box-none" : "none"}
        style={{ position: "absolute", right: GUTTER, bottom: 24, opacity: backToTopAnim }}
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

      {/* Filter sheet only reachable from the Partners segment (the only one
          with a filter button), so it stays mounted but invisible elsewhere. */}
      <FilterSheet
        visible={filterOpen}
        themeName={themeName}
        sectionLabel="Catégorie"
        options={FILTER_OPTIONS}
        selected={categoryFilter}
        resultCount={filtered.length}
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
// MissionView — the "Mission & valeurs" segment. Renders the FFIE federation's
// own copy from its "Missions et valeurs" page, in the same iOS-HIG editorial
// style as the rest of the app: a lead paragraph, the three missions in a
// grouped card, the territorial footprint, the emerging-markets list as chips,
// and a closing line. Content is data-driven from data/mission.ts.
// ---------------------------------------------------------------------------
function MissionView({ themeName, scrollY }: { themeName: ThemeName; scrollY?: Animated.Value }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <View style={{ paddingTop: 8 }}>
      {/* Lead paragraph — the page's opening statement. */}
      <Text
        style={{
          color: t.text.body,
          fontSize: 17,
          lineHeight: 25,
          fontFamily: ralewayFamily("500"),
          fontWeight: "500",
          marginHorizontal: GUTTER + 4,
          marginBottom: 24,
        }}
      >
        {MISSION_INTRO}
      </Text>

      {/* Nos missions — the three pillars in a grouped card. Each row leads
          with the action verb (accent, bold) then its description. */}
      <SectionHeader title="Nos missions" themeName={themeName} />
      <View
        style={{
          marginHorizontal: GUTTER,
          marginBottom: 28,
          backgroundColor: c.cardBg,
          borderRadius: primitives.radii.lg,
          borderWidth: c.cardBorder ? 1 : 0,
          borderColor: c.cardBorder,
          overflow: "hidden",
        }}
      >
        {MISSION_POINTS.map((m, i) => (
          <View key={m.verb}>
            <View style={{ paddingHorizontal: GUTTER, paddingVertical: 14 }}>
              <Text style={{ fontSize: 15, lineHeight: 22, color: t.text.body }}>
                <Text
                  style={{
                    fontFamily: ralewayFamily("700"),
                    fontWeight: "700",
                    color: t.brand.accent,
                  }}
                >
                  {m.verb}{" "}
                </Text>
                {m.body}
              </Text>
            </View>
            {i < MISSION_POINTS.length - 1 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: c.separator,
                  marginLeft: GUTTER,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>

      {/* Sur tout le territoire — the local footprint. */}
      <SectionHeader title={MISSION_TERRITORY_TITLE} themeName={themeName} />
      <Text
        style={{
          color: t.text.muted,
          fontSize: 14.5,
          lineHeight: 21,
          marginHorizontal: GUTTER + 4,
          marginBottom: 28,
        }}
      >
        {MISSION_TERRITORY_BODY}
      </Text>

      {/* Connectée aux marchés émergents — lead-in + the nine areas as chips. */}
      <SectionHeader title={MISSION_MARKETS_TITLE} themeName={themeName} />
      <Text
        style={{
          color: t.text.muted,
          fontSize: 14.5,
          lineHeight: 21,
          marginHorizontal: GUTTER + 4,
          marginBottom: 14,
        }}
      >
        {MISSION_MARKETS_INTRO}
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginHorizontal: GUTTER,
          marginBottom: 28,
        }}
      >
        {MISSION_MARKETS.map((m) => (
          <View
            key={m}
            style={{
              backgroundColor: t.surface.subtle,
              borderWidth: 1,
              borderColor: t.border.subtle,
              borderRadius: primitives.radii.full,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text
              style={{
                color: t.text.body,
                fontSize: 13,
                fontFamily: ralewayFamily("600"),
                fontWeight: "600",
              }}
            >
              {m}
            </Text>
          </View>
        ))}
      </View>

      {/* Closing line — emphasised, on a tinted band. */}
      <View
        style={{
          marginHorizontal: GUTTER,
          marginBottom: 12,
          backgroundColor: t.brand.accent,
          borderRadius: primitives.radii.lg,
          paddingHorizontal: 18,
          paddingVertical: 18,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            lineHeight: 23,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
        >
          {MISSION_CLOSING}
        </Text>
      </View>

      {/* Key-figures infographic — animated rebuild of the "FFIE en chiffres"
          chart at the foot of the source page. Animates in as it scrolls into
          view (scrollY passed from the screen's ScrollView). */}
      <View style={{ marginTop: 28 }}>
        <SectionHeader title="La FFIE en chiffres" themeName={themeName} />
        <MissionInfographic scrollY={scrollY} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// OrganizationView — the "Organisation" segment. The large title above already
// reads "Organisation"; here we add the page's subtitle, then one card per
// governing body (Bureau, Conseil d'administration, Équipe) from
// data/organisation.ts. Each card: an accent icon badge, the body's name, an
// optional member-count badge, and a descriptive line.
// ---------------------------------------------------------------------------
const ORG_ICON: Record<string, LucideIcon> = {
  bureau: Briefcase,
  conseil: Users,
  equipe: HeartHandshake,
};

// Members shown per body in its popup. Bureau / Conseil use the simple roster
// list; the Équipe popup composes its own sections (team + Anitec + contacts).
const ORG_MEMBERS: Record<string, OrgMember[]> = {
  bureau: BUREAU_MEMBERS,
  conseil: CONSEIL_MEMBERS,
};

function OrganizationView({ themeName }: { themeName: ThemeName }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  // Which body's popup is open (null = none). Each card opens a modal.
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View style={{ paddingTop: 8 }}>
      {/* Subtitle — the page's intro paragraph, at normal body text size. */}
      <Text
        style={{
          color: t.text.muted,
          fontSize: 14.5,
          lineHeight: 21,
          fontFamily: ralewayFamily("400"),
          fontWeight: "400",
          marginHorizontal: GUTTER + 4,
          marginBottom: 22,
        }}
      >
        {ORG_SUBTITLE}
      </Text>

      <SectionHeader title="Gouvernance" themeName={themeName} />

      {/* Three cards — one per governing body. Each opens a popup. */}
      <View style={{ paddingHorizontal: GUTTER, rowGap: 14, marginBottom: 12 }}>
        {ORG_BODIES.map((b) => {
          const Icon = ORG_ICON[b.id] ?? Briefcase;
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`${b.title}${b.stat ? `, ${b.stat}` : ""}`}
              accessibilityHint="Ouvre le détail"
              onPress={() => setOpenId(b.id)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.border.subtle : c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: c.cardBorder ? 1 : 0,
                borderColor: c.cardBorder,
                padding: 16,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", columnGap: 12, marginBottom: 10 }}>
                {/* Accent icon badge */}
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: t.brand.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={20} color="#FFFFFF" strokeWidth={2} />
                </View>

                <Text
                  style={{
                    flex: 1,
                    color: t.text.body,
                    fontSize: 17,
                    fontFamily: ralewayFamily("700"),
                    fontWeight: "700",
                    letterSpacing: -0.2,
                  }}
                  numberOfLines={2}
                >
                  {b.title}
                </Text>

                {/* Optional member-count badge */}
                {b.stat ? (
                  <View
                    style={{
                      backgroundColor: t.surface.subtle,
                      borderRadius: primitives.radii.full,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: t.brand.accent,
                        fontSize: 12,
                        fontFamily: ralewayFamily("700"),
                        fontWeight: "700",
                      }}
                    >
                      {b.stat}
                    </Text>
                  </View>
                ) : null}

                <ChevronRight size={20} color={t.text.muted} style={{ opacity: 0.6 }} />
              </View>

              <Text style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 21 }}>
                {b.body}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <OrgDetailModal
        themeName={themeName}
        body={ORG_BODIES.find((b) => b.id === openId) ?? null}
        onClose={() => setOpenId(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// OrgDetailModal — bottom-sheet popup for a governing body. Shows the body's
// roster (Bureau / Conseil) as a scrollable member list, or — for the Équipe —
// its description plus the action chips. Slides up unless reduced motion is on,
// in which case it appears with no transition.
// ---------------------------------------------------------------------------
function OrgDetailModal({
  themeName,
  body,
  onClose,
}: {
  themeName: ThemeName;
  body: { id: string; title: string; stat?: string; body: string } | null;
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // Drive the scrim fade + sheet slide ourselves (animationType="none") so the
  // tinted backdrop fades in/out while the sheet slides, instead of the whole
  // overlay sliding as one. `rendered` keeps the Modal mounted through the exit
  // animation; `current` holds the content so it stays visible while closing.
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  const [current, setCurrent] = useState(body);
  const [sheetH, setSheetH] = useState(0);

  // "Back to top" inside the popup (the Conseil list is long). Same FAB pattern
  // as the screen, scrolling the sheet's own list rather than the page.
  const listRef = useRef<ScrollView>(null);
  const [showTop, setShowTop] = useState(false);
  const topAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(topAnim, {
      toValue: showTop ? 1 : 0,
      duration: reduced ? 0 : primitives.motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showTop, reduced, topAnim]);

  const onListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 500 && !showTop) setShowTop(true);
    else if (y < 300 && showTop) setShowTop(false);
  };
  const listScrollToTop = () => listRef.current?.scrollTo({ y: 0, animated: !reduced });

  useEffect(() => {
    if (body) {
      setCurrent(body);
      setRendered(true);
      setShowTop(false);
      listRef.current?.scrollTo({ y: 0, animated: false });
      if (reduced) {
        anim.setValue(1);
      } else {
        Animated.timing(anim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    } else if (rendered) {
      if (reduced) {
        anim.setValue(0);
        setRendered(false);
      } else {
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setRendered(false);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, reduced]);

  const members = current ? ORG_MEMBERS[current.id] : undefined;

  // Fall back to a generous offset until the sheet has measured its height.
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetH || 600, 0],
  });
  const scrimOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Tinted backdrop — fades in/out (visual only). */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: scrimOpacity }]}
        />
        {/* Tap anywhere off the sheet to dismiss. */}
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Fermer" onPress={onClose} />

        <Animated.View
          onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          style={{
            backgroundColor: c.pageBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "88%",
            overflow: "hidden",
            transform: [{ translateY }],
          }}
        >
          {/* Grab handle */}
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.border.default }} />
          </View>

          {/* Header: title + count + close */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              columnGap: 12,
              paddingHorizontal: GUTTER,
              paddingTop: 8,
              paddingBottom: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: t.text.body,
                  fontSize: 22,
                  fontFamily: displayFamily("700"),
                  fontWeight: "700",
                  letterSpacing: -0.4,
                }}
              >
                {current?.title}
              </Text>
              {current?.stat ? (
                <Text style={{ color: t.text.muted, fontSize: 13, marginTop: 2 }}>{current.stat}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? t.border.default : t.surface.subtle,
              })}
            >
              <X size={18} color={t.text.muted} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />

          <ScrollView
            ref={listRef}
            onScroll={onListScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingHorizontal: GUTTER,
              paddingTop: 16,
              paddingBottom: insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            {members ? (
              <View>
                <View style={{ rowGap: 16 }}>
                  {members.map((m) => (
                    <MemberRow key={m.name} member={m} themeName={themeName} />
                  ))}
                </View>

                {/* Conseil — honorary administrators, in their own subsection. */}
                {current?.id === "conseil" ? (
                  <>
                    <ModalSectionLabel themeName={themeName}>Administrateurs honoraires</ModalSectionLabel>
                    <View style={{ rowGap: 16 }}>
                      {CONSEIL_HONORARY.map((m) => (
                        <MemberRow key={m.name} member={m} themeName={themeName} />
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            ) : current?.id === "equipe" ? (
              // Équipe — the team org chart, restacked as a directory:
              // intro, the FFIE team, the ANITEC cluster, and the contacts.
              <View>
                <Text style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 21, marginBottom: 4 }}>
                  {current.body}
                </Text>

                <ModalSectionLabel themeName={themeName}>Équipe FFIE</ModalSectionLabel>
                <View style={{ rowGap: 16 }}>
                  {EQUIPE_MEMBERS.map((m) => (
                    <MemberRow key={m.name} member={m} themeName={themeName} />
                  ))}
                </View>

                <ModalSectionLabel themeName={themeName}>Anitec</ModalSectionLabel>
                <View style={{ rowGap: 16 }}>
                  {ANITEC_MEMBERS.map((m) => (
                    <MemberRow key={m.name} member={m} themeName={themeName} />
                  ))}
                </View>

                <ModalSectionLabel themeName={themeName}>Contacts</ModalSectionLabel>
                <View
                  style={{
                    backgroundColor: c.cardBg,
                    borderRadius: primitives.radii.lg,
                    borderWidth: c.cardBorder ? 1 : 0,
                    borderColor: c.cardBorder,
                    overflow: "hidden",
                  }}
                >
                  {ORG_CONTACTS.map((contact, i) => (
                    <ContactRow
                      key={contact.label}
                      contact={contact}
                      themeName={themeName}
                      isLast={i === ORG_CONTACTS.length - 1}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Back to top — floats over the sheet's list once scrolled deep. */}
          <Animated.View
            pointerEvents={showTop ? "box-none" : "none"}
            style={{ position: "absolute", right: GUTTER, bottom: insets.bottom + 16, opacity: topAnim }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour en haut"
              onPress={listScrollToTop}
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
        </Animated.View>
      </View>
    </Modal>
  );
}

// Small uppercase label between sections inside the popup. (Not SectionHeader —
// that one adds its own gutter inset, which the modal's padding already covers.)
function ModalSectionLabel({ themeName, children }: { themeName: ThemeName; children: string }) {
  const t = themes[themeName];
  return (
    <Text
      style={{
        color: t.text.muted,
        fontSize: 12,
        fontFamily: ralewayFamily("600"),
        fontWeight: "600",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

// ContactRow — a tappable switchboard number (opens the dialer).
function ContactRow({
  contact,
  themeName,
  isLast,
}: {
  contact: { label: string; phone: string };
  themeName: ThemeName;
  isLast: boolean;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Appeler ${contact.label}, ${contact.phone}`}
      onPress={() => Linking.openURL(`tel:${contact.phone.replace(/\s/g, "")}`).catch(() => {})}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        columnGap: 12,
        paddingHorizontal: GUTTER,
        paddingVertical: 13,
        backgroundColor: pressed ? t.border.subtle : "transparent",
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: t.brand.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Phone size={16} color="#FFFFFF" strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text.body, fontSize: 15, fontFamily: ralewayFamily("600"), fontWeight: "600" }}>
          {contact.label}
        </Text>
        <Text style={{ color: t.brand.accent, fontSize: 14, marginTop: 1 }}>{contact.phone}</Text>
      </View>
      {!isLast ? (
        <View
          style={{
            position: "absolute",
            left: GUTTER + 34 + 12,
            right: 0,
            bottom: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: c.separator,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// Derive a 2-letter monogram from a "Prénom Nom" name when none is supplied.
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

// MemberRow — monogram avatar + name + stacked role lines. Shared by the Bureau
// and Conseil popups.
function MemberRow({ member, themeName }: { member: OrgMember; themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", columnGap: 12 }}>
      {/* Photo avatar when supplied, else an initials monogram. */}
      {member.photo ? (
        <RemoteImage
          source={typeof member.photo === "number" ? member.photo : undefined}
          uri={typeof member.photo === "string" ? member.photo : undefined}
          width={44}
          height={44}
          radius={22}
          themeName={themeName}
          accessibilityLabel={`Portrait de ${member.name}`}
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#222D5D", // brand navy, like the chart
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 15,
              fontFamily: ralewayFamily("700"),
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {member.initials ?? initialsFor(member.name)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: t.text.body,
            fontSize: 15.5,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.1,
          }}
        >
          {member.name}
        </Text>
        {member.roles.map((role, ri) => (
          <Text
            key={role}
            style={{
              color: t.brand.accent,
              fontSize: 13,
              lineHeight: 18,
              marginTop: ri === 0 ? 2 : 0,
              fontFamily: ralewayFamily("600"),
              fontWeight: "600",
            }}
          >
            {role}
          </Text>
        ))}
      </View>
    </View>
  );
}
