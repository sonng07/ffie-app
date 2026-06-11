// FFIE — Doc Library Screen, styled to iOS HIG (large title, rounded search,
// grouped inset list) via the shared iOS primitives (components/ui/ios).
//
// Renders the full FFIE documents catalogue (335 docs — see src/data/docs.ts),
// STRUCTURED into one inset section card per FFIE family (the site's top-level
// taxonomy), each headed by its name + a live "N docs" count badge — mirroring
// the client's sectioned documentation layout. On top of sectioning:
//   - Each section opens collapsed to a preview (SECTION_PREVIEW rows); a
//     per-section "Show all" reveals the rest of that family.
//   - Search + filter narrow the corpus AND the section list (empty families
//     drop out, badge counts update live).
//   - A "back to top" button floats in once you scroll down.
//   - Member-only documents carry a lock tag for viewers who can't open them
//     (guests) — the same LockTag the News cards use.
// Sections open collapsed, so a plain ScrollView is fine — only the previews
// (plus any family the user explicitly expands) render.
//
// Design contracts honored:
//   1. Search field at top (P3) — no autofocus (keyboard-on-mount is rude).
//   2. Rows ≥48pt (P1) — InsetRow floors minHeight at 48.
//   3. Offline banner when offline=true (P2).
//   4. Each row carries a SavedBadge OR a LockTag (icon+label, never colour
//      alone — P2+P4).
//   5. Theme + density supplied by caller. 6. Mobile gutter = 16.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Files,
  Flame,
  Gauge,
  Search,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { primitives, themes, type ThemeName, type DensityMode } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { SavedBadge } from "@/components/ui/SavedBadge";
import { LockTag } from "@/components/ui/LockTag";
import { FilterButton, FilterSheet, type FilterSection } from "@/components/ui/FilterControls";
import { DOCS, DOC_FAMILIES, docSubtitle, type Doc, type DocFamily } from "@/data/docs";
import { DocDetailScreen } from "@/screens/DocDetailScreen";
import { MemberOnlyPrompt } from "@/screens/MemberOnlyPrompt";
import { canAccess, useRole } from "@/auth/roleContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  ASSISTANT_FAB_SIZE,
  ASSISTANT_FAB_GAP,
} from "@/components/assistant/AssistantChatWidget";
import {
  GUTTER,
  InsetGroup,
  InsetRow,
  SearchClearButton,
  useGroupedColors,
} from "@/components/ui/ios";

// The library's offline filter is two-state, matching the doc's `saved` flag
// (FFIE-DOC-03 / P2): "show me what's on this device" vs "what I still need to
// download". Nothing richer is in scope.
type SavedFilterKey = "saved" | "not-saved";

const FILTER_OPTIONS: { key: SavedFilterKey; label: string }[] = [
  { key: "saved", label: "Saved offline" },
  { key: "not-saved", label: "Not saved" },
];

// Family (Famille) facet — the FFIE site's top-level taxonomy (FFIE-DOC-04:
// "filtering ... by category"). Keys ARE the family names, so a selected key
// maps straight onto each doc's `family`. Built from the canonical order in
// docs.ts so the chips read in the same order the site lists them.
const FAMILY_OPTIONS: { key: DocFamily; label: string }[] = DOC_FAMILIES.map(
  (f) => ({ key: f, label: f }),
);

// Each family section opens showing a preview of SECTION_PREVIEW rows; a
// per-section "Show all" reveals the rest of that family. Tunable.
const SECTION_PREVIEW = 3;
// Show the back-to-top button once the user has scrolled roughly a screenful.
const BACK_TO_TOP_AT = 520;
// The Claude assistant FAB (AssistantChatWidget) owns the bottom-right corner.
// This button lives in the screen's content area (above the tab bar, so the
// bottom inset is already absorbed) and stacks one 12pt gap above the FAB.
// Mirrors BACK_TO_TOP_LIFT in NewsScreen.
const BACK_TO_TOP_LIFT = ASSISTANT_FAB_GAP + ASSISTANT_FAB_SIZE + 12;

// Thumbnail visuals — a 50×66 box showing the document's real FFIE cover image.
// While that image loads (or if it fails / we're offline) we render a mock
// "rendered page" so the row never shows a broken image.
const THUMB_WIDTH = 50;
const THUMB_HEIGHT = 66;

type ThumbTone = "navy" | "teal" | "amber" | "slate" | "green";

const TONES: Record<ThumbTone, string> = {
  navy: "#222D5D",
  teal: "#0094A9",
  amber: "#B45309",
  slate: "#4B5563",
  green: "#15803D",
};

const BODY_DARK = "#C2C8D2";
const BODY_LIGHT = "#DDE1E8";
const SUBTITLE = "#9AA2B1";

// Mock-page tone is keyed to the document's FFIE family — a meaningful accent
// for the fallback (never the ONLY signal: the subtitle says it in words, P4).
const FAMILY_TONE: Record<DocFamily, ThumbTone> = {
  "Power Systems": "navy",
  "Safety / Fire Safety": "amber",
  "Company Life": "slate",
  "Connected Buildings": "teal",
  "Energy Performance": "green",
  Maintenance: "slate",
  "Document Types": "navy",
  "Other Documents": "slate",
};

// Section-header icon per FFIE family — a quick visual anchor for each card
// header (the icon column the client's mock shows beside the section name).
const FAMILY_ICON: Record<DocFamily, LucideIcon> = {
  "Power Systems": Zap,
  "Safety / Fire Safety": Flame,
  "Company Life": Building2,
  "Connected Buildings": Wifi,
  "Energy Performance": Gauge,
  Maintenance: Wrench,
  "Document Types": FileText,
  "Other Documents": Files,
};

function MockPage({ tone }: { tone: ThumbTone }) {
  const titleColor = TONES[tone];
  return (
    <View style={{ paddingTop: 5, paddingHorizontal: 5 }}>
      <View style={{ height: 4, backgroundColor: titleColor, width: "80%" }} />
      <View style={{ height: 1.5, backgroundColor: SUBTITLE, width: "55%", marginTop: 3 }} />
      <View style={{ marginTop: 5, rowGap: 1.5 }}>
        <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "92%" }} />
        <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "88%" }} />
        <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "90%" }} />
        <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "62%" }} />
      </View>
      <View style={{ marginTop: 4, rowGap: 1.5 }}>
        <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "85%" }} />
        <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "92%" }} />
        <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "78%" }} />
        <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "50%" }} />
      </View>
    </View>
  );
}

function DocThumbnail({ doc }: { doc: Doc }) {
  // Show the real FFIE cover; on load failure (offline / 404) drop to the mock.
  const [failed, setFailed] = useState(false);
  const tone = FAMILY_TONE[doc.family];
  const showImage = !!doc.thumbUrl && !failed;
  return (
    <View
      style={{
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT,
        borderRadius: 3,
        backgroundColor: "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#C2C8D2",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <MockPage tone={tone} />
      {showImage ? (
        <Image
          source={{ uri: doc.thumbUrl }}
          onError={() => setFailed(true)}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </View>
  );
}

// CountBadge — the grey rounded pill on the right of each section header
// ("N docs"), counting the family's full match set (not just the preview).
function CountBadge({ count, themeName }: { count: number; themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <View
      style={{
        paddingHorizontal: 10,
        height: 24,
        borderRadius: 12,
        backgroundColor: t.border.subtle,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: ralewayFamily("600"),
          fontWeight: "600",
          color: t.text.muted,
        }}
      >
        {count} doc{count === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

// SectionHeaderRow — the card-top row that names a family: family icon, the
// family name (bold), and the live count badge. Sits inside the inset card
// above the document rows, with a hairline below it.
function SectionHeaderRow({
  icon: Icon,
  title,
  count,
  themeName,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          columnGap: 12,
          paddingHorizontal: GUTTER,
          paddingVertical: 13,
          minHeight: 52,
        }}
      >
        <Icon size={20} color={t.brand.accent} />
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            color: t.text.body,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <CountBadge count={count} themeName={themeName} />
      </View>
      <View
        style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: GUTTER }}
      />
    </View>
  );
}

// SectionToggleRow — the per-section "Show all N / Show less" row at the bottom
// of a family card, shown only when the family has more than SECTION_PREVIEW
// documents. Mirrors the old global "Show more" affordance, scoped to a family.
function SectionToggleRow({
  expanded,
  total,
  themeName,
  onPress,
}: {
  expanded: boolean;
  total: number;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Show fewer documents" : `Show all ${total} documents`}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? t.border.subtle : "transparent" })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          columnGap: 6,
          minHeight: 48,
          paddingVertical: 13,
        }}
      >
        <Text
          style={{
            color: t.brand.accent,
            fontSize: 14,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
          }}
        >
          {expanded ? "Show less" : `Show all ${total}`}
        </Text>
        <Icon size={16} color={t.brand.accent} />
      </View>
    </Pressable>
  );
}

type Props = {
  themeName: ThemeName;
  density: DensityMode;
  offline: boolean;
  onDocPress?: (doc: Doc) => void;
  /** Tapping a member-only doc as a guest opens the membership upsell, whose
   *  primary CTA calls this — the guest shell points it at the federation
   *  directory (map + departmental list). Omitted in the member shell (members
   *  can open every doc, so the upsell never appears). */
  onApply?: () => void;
  /** Secondary CTA on that upsell — "I already have an account" → sign-in. */
  onSignIn?: () => void;
  /** Incremented by the shell when the Library tab is re-tapped while already
   *  active. Pops an open document / upsell back to the list. */
  resetSignal?: number;
  /** Fired with `true` when a document detail or the upsell is open, `false`
   *  back on the list. The shell uses it to hide the floating avatar. */
  onDetailChange?: (isDetail: boolean) => void;
};

export function DocLibraryScreen({
  themeName,
  density,
  offline,
  onDocPress,
  onApply,
  onSignIn,
  resetSignal,
  onDetailChange,
}: Props) {
  void density; // grouped rows own their rhythm now
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { role } = useRole();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<SavedFilterKey>>(new Set());
  const [familyFilter, setFamilyFilter] = useState<Set<DocFamily>>(new Set());
  // A tapped doc opens either its detail (accessible) or the member-only upsell
  // (a guest tapping a locked doc) — one surface at a time over the list.
  const [active, setActive] = useState<{ kind: "detail" | "locked"; doc: Doc } | null>(null);
  // Which family sections are expanded past their preview. Reset on any filter
  // change so a fresh result set always opens collapsed.
  const [expandedSections, setExpandedSections] = useState<Set<DocFamily>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Guests see locks on member-only docs; members/admins can open everything.
  const canReadMemberContent = canAccess(role, "member-only");

  // Tell the shell when a sub-view (detail or upsell) is open so it can hide
  // the floating avatar (main pages only).
  useEffect(() => {
    onDetailChange?.(active !== null);
  }, [active, onDetailChange]);

  // Re-tapping the active Library tab pops an open document / upsell back to the
  // list. Skip the mount run so only genuine re-taps trigger it.
  const isFirstResetRun = useRef(true);
  useEffect(() => {
    if (isFirstResetRun.current) {
      isFirstResetRun.current = false;
      return;
    }
    setActive(null);
  }, [resetSignal]);

  const openDoc = (doc: Doc) => {
    // A guest tapping a member-only doc gets the upsell, not a dead end (the
    // access-model rule: gated content redirects to login + apply, never a 403).
    const locked = doc.memberOnly && !canReadMemberContent;
    setActive({ kind: locked ? "locked" : "detail", doc });
    onDocPress?.(doc); // preserve any external hook (analytics, etc.)
  };

  const scrollToTop = (animated = true) => {
    scrollRef.current?.scrollTo({ y: 0, animated: animated && !reducedMotion });
  };

  // Search + family + status filters narrow the corpus (kept in the site's
  // order). Within a facet the selected chips are OR'd; the facets are AND'd
  // (e.g. "Maintenance" AND "Saved offline").
  const filtered = useMemo<Doc[]>(() => {
    const q = query.trim().toLowerCase();
    const hasStatusFilter = statusFilter.size > 0;
    const hasFamilyFilter = familyFilter.size > 0;
    return DOCS.filter((d) => {
      if (hasFamilyFilter && !familyFilter.has(d.family)) return false;
      const savedKey: SavedFilterKey = d.saved ? "saved" : "not-saved";
      if (hasStatusFilter && !statusFilter.has(savedKey)) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    });
  }, [query, statusFilter, familyFilter]);

  // Any change to the result set collapses every section back to its preview.
  useEffect(() => {
    setExpandedSections(new Set());
  }, [query, statusFilter, familyFilter]);

  // Group the filtered corpus into family sections, in the canonical family
  // order, dropping families with no matches (so search/filter narrows the
  // section list too). Each section carries its full match list; the preview
  // cap is applied at render time.
  const sections = useMemo(
    () =>
      DOC_FAMILIES.map((family) => ({
        family,
        docs: filtered.filter((d) => d.family === family),
      })).filter((s) => s.docs.length > 0),
    [filtered],
  );

  const toggleSection = (family: DocFamily) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = y > BACK_TO_TOP_AT;
    if (next !== showBackToTop) setShowBackToTop(next);
  };

  const activeFilterCount = statusFilter.size + familyFilter.size;
  const cachedCount = useMemo(() => DOCS.filter((d) => d.saved).length, []);

  // Toggle a key in/out of a Set-valued filter (immutably).
  const toggleIn = <K,>(set: React.Dispatch<React.SetStateAction<Set<K>>>) => (key: K) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // The two facets stacked in the filter sheet: Family (FFIE taxonomy) then
  // Offline (device cache state). Keys are strings at the sheet boundary; the
  // typed Sets live here. Family leads — it's the primary way to browse.
  const filterSections: FilterSection[] = [
    {
      label: "Family",
      options: FAMILY_OPTIONS,
      selected: familyFilter as Set<string>,
      onToggle: toggleIn(setFamilyFilter) as (key: string) => void,
    },
    {
      label: "Offline",
      options: FILTER_OPTIONS,
      selected: statusFilter as Set<string>,
      onToggle: toggleIn(setStatusFilter) as (key: string) => void,
    },
  ];

  if (active?.kind === "detail") {
    return (
      <DocDetailScreen
        doc={active.doc}
        themeName={themeName}
        onBack={() => setActive(null)}
      />
    );
  }

  if (active?.kind === "locked") {
    // Guest tapped a member-only doc → the shared upsell. Its primary CTA
    // (onApply) is pointed at the federation directory (map + departmental
    // list) by the guest shell; the secondary CTA opens sign-in.
    return (
      <MemberOnlyPrompt
        themeName={themeName}
        documentTitle={active.doc.title}
        onBack={() => setActive(null)}
        onApply={onApply}
        onSignIn={onSignIn}
      />
    );
  }

  return (
    // Page title now lives in the shared AppHeader (shell); content renders
    // directly beneath it.
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* iOS-style rounded search field + inline filter button */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            marginBottom: 14,
            flexDirection: "row",
            alignItems: "center",
            columnGap: 10,
          }}
        >
          {/* The whole bar is a Pressable that focuses the input, so taps on the
              icon / padding (not just the narrow text region) bring up the
              keyboard. */}
          <Pressable
            onPress={() => searchRef.current?.focus()}
            style={{
              flex: 1,
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
              ref={searchRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search documents"
              placeholderTextColor={t.text.placeholder}
              style={{ flex: 1, alignSelf: "stretch", color: t.text.body, fontSize: 16 }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search a document"
            />
            {query.length > 0 ? (
              <SearchClearButton themeName={themeName} onPress={() => setQuery("")} />
            ) : null}
          </Pressable>

          <FilterButton
            themeName={themeName}
            activeCount={activeFilterCount}
            onPress={() => setFilterOpen(true)}
            accessibilityLabel={
              activeFilterCount > 0
                ? `Filter documents, ${activeFilterCount} active`
                : "Filter documents"
            }
          />
        </View>

        {/* Result count — mirrors the FFIE site's "335 documents" line. */}
        <Text
          accessibilityRole="header"
          style={{
            paddingHorizontal: GUTTER + 4,
            marginBottom: 14,
            color: t.text.muted,
            fontSize: 13,
            fontFamily: ralewayFamily("500"),
            fontWeight: "500",
          }}
        >
          {filtered.length} document{filtered.length === 1 ? "" : "s"}
        </Text>

        {/* Offline banner — P2 no-dead-end */}
        {offline ? (
          <View
            accessible
            accessibilityRole="alert"
            style={{
              marginHorizontal: GUTTER,
              marginBottom: 20,
              padding: 12,
              borderRadius: primitives.radii.lg,
              backgroundColor: themeName === "sunlight" ? t.surface.default : t.feedback.subtle.offline.bg,
              borderWidth: themeName === "sunlight" ? 2 : 0,
              borderColor: themeName === "sunlight" ? t.feedback.subtle.offline.border : "transparent",
              flexDirection: "row",
              columnGap: 10,
              alignItems: "flex-start",
            }}
          >
            <WifiOff size={18} color={t.feedback.subtle.offline.fg} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.feedback.subtle.offline.fg, fontWeight: "600", fontSize: 13 }}>
                Offline
              </Text>
              <Text style={{ color: t.feedback.subtle.offline.fg, fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                {cachedCount} documents available in cache. Search still works.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Document list — one inset section card per FFIE family, each headed
            by its name + a live count badge (the client's sectioned layout). */}
        {sections.length === 0 ? (
          <View style={{ padding: 48, alignItems: "center" }}>
            <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>No documents.</Text>
            <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
              Try "Notec", "Mesh" or "electrification".
            </Text>
          </View>
        ) : (
          sections.map((section) => {
            const isExpanded = expandedSections.has(section.family);
            const visible = isExpanded
              ? section.docs
              : section.docs.slice(0, SECTION_PREVIEW);
            const hasToggle = section.docs.length > SECTION_PREVIEW;
            return (
              <InsetGroup key={section.family} themeName={themeName}>
                <SectionHeaderRow
                  icon={FAMILY_ICON[section.family]}
                  title={section.family}
                  count={section.docs.length}
                  themeName={themeName}
                />
                {visible.map((doc, i) => {
                  const locked = doc.memberOnly && !canReadMemberContent;
                  return (
                    <InsetRow
                      key={doc.id}
                      leading={<DocThumbnail doc={doc} />}
                      leadingWidth={THUMB_WIDTH}
                      title={doc.title}
                      titleNumberOfLines={2}
                      subtitle={docSubtitle(doc)}
                      themeName={themeName}
                      isLast={!hasToggle && i === visible.length - 1}
                      showChevron={false}
                      accessibilityLabel={`${doc.title}. ${docSubtitle(doc)}. ${
                        locked
                          ? "Members only"
                          : doc.saved
                            ? "Saved offline"
                            : "Not saved offline"
                      }`}
                      onPress={() => openDoc(doc)}
                      trailing={
                        locked ? (
                          <LockTag themeName={themeName} small />
                        ) : (
                          <SavedBadge saved={doc.saved} size="sm" themeName={themeName} />
                        )
                      }
                    />
                  );
                })}
                {hasToggle ? (
                  <SectionToggleRow
                    expanded={isExpanded}
                    total={section.docs.length}
                    themeName={themeName}
                    onPress={() => toggleSection(section.family)}
                  />
                ) : null}
              </InsetGroup>
            );
          })
        )}
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

      <FilterSheet
        visible={filterOpen}
        themeName={themeName}
        sections={filterSections}
        resultCount={filtered.length}
        onReset={() => {
          setFamilyFilter(new Set());
          setStatusFilter(new Set());
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}
