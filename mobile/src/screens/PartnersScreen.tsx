// Partners tab — the full FFIE partner roster from the federation's
// "Nos partenaires" page, in the same data-driven layout as the Doc Library:
// large title, rounded search field + filter button, and a grouped inset list
// capped to a short view with "Show more". The directory content lives in
// data/partners.ts; this screen searches, filters, and renders it.
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

import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
} from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { FilterButton, FilterSheet } from "@/components/ui/FilterControls";
import * as WebBrowser from "expo-web-browser";
import {
  PARTNERS,
  PARTNER_CATEGORY_LABELS,
  type Partner,
  type PartnerCategory,
} from "@/data/partners";
import { ralewayFamily } from "@/theme/fonts";
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
      >
        <LargeTitleHeader title="Partenaires" themeName={themeName} />

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
      </ScrollView>

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
