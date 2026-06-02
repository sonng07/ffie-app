// FFIE — Doc Library Screen, styled to iOS HIG (large title, rounded search,
// grouped inset list) via the shared iOS primitives (components/ui/ios).
//
// Design contracts still honored from the original spec:
//   1. Search field at top (P3) — no autofocus (keyboard-on-mount is rude).
//   2. Rows ≥48pt (P1) — InsetRow floors minHeight at 48.
//   3. Offline banner when offline=true (P2).
//   4. Each row carries a SavedBadge (saved / not saved — icon+label, P2+P4)
//      accessory — not colour alone.
//   5. Theme + density supplied by caller.
//   6. Mobile gutter = 16.
//
// Note: this preview uses a ScrollView (10 mock docs). At production scale,
// swap to a SectionList to keep the grouped-inset look while virtualizing.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, WifiOff } from "lucide-react-native";
import { primitives, themes, type ThemeName, type DensityMode } from "@tokens";
import { SavedBadge } from "@/components/ui/SavedBadge";
import { FilterButton, FilterSheet } from "@/components/ui/FilterControls";
import { DOCS, DOC_FAMILIES, type Doc, type DocFamily } from "@/data/docs";
import { DocDetailScreen } from "@/screens/DocDetailScreen";
import {
  GUTTER,
  InsetGroup,
  InsetRow,
  LargeTitleHeader,
  SearchClearButton,
  useGroupedColors,
} from "@/components/ui/ios";

// The library's offline filter is two-state, matching the doc's `saved` flag
// (FFIE-DOC-03 / P2): "show me what's on this device" vs "what I still need to
// download". Nothing richer is in scope.
type SavedFilterKey = "saved" | "not-saved";

const FILTER_OPTIONS: { key: SavedFilterKey; label: string }[] = [
  { key: "saved", label: "Enregistrés hors ligne" },
  { key: "not-saved", label: "Non enregistrés" },
];

// Thumbnail visuals — a 50×66 mock that approximates how a PDF first page
// renders at small size: title block at top, subtitle line, then body
// paragraphs. NOT an icon — it should pass for a tiny rendered page.
//
// Real PDF first-page rendering needs a native bridge (react-native-pdf-
// thumbnail, react-native-pdf, or a server-side prerender). When the FFIE
// backend ships PDFs + thumbnail URIs, swap this whole component for
// `<Image source={{ uri: doc.thumbnailUri }} />` at the same dimensions.
const THUMB_WIDTH = 50;
const THUMB_HEIGHT = 66;

type ThumbTone = "navy" | "teal" | "amber" | "slate";

const TONES: Record<ThumbTone, string> = {
  navy: "#222D5D",
  teal: "#0094A9",
  amber: "#B45309",
  slate: "#4B5563",
};

// Body-text grays for the paragraph lines. Two shades so paragraphs read
// as paragraphs (denser/lighter rows of "text") rather than uniform bars.
const BODY_DARK = "#C2C8D2";
const BODY_LIGHT = "#DDE1E8";
const SUBTITLE = "#9AA2B1";

// Thumbnail colour is keyed to the document's FFIE family, so every doc in a
// section shares an accent and the colour carries real meaning (it's never the
// ONLY signal — the family header and subtitle category say it in words, P4).
const FAMILY_TONE: Record<DocFamily, ThumbTone> = {
  "Courants forts": "navy",
  "Sûreté / Sécurité incendie": "amber",
  "Bâtiments connectés": "teal",
  "Performance énergétique": "teal",
  "Vie de l'entreprise": "slate",
  Maintenance: "slate",
  Communication: "navy",
};

function toneFor(doc: Doc): ThumbTone {
  return FAMILY_TONE[doc.family];
}

function DocThumbnail({ tone }: { tone: ThumbTone }) {
  const titleColor = TONES[tone];
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
        // Subtle page-lift shadow — sells "paper card" without distracting.
        shadowColor: "#000",
        shadowOpacity: 0.10,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View style={{ paddingTop: 5, paddingHorizontal: 5 }}>
        {/* Title block — short, thick, in tone color. Reads as the H1. */}
        <View style={{ height: 4, backgroundColor: titleColor, width: "80%" }} />
        {/* Subtitle / standard number line */}
        <View style={{ height: 1.5, backgroundColor: SUBTITLE, width: "55%", marginTop: 3 }} />

        {/* Paragraph 1 — 4 body lines */}
        <View style={{ marginTop: 5, rowGap: 1.5 }}>
          <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "92%" }} />
          <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "88%" }} />
          <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "90%" }} />
          <View style={{ height: 1.5, backgroundColor: BODY_DARK, width: "62%" }} />
        </View>

        {/* Paragraph 2 — 4 slightly lighter body lines */}
        <View style={{ marginTop: 4, rowGap: 1.5 }}>
          <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "85%" }} />
          <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "92%" }} />
          <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "78%" }} />
          <View style={{ height: 1.5, backgroundColor: BODY_LIGHT, width: "50%" }} />
        </View>
      </View>
    </View>
  );
}

type Props = {
  themeName: ThemeName;
  density: DensityMode;
  offline: boolean;
  onDocPress?: (doc: Doc) => void;
  /** Incremented by the shell when the Library tab is re-tapped while already
   *  active. Pops an open document back to the list. */
  resetSignal?: number;
  /** Fired with `true` when a document detail is open, `false` back on the
   *  list. The shell uses it to hide the floating avatar on detail pages. */
  onDetailChange?: (isDetail: boolean) => void;
};

export function DocLibraryScreen({ themeName, density, offline, onDocPress, resetSignal, onDetailChange }: Props) {
  void density; // grouped rows own their rhythm now
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<SavedFilterKey>>(new Set());
  const [selected, setSelected] = useState<Doc | null>(null);

  // Tell the shell when a document detail is open so it can hide the floating
  // avatar (main pages only).
  useEffect(() => {
    onDetailChange?.(selected !== null);
  }, [selected, onDetailChange]);

  // Re-tapping the active Library tab pops an open document back to the list.
  // Skip the mount run so only genuine re-taps trigger it.
  const isFirstResetRun = useRef(true);
  useEffect(() => {
    if (isFirstResetRun.current) {
      isFirstResetRun.current = false;
      return;
    }
    setSelected(null);
  }, [resetSignal]);

  const openDoc = (doc: Doc) => {
    setSelected(doc);
    onDocPress?.(doc); // preserve any external hook (analytics, etc.)
  };

  const filtered = useMemo<Doc[]>(() => {
    const q = query.trim().toLowerCase();
    const hasStatusFilter = statusFilter.size > 0;
    return DOCS.filter((d) => {
      const savedKey: SavedFilterKey = d.saved ? "saved" : "not-saved";
      if (hasStatusFilter && !statusFilter.has(savedKey)) return false;
      if (!q) return true;
      return d.title.toLowerCase().includes(q) || d.subtitle.toLowerCase().includes(q);
    });
  }, [query, statusFilter]);

  const activeFilterCount = statusFilter.size;

  const cachedCount = DOCS.filter((d) => d.saved).length;

  if (selected) {
    return (
      <DocDetailScreen
        doc={selected}
        themeName={themeName}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitleHeader title="Bibliothèque" themeName={themeName} />

        {/* iOS-style rounded search field + inline filter button */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            marginBottom: 20,
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
              placeholder="Rechercher des documents"
              placeholderTextColor={t.text.placeholder}
              style={{ flex: 1, color: t.text.body, fontSize: 16 }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Rechercher un document"
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
                ? `Filtrer les documents, ${activeFilterCount} actif(s)`
                : "Filtrer les documents"
            }
          />
        </View>

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
                Hors ligne
              </Text>
              <Text style={{ color: t.feedback.subtle.offline.fg, fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                {cachedCount} documents disponibles en cache. La recherche fonctionne toujours.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Grouped inset doc list */}
        {filtered.length === 0 ? (
          <View style={{ padding: 48, alignItems: "center" }}>
            <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>Aucun document.</Text>
            <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
              Essayez « Notec », « Mesh » ou « électrification ».
            </Text>
          </View>
        ) : (
          // Structured by FFIE family (FFIE-DOC-01): one grouped section per
          // family, in canonical order, empty families omitted. Search + the
          // status filter narrow `filtered` first, then we section the result.
          DOC_FAMILIES.map((family) => {
            const docs = filtered.filter((d) => d.family === family);
            if (docs.length === 0) return null;
            return (
              <InsetGroup key={family} header={family} themeName={themeName}>
                {docs.map((doc, i) => (
                  <InsetRow
                    key={doc.id}
                    leading={<DocThumbnail tone={toneFor(doc)} />}
                    leadingWidth={THUMB_WIDTH}
                    title={doc.title}
                    titleNumberOfLines={2}
                    subtitle={doc.subtitle}
                    themeName={themeName}
                    isLast={i === docs.length - 1}
                    showChevron={false}
                    accessibilityLabel={`${doc.title}. ${doc.category}. ${
                      doc.saved ? "Enregistré hors ligne" : "Non enregistré hors ligne"
                    }`}
                    onPress={() => openDoc(doc)}
                    trailing={<SavedBadge saved={doc.saved} size="sm" themeName={themeName} />}
                  />
                ))}
              </InsetGroup>
            );
          })
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        themeName={themeName}
        sectionLabel="Hors ligne"
        options={FILTER_OPTIONS}
        selected={statusFilter}
        resultCount={filtered.length}
        onToggle={(key) => {
          setStatusFilter((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        }}
        onReset={() => setStatusFilter(new Set())}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
