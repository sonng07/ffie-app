// ProfessionsView — the "Trades" segment of the Discover tab.
//
// "Discover the professions" (WBS Epic 4 / FFIE-TRADES-01), rebuilt strictly to
// the WBS acceptance criteria: a public section whose core is CAREER PROFILES,
// optionally layered with educational content (training paths) and presentation
// videos (real FFIE testimonial films). Public / no login (P6); video-led, not
// a wall of text (P7).
//
// Layout: a video hero → the role cards (tap → a full profile) → "how you'd get
// there" training paths → "voices from the field" real videos. Content + types
// live in data/professions.ts. Imagery is placeholder (RemoteImage seeds).

import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronRight, GraduationCap, Play, X } from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER } from "@/components/ui/ios";
import { CARD_SHADOW, useHomeColors } from "@/components/home/homeColors";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import { youtubeThumb } from "@/data/videos";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  HERO_IMAGE_KEYWORDS,
  HERO_IMAGE_LOCK,
  HERO_VIDEO_ID,
  PROFESSIONS,
  PROFESSIONS_INTRO,
  PROFESSION_VIDEOS,
  TRAINING_PATHS,
  tradeImage,
  type Profession,
} from "@/data/professions";

// Brand teal[700] — the app's accessible action teal (matches CTAs / pills).
const TEAL = primitives.colors.brand.teal[700];

export function ProfessionsView({ themeName = "light" }: { themeName?: ThemeName }) {
  // Which profile is open in the full-screen reader (null = closed), and which
  // video is playing (null = closed). Never both at once, so no nested modals.
  const [active, setActive] = useState<Profession | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  return (
    <>
      <Hero themeName={themeName} onWatch={() => setVideoId(HERO_VIDEO_ID)} />

      <Text style={{ color: themes[themeName].text.muted, fontSize: 15, lineHeight: 22, paddingHorizontal: GUTTER, paddingTop: 16 }}>
        {PROFESSIONS_INTRO}
      </Text>

      <SectionHeader title="Explore the roles" themeName={themeName} />
      <View style={{ paddingHorizontal: GUTTER, rowGap: 12 }}>
        {PROFESSIONS.map((p) => (
          <ProfessionCard key={p.id} profession={p} themeName={themeName} onPress={() => setActive(p)} />
        ))}
      </View>

      <SectionHeader title="How you'd get there" themeName={themeName} />
      <TrainingPaths themeName={themeName} />

      <SectionHeader title="Voices from the field" themeName={themeName} />
      <VideoRow themeName={themeName} onPlay={setVideoId} />

      <ProfessionDetailModal profession={active} themeName={themeName} onClose={() => setActive(null)} />
      <VideoModal youtubeId={videoId} themeName={themeName} onClose={() => setVideoId(null)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero — a full-bleed image card with a dark scrim, the section title, and a
// "Watch the film" pill (P7 — video-led). White text on the scrim clears AA for
// the large display sizes; the pill is a white chip with teal[700] label.
// ---------------------------------------------------------------------------
function Hero({ themeName, onWatch }: { themeName: ThemeName; onWatch: () => void }) {
  return (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
      {/* Outer view casts the shadow; the inner view clips the image to the
          radius — a shadow + overflow:hidden on one view clips the shadow. */}
      <View style={{ borderRadius: primitives.radii.xl, backgroundColor: "#0A0E18", ...CARD_SHADOW }}>
        <View style={{ height: 264, borderRadius: primitives.radii.xl, overflow: "hidden" }}>
          <RemoteImage
            uri={tradeImage(HERO_IMAGE_KEYWORDS, HERO_IMAGE_LOCK, 1000, 760)}
            width="100%"
            height="100%"
            themeName={themeName}
            accessibilityLabel="A diverse team of electricians working on a connected-building site"
          />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,12,31,0.55)" }} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: ralewayFamily("700"), fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", opacity: 0.9 }}>
              FFIE · Electrical trades
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 30, lineHeight: 34, fontFamily: displayFamily("700"), fontWeight: "700", letterSpacing: -0.6, marginTop: 8 }}>
              Find your place in the trade
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, lineHeight: 21, marginTop: 8 }}>
              A field that's growing fast — and probably nothing like you picture it.
            </Text>
            <Pressable
              onPress={onWatch}
              accessibilityRole="button"
              accessibilityLabel="Watch the film"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                marginTop: 16,
                height: 44,
                paddingHorizontal: 16,
                borderRadius: primitives.radii.full,
                backgroundColor: "#FFFFFF",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Play size={16} color={TEAL} fill={TEAL} />
              <Text style={{ color: TEAL, fontSize: 15, fontFamily: ralewayFamily("700"), fontWeight: "700", marginLeft: 8 }}>
                Watch the film
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader — the uppercase eyebrow above each block (matches the Tools hub
// + grouped-list section headers).
// ---------------------------------------------------------------------------
function SectionHeader({ title, themeName }: { title: string; themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: t.text.brand,
        fontSize: 12.5,
        fontFamily: ralewayFamily("700"),
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
        paddingHorizontal: GUTTER,
        marginTop: 28,
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// ProfessionCard — one role in the list: a portrait, the job title, its domain
// chip and a one-line hook. Tapping opens the full profile.
// ---------------------------------------------------------------------------
function ProfessionCard({
  profession,
  themeName,
  onPress,
}: {
  profession: Profession;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useHomeColors(themeName);
  return (
    // Outer view casts the shadow; the inner Pressable clips the portrait to the
    // card radius (shadow + overflow:hidden on one view would clip the shadow).
    <View style={{ borderRadius: primitives.radii.lg, backgroundColor: c.cardBg, ...CARD_SHADOW }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${profession.role}. ${profession.tagline}`}
        style={({ pressed }) => ({
          flexDirection: "row",
          backgroundColor: c.cardBg,
          borderRadius: primitives.radii.lg,
          borderWidth: 1,
          borderColor: c.cardBorder,
          overflow: "hidden",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <RemoteImage
          uri={tradeImage(profession.imageKeywords, profession.imageLock, 320, 360)}
          width={104}
          height={120}
          themeName={themeName}
          accessibilityLabel={profession.imageAlt}
        />
        <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, justifyContent: "center" }}>
          <DomainChip label={profession.domain} themeName={themeName} />
          <Text numberOfLines={1} style={{ color: t.text.body, fontSize: 16, lineHeight: 21, fontFamily: ralewayFamily("700"), fontWeight: "700", letterSpacing: -0.2, marginTop: 6 }}>
            {profession.role}
          </Text>
          <Text numberOfLines={2} style={{ color: t.text.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }}>
            {profession.tagline}
          </Text>
        </View>
        <View style={{ alignItems: "center", justifyContent: "center", paddingRight: 10 }}>
          <ChevronRight size={20} color={t.text.muted} />
        </View>
      </Pressable>
    </View>
  );
}

// DomainChip — a small category pill (surface tint + muted label).
function DomainChip({ label, themeName }: { label: string; themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: t.surface.subtle, borderRadius: primitives.radii.full, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: t.text.muted, fontSize: 11, fontFamily: ralewayFamily("700"), fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TrainingPaths — the optional educational layer: the real French routes into
// the trade, two-up. Informational cards (no destination — content is mock).
// ---------------------------------------------------------------------------
function TrainingPaths({ themeName }: { themeName: ThemeName }) {
  const t = themes[themeName];
  const c = useHomeColors(themeName);
  const rows: (typeof TRAINING_PATHS)[number][][] = [];
  for (let i = 0; i < TRAINING_PATHS.length; i += 2) rows.push(TRAINING_PATHS.slice(i, i + 2));

  return (
    <View style={{ paddingHorizontal: GUTTER, rowGap: 12 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", columnGap: 12 }}>
          {row.map((tp) => (
            <View
              key={tp.id}
              style={{
                flex: 1,
                backgroundColor: c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: 1,
                borderColor: c.cardBorder,
                padding: 14,
                ...CARD_SHADOW,
              }}
            >
              <GraduationCap size={20} color={TEAL} strokeWidth={1.9} />
              {/* Reserve 2 lines for the label and note so every card is the
                  same height and the level/note line up across the whole grid
                  (labels like "BTS Électrotechnique" wrap to two lines). */}
              <Text
                numberOfLines={2}
                style={{ color: t.text.body, fontSize: 15, lineHeight: 19, fontFamily: ralewayFamily("700"), fontWeight: "700", marginTop: 10, minHeight: 38 }}
              >
                {tp.label}
              </Text>
              <Text numberOfLines={1} style={{ color: t.text.muted, fontSize: 12, marginTop: 4 }}>
                {tp.level}
              </Text>
              <Text numberOfLines={2} style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 17, marginTop: 6, minHeight: 34 }}>
                {tp.note}
              </Text>
            </View>
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// VideoRow — the optional presentation-videos layer: real FFIE testimonials in
// a horizontal rail. Tapping a card opens the inline player.
// ---------------------------------------------------------------------------
function VideoRow({ themeName, onPlay }: { themeName: ThemeName; onPlay: (id: string) => void }) {
  const t = themes[themeName];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: GUTTER, columnGap: 12 }}
    >
      {PROFESSION_VIDEOS.map((v) => (
        <Pressable
          key={v.youtubeId}
          onPress={() => onPlay(v.youtubeId)}
          accessibilityRole="button"
          accessibilityLabel={`Play ${v.name}'s testimonial`}
          style={({ pressed }) => ({ width: 208, opacity: pressed ? 0.9 : 1 })}
        >
          <RemoteImage
            uri={youtubeThumb(v.youtubeId)}
            width={208}
            height={120}
            radius={primitives.radii.lg}
            showPlay
            themeName={themeName}
            accessibilityLabel={`${v.name} — ${v.role}`}
          />
          <Text numberOfLines={1} style={{ color: t.text.body, fontSize: 14, fontFamily: ralewayFamily("700"), fontWeight: "700", marginTop: 8 }}>
            {v.name}
          </Text>
          <Text numberOfLines={1} style={{ color: t.text.muted, fontSize: 12.5, marginTop: 1 }}>
            {v.role}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// ProfessionDetailModal — the full career profile: portrait, the job summary,
// "what you'd do", the skills, and how to train into it. A page sheet matching
// the rest of the app's detail modals; reduced motion snaps it in (P4).
// ---------------------------------------------------------------------------
function ProfessionDetailModal({
  profession,
  themeName,
  onClose,
}: {
  profession: Profession | null;
  themeName: ThemeName;
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useHomeColors(themeName);
  const reduceMotion = useReducedMotion();
  const p = profession;

  return (
    <Modal
      visible={p != null}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
        {p ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
            <View>
              <RemoteImage
                uri={tradeImage(p.imageKeywords, p.imageLock, 1000, 620)}
                width="100%"
                height={216}
                themeName={themeName}
                accessibilityLabel={p.imageAlt}
              />
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                style={({ pressed }) => ({
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "rgba(8,12,31,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: GUTTER, paddingTop: 16 }}>
              <DomainChip label={p.domain} themeName={themeName} />
              <Text style={{ color: t.text.body, fontSize: 28, lineHeight: 33, fontFamily: displayFamily("700"), fontWeight: "700", letterSpacing: -0.6, marginTop: 10 }}>
                {p.role}
              </Text>
              <Text style={{ color: t.text.muted, fontSize: 16, lineHeight: 22, marginTop: 6 }}>{p.tagline}</Text>
              <Text style={{ color: t.text.body, fontSize: 15, lineHeight: 23, marginTop: 14 }}>{p.summary}</Text>

              <DetailSection title="What you'd do" themeName={themeName}>
                <View style={{ rowGap: 10 }}>
                  {p.dayInLife.map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 22, paddingTop: 2 }}>
                        <Check size={16} color={TEAL} strokeWidth={2.4} />
                      </View>
                      <Text style={{ flex: 1, color: t.text.body, fontSize: 15, lineHeight: 22 }}>{item}</Text>
                    </View>
                  ))}
                </View>
              </DetailSection>

              <DetailSection title="Skills you'd use" themeName={themeName}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {p.skills.map((s) => (
                    <View key={s} style={{ backgroundColor: t.surface.subtle, borderWidth: 1, borderColor: t.border.subtle, borderRadius: primitives.radii.full, paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text style={{ color: t.text.body, fontSize: 13, fontFamily: ralewayFamily("500"), fontWeight: "500" }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </DetailSection>

              <DetailSection title="How to get there" themeName={themeName}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 26, paddingTop: 1 }}>
                    <GraduationCap size={18} color={TEAL} strokeWidth={1.9} />
                  </View>
                  <Text style={{ flex: 1, color: t.text.body, fontSize: 15, lineHeight: 23 }}>{p.pathIn}</Text>
                </View>
              </DetailSection>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// DetailSection — a titled block inside the profile (navy uppercase header).
function DetailSection({
  title,
  themeName,
  children,
}: {
  title: string;
  themeName: ThemeName;
  children: React.ReactNode;
}) {
  const t = themes[themeName];
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        accessibilityRole="header"
        style={{ color: t.text.brand, fontSize: 13, fontFamily: ralewayFamily("700"), fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 12 }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// VideoModal — the inline player for the hero film + the testimonial rail.
// Captions are on by default (YouTubeEmbed). Reduced motion snaps it in.
// ---------------------------------------------------------------------------
function VideoModal({
  youtubeId,
  themeName,
  onClose,
}: {
  youtubeId: string | null;
  themeName: ThemeName;
  onClose: () => void;
}) {
  const t = themes[themeName];
  const reduceMotion = useReducedMotion();
  return (
    <Modal
      visible={youtubeId != null}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: t.surface.default }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 4 }}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
          >
            <X size={26} color={t.text.body} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
          {youtubeId ? <YouTubeEmbed youtubeId={youtubeId} /> : null}
          <Text style={{ color: t.text.muted, fontSize: 13, lineHeight: 19, marginTop: 12 }}>
            Captions are on by default — tap the player to start.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
