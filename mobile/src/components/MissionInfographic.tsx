// MissionInfographic — animated, mobile-native rebuild of the FFIE "en chiffres"
// infographic at the foot of the Missions et valeurs page (the dark-navy chart
// with the métiers rail, circular gauges and big numbers).
//
// The source is a wide, branched diagram; on a phone we restack it into a single
// column of stat blocks on FFIE's institutional navy gradient, keeping the same
// figures, the cyan electricity-flow accent, and the métiers rail. The motion is
// the point of the rebuild:
//   - numbers count up (8 500, 150 000, 25 Mds€),
//   - the circular gauges sweep from 0 to their percentage,
//   - blocks fade/slide in, staggered.
//
// Two non-negotiables from the project:
//   - Reduced motion (P5): when the OS "Reduce Motion" is on, EVERYTHING snaps
//     to its final value — no count-up, no sweep, no slide. Gated via
//     useReducedMotion().
//   - Animation runs only once the panel scrolls into view, not on mount (it
//     sits far below the fold), so the user actually sees it. The parent passes
//     its scroll position as an Animated.Value; we measure ourselves against the
//     viewport and fire once. With no scroll context we just reveal on mount.
//
// Figures live in data/mission.ts (MISSION_FIGURES, MISSION_METIERS) so this
// file owns presentation only.

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import {
  Building2,
  Cog,
  Euro,
  Factory,
  Hammer,
  HardHat,
  Home,
  Laptop,
  Lightbulb,
  Lock,
  Network,
  Sun,
  Thermometer,
  Users,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { primitives } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { GUTTER } from "@/components/ui/ios";
import { MISSION_FIGURES as F, MISSION_METIERS } from "@/data/mission";

// FFIE institutional palette for this panel. The infographic keeps its own dark
// identity regardless of app theme (it reproduces a fixed branded asset), so
// these are deliberately hardcoded rather than theme tokens.
const NAVY_TOP = "#243066"; // brand navy, lifted a touch for the gradient top
const NAVY_BOTTOM = "#121835"; // brand.navy[900]
const CYAN = "#04C6E2"; // brand.teal[400] — the logo's electricity-flow accent
const CYAN_DIM = "#02B5CE"; // brand.teal[500]
const TRACK = "rgba(255,255,255,0.13)"; // unfilled gauge ring
const WHITE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.68)";
const FAINT = "rgba(255,255,255,0.5)";

// French thousands grouping with a narrow no-break space (8 500, 150 000).
const fr = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------------------------------------------------------------------------
// useRevealOnScroll — fire `inView` once this element enters the viewport.
// Subscribes to the parent's scroll Animated.Value and measures itself in
// window coordinates; unsubscribes after the first hit. Reduced motion or no
// scroll context → reveal immediately.
// ---------------------------------------------------------------------------
function useRevealOnScroll(scrollY: Animated.Value | undefined, reduced: boolean) {
  const ref = useRef<View>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced || !scrollY) {
      setInView(true);
      return;
    }
    let done = false;
    const check = () => {
      if (done || !ref.current) return;
      ref.current.measure((_x, _y, _w, _h, _px, py) => {
        if (typeof py !== "number") return;
        const wh = Dimensions.get("window").height;
        // Trigger when the panel's top has risen above the bottom 80px of the
        // screen — i.e. a meaningful slice is on screen.
        if (py < wh - 80) {
          done = true;
          setInView(true);
          scrollY.removeListener(id);
        }
      });
    };
    const id = scrollY.addListener(check);
    // Also check shortly after layout in case it's already visible.
    const t = setTimeout(check, 80);
    return () => {
      scrollY.removeListener(id);
      clearTimeout(t);
    };
  }, [scrollY, reduced]);

  return { ref, inView };
}

// Reveal — fade + slide-up wrapper, gated on `play`. Snaps in when reduced.
function Reveal({
  play,
  reduced,
  delay = 0,
  style,
  children,
}: {
  play: boolean;
  reduced: boolean;
  delay?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  const a = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (!play) return;
    if (reduced) {
      a.setValue(1);
      return;
    }
    Animated.timing(a, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [play]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// CountUp — animate an integer from 0 to `to`. `format` controls display.
function CountUp({
  to,
  play,
  reduced,
  delay = 0,
  duration = 1200,
  format = (n: number) => String(Math.round(n)),
  style,
}: {
  to: number;
  play: boolean;
  reduced: boolean;
  delay?: number;
  duration?: number;
  format?: (n: number) => string;
  style?: any;
}) {
  const v = useRef(new Animated.Value(reduced ? to : 0)).current;
  const [n, setN] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!play) return;
    if (reduced) {
      setN(to);
      return;
    }
    const id = v.addListener(({ value }) => setN(value));
    Animated.timing(v, {
      toValue: to,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => v.removeListener(id);
  }, [play]);
  return <Text style={style}>{format(n)}</Text>;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Gauge — circular progress ring that sweeps from 12 o'clock clockwise to `pct`.
// The percentage counts up in the centre; an optional caption sits beneath it.
function Gauge({
  pct,
  size = 104,
  stroke = 8,
  color = CYAN,
  play,
  reduced,
  delay = 0,
  caption,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  play: boolean;
  reduced: boolean;
  delay?: number;
  caption?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(reduced ? pct / 100 : 0)).current;

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      progress.setValue(pct / 100);
      return;
    }
    Animated.timing(progress, {
      toValue: pct / 100,
      duration: 1150,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [play]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circ, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={TRACK} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={{ alignItems: "center", paddingHorizontal: 6 }}>
        <CountUp
          to={pct}
          play={play}
          reduced={reduced}
          delay={delay}
          duration={1150}
          format={(n) => `${Math.round(n)} %`}
          style={{
            color: WHITE,
            fontSize: size >= 100 ? 28 : 20,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.5,
          }}
        />
        {caption ? (
          <Text
            style={{
              color: MUTED,
              fontSize: size >= 100 ? 10.5 : 9.5,
              lineHeight: size >= 100 ? 14 : 12,
              textAlign: "center",
              marginTop: 2,
              fontFamily: ralewayFamily("500"),
              fontWeight: "500",
            }}
            numberOfLines={2}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Small uppercase section label inside the panel.
function PanelLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: FAINT,
        fontSize: 11,
        fontFamily: ralewayFamily("600"),
        fontWeight: "600",
        letterSpacing: 1.1,
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

// Métier → icon map (left rail of the source infographic).
const METIER_ICON: Record<string, LucideIcon> = {
  Automatismes: Cog,
  Communication: Wifi,
  "Confort thermique": Thermometer,
  Éclairage: Lightbulb,
  Énergies: Sun,
  "Gestion technique du bâtiment": Laptop,
  Maintenance: Wrench,
  Sécurité: Lock,
};

export function MissionInfographic({ scrollY }: { scrollY?: Animated.Value }) {
  const reduced = useReducedMotion();
  const { ref, inView } = useRevealOnScroll(scrollY, reduced);

  return (
    <View ref={ref} style={{ marginHorizontal: GUTTER, marginBottom: 12 }}>
      <LinearGradient
        colors={[NAVY_TOP, NAVY_BOTTOM]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: primitives.radii.lg, padding: 22, overflow: "hidden" }}
      >
        {/* Header */}
        <Reveal play={inView} reduced={reduced}>
          <PanelLabel>La FFIE en chiffres</PanelLabel>
        </Reveal>

        {/* Entreprises adhérentes — the headline figure */}
        <Reveal play={inView} reduced={reduced} delay={60}>
          <View style={{ flexDirection: "row", alignItems: "center", columnGap: 14, marginBottom: 26 }}>
            <IconBadge Icon={Building2} />
            <View style={{ flex: 1 }}>
              <CountUp
                to={F.entreprises}
                play={inView}
                reduced={reduced}
                delay={60}
                format={fr}
                style={{
                  color: CYAN,
                  fontSize: 40,
                  lineHeight: 44,
                  fontFamily: displayFamily("700"),
                  fontWeight: "700",
                  letterSpacing: -1,
                }}
              />
              <Text style={statLabel}>entreprises adhérentes</Text>
            </View>
          </View>
        </Reveal>

        {/* 50 % des salariés → 150 000 actifs FFIE */}
        <Reveal play={inView} reduced={reduced} delay={120}>
          <GaugeRow
            pct={F.salariesPct}
            caption={"des salariés\ndu secteur"}
            play={inView}
            reduced={reduced}
            delay={200}
            Icon={Users}
            bigValue={
              <CountUp
                to={F.actifs}
                play={inView}
                reduced={reduced}
                delay={200}
                format={fr}
                style={bigValueText}
              />
            }
            valueLabel="actifs FFIE"
          />
        </Reveal>

        {/* 50 % du CA → 25 Mds€ */}
        <Reveal play={inView} reduced={reduced} delay={180}>
          <GaugeRow
            pct={F.caPct}
            caption={"du chiffre\nd'affaires du secteur"}
            play={inView}
            reduced={reduced}
            delay={260}
            Icon={Euro}
            bigValue={
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <CountUp
                  to={F.caMds}
                  play={inView}
                  reduced={reduced}
                  delay={260}
                  style={bigValueText}
                />
                <Text style={[bigValueText, { fontSize: 22 }]}> Mds€</Text>
              </View>
            }
            valueLabel="de chiffre d'affaires"
          />
        </Reveal>

        <Divider />

        {/* Répartition du chiffre d'affaires : neuf / rénovation */}
        <Reveal play={inView} reduced={reduced} delay={220}>
          <PanelLabel>Répartition du chiffre d'affaires</PanelLabel>
          <View style={miniRow}>
            <MiniGauge pct={F.neufPct} label="Neuf" Icon={HardHat} play={inView} reduced={reduced} delay={300} />
            <MiniGauge pct={F.renovationPct} label="Rénovation" Icon={Hammer} play={inView} reduced={reduced} delay={360} />
          </View>
        </Reveal>

        <Divider />

        {/* Nature des travaux : réseaux / bâtiments */}
        <Reveal play={inView} reduced={reduced} delay={260}>
          <PanelLabel>Nature des travaux</PanelLabel>
          <View style={miniRow}>
            <MiniGauge pct={F.reseauxPct} label={"Travaux et\nréseaux"} Icon={Network} play={inView} reduced={reduced} delay={340} />
            <MiniGauge pct={F.batimentsPct} label={"Travaux dans\nles bâtiments"} Icon={Building2} play={inView} reduced={reduced} delay={400} />
          </View>
        </Reveal>

        <Divider />

        {/* Travaux dans les bâtiments : résidentiel / tertiaire / industriel */}
        <Reveal play={inView} reduced={reduced} delay={300}>
          <PanelLabel>Travaux dans les bâtiments</PanelLabel>
          <View style={miniRow}>
            <MiniGauge pct={F.residentielPct} label="Résidentiel" Icon={Home} size={82} play={inView} reduced={reduced} delay={380} />
            <MiniGauge pct={F.tertiairePct} label="Tertiaire" Icon={Building2} size={82} play={inView} reduced={reduced} delay={440} />
            <MiniGauge pct={F.industrielPct} label="Industriel" Icon={Factory} size={82} play={inView} reduced={reduced} delay={500} />
          </View>
        </Reveal>

        <Divider />

        {/* Les métiers — left rail of the source, here a chip grid */}
        <Reveal play={inView} reduced={reduced} delay={340}>
          <PanelLabel>{`${MISSION_METIERS.length} métiers`}</PanelLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {MISSION_METIERS.map((m) => {
              const Icon = METIER_ICON[m] ?? Cog;
              return (
                <View
                  key={m}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    columnGap: 7,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.14)",
                    borderRadius: primitives.radii.full,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                  }}
                >
                  <Icon size={15} color={CYAN} strokeWidth={1.75} />
                  <Text
                    style={{
                      color: WHITE,
                      fontSize: 12.5,
                      fontFamily: ralewayFamily("600"),
                      fontWeight: "600",
                    }}
                  >
                    {m}
                  </Text>
                </View>
              );
            })}
          </View>
        </Reveal>
      </LinearGradient>
    </View>
  );
}

// IconBadge — rounded cyan-outlined tile holding a lucide glyph.
function IconBadge({ Icon, size = 52 }: { Icon: LucideIcon; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "rgba(4,198,226,0.5)",
        backgroundColor: "rgba(4,198,226,0.08)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={size * 0.5} color={CYAN} strokeWidth={1.75} />
    </View>
  );
}

// GaugeRow — a big gauge on the left, a "soit" connector, then the resulting
// figure on the right with its icon. Mirrors the source's "50 % → soit → N".
function GaugeRow({
  pct,
  caption,
  play,
  reduced,
  delay,
  bigValue,
  valueLabel,
  Icon,
}: {
  pct: number;
  caption: string;
  play: boolean;
  reduced: boolean;
  delay: number;
  bigValue: React.ReactNode;
  valueLabel: string;
  Icon: LucideIcon;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 22 }}>
      <Gauge pct={pct} caption={caption} play={play} reduced={reduced} delay={delay} />
      <View style={{ alignItems: "center", paddingHorizontal: 10 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.25)",
            borderRadius: primitives.radii.full,
            paddingHorizontal: 9,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: FAINT, fontSize: 11, letterSpacing: 0.5, fontFamily: ralewayFamily("600"), fontWeight: "600" }}>
            soit
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", columnGap: 10 }}>
        <View style={{ flex: 1 }}>
          {bigValue}
          <Text style={statLabel}>{valueLabel}</Text>
        </View>
        <Icon size={26} color={CYAN_DIM} strokeWidth={1.5} />
      </View>
    </View>
  );
}

// MiniGauge — a compact labelled gauge for the breakdown rows.
function MiniGauge({
  pct,
  label,
  Icon,
  size = 92,
  play,
  reduced,
  delay,
}: {
  pct: number;
  label: string;
  Icon: LucideIcon;
  size?: number;
  play: boolean;
  reduced: boolean;
  delay: number;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", rowGap: 8 }}>
      <Gauge pct={pct} size={size} stroke={size >= 90 ? 7 : 6} play={play} reduced={reduced} delay={delay} />
      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 5 }}>
        <Icon size={14} color={CYAN} strokeWidth={1.75} />
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            lineHeight: 15,
            textAlign: "center",
            fontFamily: ralewayFamily("500"),
            fontWeight: "500",
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 22 }} />;
}

const statLabel = {
  color: MUTED,
  fontSize: 13,
  lineHeight: 18,
  marginTop: 3,
  fontFamily: ralewayFamily("500"),
  fontWeight: "500" as const,
};

const bigValueText = {
  color: CYAN,
  fontSize: 28,
  fontFamily: displayFamily("700"),
  fontWeight: "700" as const,
  letterSpacing: -0.6,
};

const miniRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  columnGap: 14,
};
