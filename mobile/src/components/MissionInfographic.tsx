// MissionInfographic — reconstruction animée, native mobile, de l'infographie
// « La FFIE en chiffres » du bas de la page « Missions et valeurs » du site (le
// graphique bleu marine avec le rail des métiers, les jauges circulaires et les
// grands nombres). Ouverte en appuyant sur le logo FFIE de l'Accueil (FFIE-02),
// hébergée dans FfieFiguresScreen.
//
// La source est un diagramme large et ramifié ; sur téléphone on le ré-empile en
// une colonne de blocs de stats sur le dégradé marine institutionnel FFIE, en
// gardant les mêmes chiffres, l'accent cyan « flux électrique » et le rail des
// métiers. Le mouvement EST l'intérêt de la reconstruction :
//   - les nombres défilent en comptant (8 500, 150 000, 25 Md€),
//   - les jauges circulaires balaient de 0 jusqu'à leur pourcentage,
//   - les blocs apparaissent en fondu/glissement, en cascade.
//
// Deux non-négociables du projet :
//   - Mouvement réduit (P5) : quand « Réduire les animations » est activé dans
//     l'OS, TOUT saute à sa valeur finale — pas de comptage, pas de balayage, pas
//     de glissement. Conditionné via useReducedMotion().
//   - L'animation ne démarre qu'une fois le panneau visible à l'écran, pas au
//     montage : le parent passe sa position de défilement en Animated.Value et on
//     se mesure par rapport à la fenêtre. Sans contexte de défilement, on révèle
//     directement au montage (cas de l'écran dédié FfieFiguresScreen).
//
// Les chiffres vivent dans data/mission.ts (MISSION_FIGURES, MISSION_METIERS) ;
// ce fichier ne possède que la présentation.

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

// Palette institutionnelle FFIE de ce panneau. L'infographie garde sa propre
// identité sombre quel que soit le thème de l'app (elle reproduit un visuel de
// marque fixe) : ces couleurs sont donc volontairement en dur, pas des tokens.
const NAVY_TOP = "#243066"; // brand navy, lifted a touch for the gradient top
const NAVY_BOTTOM = "#121835"; // brand.navy[900]
const CYAN = "#04C6E2"; // brand.teal[400] — the logo's electricity-flow accent
const CYAN_DIM = "#02B5CE"; // brand.teal[500]
const TRACK = "rgba(255,255,255,0.13)"; // unfilled gauge ring
const WHITE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.68)";
const FAINT = "rgba(255,255,255,0.5)";

// Séparateur de milliers par une espace insécable fine (8 500, 150 000).
const fr = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------------------------------------------------------------------------
// useRevealOnScroll — passe `inView` à true dès que cet élément entre dans la
// fenêtre. S'abonne à l'Animated.Value de défilement du parent et se mesure en
// coordonnées écran ; se désabonne au premier déclenchement. Mouvement réduit ou
// absence de contexte de défilement → révélation immédiate.
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
        // Déclenche quand le haut du panneau est passé au-dessus des 80 px du bas
        // de l'écran — c.-à-d. qu'une portion significative est visible.
        if (py < wh - 80) {
          done = true;
          setInView(true);
          scrollY.removeListener(id);
        }
      });
    };
    const id = scrollY.addListener(check);
    // Re-vérifie peu après la mise en page au cas où il serait déjà visible.
    const t = setTimeout(check, 80);
    return () => {
      scrollY.removeListener(id);
      clearTimeout(t);
    };
  }, [scrollY, reduced]);

  return { ref, inView };
}

// Reveal — enveloppe fondu + glissement vers le haut, conditionnée par `play`.
// Apparaît d'un coup quand le mouvement réduit est actif.
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

// CountUp — anime un entier de 0 jusqu'à `to`. `format` contrôle l'affichage.
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

// Gauge — anneau de progression circulaire qui balaie depuis midi, dans le sens
// horaire, jusqu'à `pct`. Le pourcentage compte au centre ; une légende
// optionnelle se place en dessous.
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

// Petit intitulé de section en majuscules à l'intérieur du panneau.
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

// Métier → icône (le rail de gauche de l'infographie source). Les clés doivent
// correspondre exactement à MISSION_METIERS (data/mission.ts) ; un libellé non
// trouvé retombe sur l'icône Cog.
const METIER_ICON: Record<string, LucideIcon> = {
  Automatismes: Cog,
  Communication: Wifi,
  "Confort thermique": Thermometer,
  "Éclairage": Lightbulb,
  "Énergie": Sun,
  GTB: Laptop,
  Maintenance: Wrench,
  "Sécurité": Lock,
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
        {/* Chiffre phare — entreprises adhérentes. (Le titre « La FFIE en chiffres »
            est porté par l'écran hôte FfieFiguresScreen, pas répété ici.) */}
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

        {/* 50 % des salariés du secteur → 150 000 actifs FFIE */}
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
            valueLabel="actifs"
          />
        </Reveal>

        {/* 50 % du chiffre d'affaires du secteur → 25 Md€ */}
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
                <Text style={[bigValueText, { fontSize: 22 }]}> Md€</Text>
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

        {/* Type de travaux : réseaux / bâtiment */}
        <Reveal play={inView} reduced={reduced} delay={260}>
          <PanelLabel>Type de travaux</PanelLabel>
          <View style={miniRow}>
            <MiniGauge pct={F.reseauxPct} label={"Travaux et\nréseaux"} Icon={Network} play={inView} reduced={reduced} delay={340} />
            <MiniGauge pct={F.batimentsPct} label={"Travaux en\nbâtiment"} Icon={Building2} play={inView} reduced={reduced} delay={400} />
          </View>
        </Reveal>

        <Divider />

        {/* Travaux en bâtiment : résidentiel / tertiaire / industriel */}
        <Reveal play={inView} reduced={reduced} delay={300}>
          <PanelLabel>Travaux en bâtiment</PanelLabel>
          <View style={miniRow}>
            <MiniGauge pct={F.residentielPct} label="Résidentiel" Icon={Home} size={82} play={inView} reduced={reduced} delay={380} />
            <MiniGauge pct={F.tertiairePct} label="Tertiaire" Icon={Building2} size={82} play={inView} reduced={reduced} delay={440} />
            <MiniGauge pct={F.industrielPct} label="Industriel" Icon={Factory} size={82} play={inView} reduced={reduced} delay={500} />
          </View>
        </Reveal>

        <Divider />

        {/* Les métiers — le rail de gauche de la source, ici une grille de pastilles */}
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

// IconBadge — tuile à coins arrondis, contour cyan, contenant un glyphe lucide.
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

// GaugeRow — une grande jauge à gauche, un connecteur « soit », puis le chiffre
// résultant à droite avec son icône. Reprend le « 50 % → soit → N » de la source.
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

// MiniGauge — une jauge compacte étiquetée pour les lignes de répartition.
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
