// Trades tab — the public discovery surface for guests (Karim + Léa).
//
// A segmented control under the large title splits the tab into three segments,
// mirroring the News / Partners tabs' toggle:
//   • Métiers      — the careers content (the original Discover screen, below).
//   • Vidéos       — multimedia content (FFIE-VIDEO-01, 🔵 Phase 1). The player
//                    and content aren't wired up yet, so this is an honest
//                    "coming" shell for now — it's in scope, just not built.
//   • Calculateurs — technical calculation tools (FFIE-CALC-01/02, 🟢 Phase 2,
//                    and member-only). Deferred to a later release: a blank
//                    placeholder that says so explicitly.
//
// The "Métiers" segment (TradesBody) mirrors the client careers page
// (ffie.fr/les-metiers-de-lelectricite/metiers-et-formations) section-by-section:
//   1. The client's intro paragraph (verbatim).
//   2. Explore the field — the 5 domains as tappable rows opening a detail sheet.
//   3. Two feature cards — "7 Reasons…" and the "kit professions".
//   4. "Professions of tomorrow" — heading + intro + a 2-column TRAINING grid
//      + a "See more training" button.
//
// Scope: Métiers is FFIE-TRADES-01 (career profiles + educational content). All
// imagery is placeholder (see data/trades.ts); links open externally (P6).

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Calculator, ChevronRight, PlayCircle, X, type LucideIcon } from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, useNavigationContainerRef, StackActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, LargeTitleHeader, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TrainingDetailScreen } from "./TrainingDetailScreen";
import {
  DOMAINS,
  FEATURES,
  TRADE_INTRO,
  TRAINING_HEADING,
  TRAINING_INTRO,
  TRAININGS,
  type Domain,
  type Feature,
  type Training,
} from "@/data/trades";

// The Trades tab is a self-contained native stack (Feed → Formation), exactly
// like the News tab: tapping a formation card pushes the reader, which gets the
// platform back affordances for free (iOS left-edge swipe, Android system back).
// Routes carry only the formation id — react-navigation params must be
// serialisable, so the reader resolves the Training from TRAININGS by id.
type TradesStackParamList = {
  Feed: undefined;
  Formation: { id: string };
};

const Stack = createNativeStackNavigator<TradesStackParamList>();

const GRID_GAP = 14;

// The three segments inside the Trades tab. "trades" is the careers content;
// "videos" and "calculators" are placeholder shells (see header comment for the
// phase / scope of each). A segmented control at the top toggles between them,
// like the News and Partners tabs.
type TradesTab = "trades" | "videos" | "calculators";

// Large-title text per segment (the header re-titles like the News tab does).
const TAB_TITLES: Record<TradesTab, string> = {
  trades: "Métiers",
  videos: "Vidéos",
  calculators: "Calculateurs",
};

export function DiscoverScreen({
  themeName = "light",
  resetSignal,
}: {
  themeName?: ThemeName;
  /** Incremented by the shell when the Trades tab is re-tapped while already
   *  active. We use it to pop the stack back to the grid from an open reader. */
  resetSignal?: number;
}) {
  const reducedMotion = useReducedMotion();
  const navRef = useNavigationContainerRef<TradesStackParamList>();

  // Re-tapping the active Trades tab pops the formation reader back to the grid.
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
              onTrainingPress={(id) => navigation.navigate("Formation", { id })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Formation">
          {({ navigation, route }) => (
            <FormationRoute
              id={route.params.id}
              themeName={themeName}
              onBack={() => navigation.goBack()}
              // Prev/next replaces the current formation: back (button or swipe)
              // still returns to the grid and the reader remounts at the top.
              onNavigateId={(id) => navigation.replace("Formation", { id })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// FormationRoute — resolves the route's training id into the reader and computes
// the prev/next neighbours in grid order (prev is null on the first formation,
// next on the last → the in-reader nav buttons disable there).
function FormationRoute({
  id,
  themeName,
  onBack,
  onNavigateId,
}: {
  id: string;
  themeName: ThemeName;
  onBack: () => void;
  onNavigateId: (id: string) => void;
}) {
  const idx = TRAININGS.findIndex((tr) => tr.id === id);
  const training = idx >= 0 ? TRAININGS[idx] : null;

  // Defensive: an unknown id (shouldn't happen) just pops back to the grid.
  useEffect(() => {
    if (!training) onBack();
  }, [training, onBack]);
  if (!training) return null;

  const prev = idx > 0 ? TRAININGS[idx - 1] : null;
  const next = idx < TRAININGS.length - 1 ? TRAININGS[idx + 1] : null;

  return (
    <TrainingDetailScreen
      training={training}
      themeName={themeName}
      onBack={onBack}
      prev={prev}
      next={next}
      onNavigate={(tr) => onNavigateId(tr.id)}
    />
  );
}

// DiscoverFeed — the Trades tab feed itself: the segmented control (Métiers /
// Vidéos / Calculateurs) and, on the Métiers segment, the careers content. Owns
// the active-segment state; stays mounted beneath a pushed formation reader
// (native stack), so scroll and segment survive the round-trip.
function DiscoverFeed({
  themeName = "light",
  onTrainingPress,
}: {
  themeName?: ThemeName;
  onTrainingPress?: (id: string) => void;
}) {
  const c = useGroupedColors(themeName);

  // Active segment. Switching to videos/calculators reveals a "coming" shell
  // (neither feature is built yet — see ComingSoonView).
  const [tab, setTab] = useState<TradesTab>("trades");

  // Switching segment starts fresh at the top, matching News / Partners.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitleHeader title={TAB_TITLES[tab]} themeName={themeName} />

        {/* Segment toggle. Sits under the large title like an iOS segmented
            control; Vidéos / Calculateurs reveal a "coming" shell (neither
            feature is built yet). */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 4 }}>
          <SegmentedControl
            themeName={themeName}
            value={tab}
            options={[
              { key: "trades", label: "Métiers" },
              { key: "videos", label: "Vidéos" },
              { key: "calculators", label: "Calculateurs" },
            ]}
            onChange={setTab}
          />
        </View>

        {tab === "videos" ? (
          // FFIE-VIDEO-01 (🔵 Phase 1): in scope, player/content not wired yet.
          <ComingSoonView
            themeName={themeName}
            icon={PlayCircle}
            title="Vidéos bientôt disponibles"
            body="Le lecteur vidéo intégré et les contenus multimédias de la fédération arriveront ici — toujours avec sous-titres."
            badge="Phase 1 · en cours"
          />
        ) : tab === "calculators" ? (
          // FFIE-CALC-01/02 (🟢 Phase 2, réservé aux adhérents): deferred.
          <ComingSoonView
            themeName={themeName}
            icon={Calculator}
            title="Calculateurs techniques"
            body="Les outils de calcul métier (puissance, dimensionnement, normes) seront réservés aux adhérents dans une prochaine version."
            badge="Phase 2 · prochaine version"
          />
        ) : (
          <TradesBody themeName={themeName} onTrainingPress={onTrainingPress} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// TradesBody — the "Métiers" segment: the original careers content, section by
// section (intro, domain rows, feature cards, training grid). Owns the domain
// detail modal's open state.
// ---------------------------------------------------------------------------
function TradesBody({
  themeName,
  onTrainingPress,
}: {
  themeName: ThemeName;
  onTrainingPress?: (id: string) => void;
}) {
  const t = themes[themeName];
  const { width: screenW } = useWindowDimensions();

  // The domain whose detail modal is open (null = closed). Tapping a row opens
  // the full-screen sheet (client page's expanded view); the X closes it.
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);

  // Two equal training columns inset by the gutter, with GRID_GAP between.
  const colW = (screenW - GUTTER * 2 - GRID_GAP) / 2;

  return (
    <>
      {/* 1. Client intro. */}
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 2 }}>
        <Text style={{ color: t.text.muted, fontSize: 15, lineHeight: 22 }}>{TRADE_INTRO}</Text>
      </View>

      {/* 2. Explore the field — domain rows that open a detail modal. */}
      <View style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />
        {DOMAINS.map((domain) => (
          <DomainRow
            key={domain.id}
            domain={domain}
            themeName={themeName}
            onPress={() => setActiveDomain(domain)}
          />
        ))}
      </View>

      {/* 3. Feature cards — "7 Reasons…" and the kit. */}
      <View style={{ paddingHorizontal: GUTTER, marginTop: 24, rowGap: 14 }}>
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} themeName={themeName} />
        ))}
      </View>

      {/* 4. Professions of tomorrow — heading + intro + training grid. */}
      <View style={{ paddingHorizontal: GUTTER, marginTop: 34 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: t.text.body,
            fontSize: 21,
            lineHeight: 27,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.4,
          }}
        >
          {TRAINING_HEADING}
        </Text>
        <Text style={{ color: t.text.muted, fontSize: 14, lineHeight: 21, marginTop: 12 }}>
          {TRAINING_INTRO}
        </Text>
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
        {TRAININGS.map((training) => (
          <TrainingCard
            key={training.id}
            training={training}
            width={colW}
            themeName={themeName}
            onPress={() => onTrainingPress?.(training.id)}
          />
        ))}
      </View>

      <View style={{ alignItems: "center", marginTop: 22 }}>
        <SeeMoreButton themeName={themeName} />
      </View>

      {/* Domain detail — full-screen sheet, opened from a domain row. */}
      <DomainDetailModal
        domain={activeDomain}
        themeName={themeName}
        onClose={() => setActiveDomain(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// ComingSoonView — the blank "coming" shell shared by the Vidéos and
// Calculateurs segments. Centered icon in a tinted circle, a title, an honest
// one-line explanation, and a phase badge that tells the user exactly when to
// expect it. No motion — purely a static empty state.
// ---------------------------------------------------------------------------
function ComingSoonView({
  themeName,
  icon: Icon,
  title,
  body,
  badge,
}: {
  themeName: ThemeName;
  icon: LucideIcon;
  title: string;
  body: string;
  badge: string;
}) {
  const t = themes[themeName];
  return (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: 72, alignItems: "center" }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: t.surface.subtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={32} color={t.brand.accent} strokeWidth={1.75} />
      </View>

      <Text
        accessibilityRole="header"
        style={{
          color: t.text.body,
          fontSize: 21,
          lineHeight: 27,
          fontFamily: displayFamily("700"),
          fontWeight: "700",
          letterSpacing: -0.4,
          textAlign: "center",
          marginTop: 20,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: t.text.muted,
          fontSize: 14.5,
          lineHeight: 22,
          textAlign: "center",
          marginTop: 10,
          maxWidth: 320,
        }}
      >
        {body}
      </Text>

      {/* Phase badge — tells the user which release to expect this in. */}
      <View
        style={{
          marginTop: 18,
          backgroundColor: t.surface.subtle,
          borderWidth: 1,
          borderColor: t.border.subtle,
          borderRadius: primitives.radii.full,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <Text
          style={{
            color: t.brand.accent,
            fontSize: 12,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {badge}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DomainRow — one specialization domain as a tappable row: a title and a
// chevron disclosure. Tapping opens the full-screen detail modal. Each row
// carries a bottom hairline (the client page's list look).
// ---------------------------------------------------------------------------
function DomainRow({
  domain,
  themeName,
  onPress,
}: {
  domain: Domain;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={domain.title}
        accessibilityHint="Ouvre le détail du domaine"
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          columnGap: 12,
          minHeight: 52,
          paddingVertical: 16,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            flex: 1,
            color: t.text.body,
            fontSize: 17,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
            letterSpacing: -0.2,
          }}
        >
          {domain.title}
        </Text>
        <ChevronRight size={22} color={t.brand.accent} />
      </Pressable>

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border.default }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// DomainDetailModal — the full-screen sheet shown when a domain row is tapped.
// Mirrors the client page's expanded view: a hero photo, a definition, an
// accent call-to-action heading, body paragraphs (with bold key terms), and a
// "Mots-clés" box. Domains without `detail` fall back to blurb + tags.
//
// Reduced motion (P5): the sheet slides in by default, but snaps in with no
// transition when the OS "Reduce Motion" setting is on — vestibular safety.
// ---------------------------------------------------------------------------
function DomainDetailModal({
  domain,
  themeName,
  onClose,
}: {
  domain: Domain | null;
  themeName: ThemeName;
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const reduceMotion = useReducedMotion();
  const detail = domain?.detail;

  return (
    <Modal
      visible={domain != null}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
        {/* Close affordance — top-trailing X (≥44pt touch target). */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={26} color={t.text.body} />
          </Pressable>
        </View>

        {domain ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {detail?.image ? (
              <View style={{ paddingHorizontal: GUTTER }}>
                <RemoteImage
                  source={detail.image.source}
                  seed={detail.image.seed}
                  uri={detail.image.imageUrl}
                  width="100%"
                  aspectRatio={3 / 2}
                  pixelWidth={900}
                  pixelHeight={600}
                  radius={primitives.radii.lg}
                  themeName={themeName}
                  accessibilityLabel={detail.image.alt}
                />
              </View>
            ) : null}

            <View style={{ paddingHorizontal: GUTTER, paddingTop: detail?.image ? 20 : 8 }}>
              {/* Domain title — large display heading. */}
              <Text
                accessibilityRole="header"
                style={{
                  color: t.text.body,
                  fontSize: 28,
                  lineHeight: 34,
                  fontFamily: displayFamily("700"),
                  fontWeight: "700",
                  letterSpacing: -0.6,
                }}
              >
                {domain.title}
              </Text>

              {/* Definition / lead — falls back to the blurb. */}
              <Text style={{ color: t.text.muted, fontSize: 15, lineHeight: 23, marginTop: 12 }}>
                {detail?.intro ?? domain.blurb}
              </Text>

              {detail ? (
                <>
                  {/* Accent call-to-action sub-heading. */}
                  <Text
                    accessibilityRole="header"
                    style={{
                      color: t.brand.accent,
                      fontSize: 22,
                      lineHeight: 28,
                      fontFamily: displayFamily("700"),
                      fontWeight: "700",
                      letterSpacing: -0.4,
                      marginTop: 24,
                    }}
                  >
                    {detail.heading}
                  </Text>

                  {/* Body paragraphs with bold key terms. */}
                  {detail.body.map((para, i) => (
                    <RichParagraph key={i} text={para} themeName={themeName} style={{ marginTop: 14 }} />
                  ))}

                  {/* Mots-clés box. */}
                  <View
                    style={{
                      marginTop: 24,
                      backgroundColor: c.cardBg,
                      borderWidth: c.cardBorder ? 1 : 0,
                      borderColor: c.cardBorder,
                      borderRadius: primitives.radii.lg,
                      padding: 18,
                    }}
                  >
                    <Text
                      style={{
                        color: t.text.body,
                        fontSize: 13,
                        fontFamily: ralewayFamily("700"),
                        fontWeight: "700",
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      {detail.keywords.title}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                      {detail.keywords.terms.map((term) => (
                        <Tag key={term} label={term} themeName={themeName} />
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                // No rich content yet — show the sub-area tags as the summary.
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 18 }}>
                  {domain.tags.map((tag) => (
                    <Tag key={tag} label={tag} themeName={themeName} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// RichParagraph — body text where `**term**` spans render bold. A lightweight
// inline parser (no markdown dependency) so key vocabulary can be emphasised
// straight from the data file.
function RichParagraph({
  text,
  themeName,
  style,
}: {
  text: string;
  themeName: ThemeName;
  style?: object;
}) {
  const t = themes[themeName];
  // Split on the bold delimiters; odd-indexed segments are the bold spans.
  const segments = text.split("**");
  return (
    <Text style={[{ color: t.text.muted, fontSize: 15, lineHeight: 23 }, style]}>
      {segments.map((seg, i) =>
        i % 2 === 1 ? (
          <Text
            key={i}
            style={{ color: t.text.body, fontFamily: ralewayFamily("700"), fontWeight: "700" }}
          >
            {seg}
          </Text>
        ) : (
          seg
        ),
      )}
    </Text>
  );
}

// Tag — a small muted sub-area pill.
function Tag({ label, themeName }: { label: string; themeName: ThemeName }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  return (
    <View
      style={{
        backgroundColor: c.cardBg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        borderRadius: primitives.radii.full,
        paddingHorizontal: 9,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 11, color: t.text.muted, fontFamily: ralewayFamily("600"), fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

// LearnMore — the accent "Learn more →" affordance shared by the cards.
function LearnMore({ themeName, label = "En savoir plus" }: { themeName: ThemeName; label?: string }) {
  const t = themes[themeName];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
      <Text style={{ color: t.brand.accent, fontSize: 13.5, fontFamily: ralewayFamily("700"), fontWeight: "700" }}>
        {label}
      </Text>
      <ArrowRight size={16} color={t.brand.accent} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// FeatureCard — a full-width content card (client: "7 Reasons…", the kit):
// title with an accent underline, blurb, and a "Learn more →" link.
// ---------------------------------------------------------------------------
function FeatureCard({ feature, themeName }: { feature: Feature; themeName: ThemeName }) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  return (
    <View
      accessibilityLabel={`${feature.title}. ${feature.blurb}.`}
      style={{
        backgroundColor: c.cardBg,
        borderRadius: primitives.radii.lg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        padding: 18,
      }}
    >
      <Text
        style={{
          color: t.text.body,
          fontSize: 17,
          fontFamily: ralewayFamily("700"),
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {feature.title}
      </Text>
      <View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: t.brand.accent, marginTop: 8 }} />
      <Text style={{ color: t.text.muted, fontSize: 14, lineHeight: 21, marginTop: 12 }}>
        {feature.blurb}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TrainingCard — a 2-up grid card: image, title, short blurb, "Learn more →".
//
// A card is tappable only once it has reader content (`detail`). Formations
// FFIE hasn't documented stay NON-interactive: no press affordance, no "En
// savoir plus", slightly muted — they read as informational, not a dead link.
// ---------------------------------------------------------------------------
function TrainingCard({
  training,
  width,
  themeName,
  onPress,
}: {
  training: Training;
  width: number;
  themeName: ThemeName;
  onPress?: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const tappable = !!training.detail && !!onPress;

  // Shared inner content (image + text). The "En savoir plus" affordance only
  // shows on tappable cards.
  const inner = (
    <>
      <RemoteImage
        seed={training.seed}
        uri={training.imageUrl}
        width="100%"
        aspectRatio={4 / 3}
        pixelWidth={600}
        pixelHeight={450}
        themeName={themeName}
        accessibilityLabel={training.alt}
      />
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
          {training.title}
        </Text>
        <Text style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 18, marginTop: 6 }}>
          {training.blurb}
        </Text>
        {tappable ? (
          <View style={{ marginTop: 12 }}>
            <LearnMore themeName={themeName} label="En savoir plus" />
          </View>
        ) : null}
      </View>
    </>
  );

  // Non-tappable card — a plain View, slightly faded, no button semantics.
  if (!tappable) {
    return (
      <View
        accessibilityLabel={`${training.title}. ${training.blurb}`}
        style={{
          width,
          backgroundColor: c.cardBg,
          borderRadius: primitives.radii.lg,
          borderWidth: c.cardBorder ? 1 : 0,
          borderColor: c.cardBorder,
          overflow: "hidden",
          opacity: 0.6,
        }}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${training.title}. ${training.blurb}`}
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
      {inner}
    </Pressable>
  );
}

// SeeMoreButton — the outlined "See more training" button under the grid.
function SeeMoreButton({ themeName, onPress }: { themeName: ThemeName; onPress?: () => void }) {
  const t = themes[themeName];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voir plus de formations."
      onPress={onPress}
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
        Voir plus de formations
      </Text>
      <ArrowRight size={17} color={t.brand.accent} />
    </Pressable>
  );
}


