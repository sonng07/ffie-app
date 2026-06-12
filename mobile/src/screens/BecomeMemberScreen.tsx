// Onglet « Devenir adhérent » — la page « Adhérer à la FFIE ».
//
// Le modèle d'adhésion de la FFIE est fédéré : on adhère via sa fédération
// *départementale*, et non via un unique formulaire national. La page est donc
// un annuaire — un sous-titre orientant chacun vers son département, puis la
// liste complète des fédérations départementales sous forme de liste groupée
// en encadrés et consultable par recherche (même modèle piloté par les données
// que la Bibliothèque). Chaque ligne se déplie pour révéler les contacts
// locaux de la fédération (Président, Secrétaire Général, téléphone, adresse).
//
// Structure :
//   - Grand titre + sous-titre (« rendez-vous auprès de votre fédération départementale ci-dessous »)
//   - Annuaire des fédérations départementales (recherche + lignes dépliables, afficher plus)
//   - Note d'éligibilité
//
// Les coordonnées des fédérations proviennent de data/federations.ts. Les
// entrées non encore renseignées se déplient sur un état « détails à venir »
// propre — rien n'est inventé.

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
  X,
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
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  FederationMap,
  type FederationMapHandle,
  type FederationPin,
} from "@/components/ui/FederationMap";
import { primitives, semantics, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { SearchClearButton, useGroupedColors } from "@/components/ui/ios";
import { Button } from "@/components/ui/Button";
import {
  FEDERATIONS,
  FEDERATIONS_WITH_COORDS,
  hasContactDetails,
  type Federation,
} from "@/data/federations";

const GUTTER = semantics.spacing.gutter.mobile;

// Vue initiale de la carte centrée sur la France métropolitaine. Les fédérations
// d'outre-mer (Réunion, Guadeloupe, Nouvelle-Calédonie) se trouvent bien au-delà
// de ce cadre — leurs repères existent ; dézoomez ou faites défiler pour les atteindre.
const FRANCE_REGION = {
  latitude: 46.6,
  longitude: 2.5,
  latitudeDelta: 9.5,
  longitudeDelta: 9.5,
};
const MAP_HEIGHT = 220;

// Un repère par fédération disposant de coordonnées. Construit une seule fois —
// la liste source est statique. `area` est l'intitulé principal (p. ex. le
// département), `name` le libellé complet.
const FEDERATION_PINS: FederationPin[] = FEDERATIONS_WITH_COORDS.map((f) => ({
  id: f.id,
  lat: f.lat as number,
  lng: f.lng as number,
  title: f.area,
  description: f.name,
}));

// Marge supérieure du contenu de la page au-dessus de la zone de sécurité. Sur
// Android, on reprend le décalage de la pastille de Debug (son TOP_GAP = 24) afin
// que le titre s'aligne dessus ; iOS conserve la valeur plus serrée de 12.
const PAGE_TOP_PADDING = Platform.OS === "android" ? 24 : 12;

// Mouvement réduit : lecture initiale puis abonnement. Conditionne la rotation du
// chevron et l'animation de hauteur au dépliage/repliage, afin que les personnes
// sensibles aux troubles vestibulaires obtiennent un basculement instantané plutôt
// qu'un mouvement (prévention des risques, non négociable).
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
// ContactLine — un détail étiqueté à l'intérieur d'une fédération dépliée.
// Cliquable lorsqu'il correspond à une action (tel:, mailto:, https:).
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
// FederationRow — ligne en accordéon. Département + nom de la fédération, avec un
// chevron qui pivote vers le bas à l'ouverture. Le tap révèle le panneau de contact.
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
  /** Contrôlé par le parent afin qu'une seule ligne soit ouverte à la fois (accordéon). */
  open: boolean;
  onToggle: () => void;
  /** Reporte le décalage y de la ligne (au sein de la carte de liste) pour qu'un
   *  tap sur un repère de carte puisse y faire défiler la liste. */
  onMeasure?: (y: number) => void;
  /** Fournit au parent une référence vivante vers la vue extérieure de la carte,
   *  pour qu'un tap sur un repère de carte puisse mesurer sa position *actuelle*
   *  (le décalage mis en cache devient obsolète pendant que la carte
   *  précédemment ouverte se replie). */
  registerRef?: (node: View | null) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  // Une seule valeur de progression (0 = fermé, 1 = ouvert) pilote ensemble la
  // hauteur du panneau, son fondu et le chevron. Non native pour pouvoir animer
  // `height` ; une animation pilotée par JS sur une seule ligne reste peu coûteuse.
  const progress = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  // Hauteur naturelle du contenu du panneau, mesurée hors flux afin de pouvoir
  // animer le conteneur entre 0 et cette valeur.
  const [contentHeight, setContentHeight] = useState(0);

  // Pilotage par la prop contrôlée `open` — une ligne peut être fermée par le
  // parent (à l'ouverture d'une autre), pas uniquement par son propre tap.
  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reducedMotion ? 0 : primitives.motion.duration.slow,
      easing: Easing.bezier(0.4, 0, 0.2, 1), // ease standard — entrée/sortie en douceur
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
  // Fondu du contenu sur les ~60 % premiers du trajet pour qu'il soit pleinement
  // visible avant la fin du glissement (et disparu tôt à la fermeture) — sans
  // image fantôme persistante.
  const panelOpacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 1],
  });
  // La carte ouverte se soulève : l'ombre (iOS) et l'élévation (Android) croissent avec la progression.
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
      {/* Découpe intérieure — arrondit et rogne la teinte d'appui de l'en-tête
          ainsi que le panneau qui se déplie, tandis que l'ombre reste portée par
          la carte (non rognée) au-dessus. */}
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
        accessibilityHint={open ? "Masquer les coordonnées de la fédération" : "Afficher les coordonnées de la fédération"}
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
            minHeight: 48, // plancher de cible tactile P1
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

      {/* Panneau de contact déplié — révélation animée en hauteur. Le contenu
          reste monté et mesuré hors flux (absolute) afin que le conteneur puisse
          glisser en douceur entre 0 et sa hauteur naturelle. */}
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
              {/* Contacts nommés — rôle + nom, puis leur e-mail/téléphone */}
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
            // Aucune coordonnée inventée — espace réservé propre jusqu'à ce que la
            // FFIE fournisse le bloc de contact de cette fédération.
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
  onClose,
  onLogin,
  onOpenLegal,
}: {
  themeName?: ThemeName;
  // Lorsqu'elle est ouverte en modale (depuis le bouton flottant Adhérer), un
  // bouton de fermeture s'affiche en haut à droite. Omis quand l'écran est
  // hébergé dans un onglet.
  onClose?: () => void;
  // Lorsqu'il est défini, un bouton « Déjà adhérent ? Se connecter » est épinglé
  // en bas pour permettre aux adhérents existants d'accéder à la connexion
  // e-mail → OTP. Omis dans un onglet.
  onLogin?: () => void;
  // Ouvre les conditions d'utilisation (FFIE-18) — point d'entrée légal côté
  // invité (les invités n'ont pas d'onglet Profil). Omis dans un onglet.
  onOpenLegal?: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState("");
  // Accordéon : au plus une fédération dépliée à la fois. Ouvrir une nouvelle
  // ligne replie celle précédemment ouverte.
  const [openId, setOpenId] = useState<number | null>(null);
  // Affiche une liste courte par défaut ; « Afficher plus » révèle le reste. Une
  // recherche en direct contourne le plafond pour rendre chaque correspondance visible.
  const [showAll, setShowAll] = useState(false);
  // Hauteur mesurée du pied de page de connexion épinglé (lorsqu'il est affiché),
  // afin que le bouton flottant « retour en haut » se place au-dessus plutôt que
  // de le chevaucher.
  const [footerH, setFooterH] = useState(0);

  // La liste des fédérations défile à l'intérieur de cette fenêtre à hauteur fixe
  // pour que la page puisse tout de même défiler dans son ensemble autour d'elle
  // (défilement imbriqué). ~la moitié de l'écran.
  const listWindowHeight = Math.max(300, Math.round(windowHeight * 0.5));

  // Deux défilements : la page entière (pageRef) et la fenêtre de liste interne
  // (scrollRef). « Retour en haut » apparaît une fois que l'utilisateur a fait
  // défiler en profondeur dans la liste.
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
    // Hystérésis pour que le bouton ne clignote pas autour du seuil.
    if (y > 700 && !showBackToTop) setShowBackToTop(true);
    else if (y < 500 && showBackToTop) setShowBackToTop(false);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
    pageRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  };

  const toggleFederation = (id: number) => {
    // Chaque ligne anime sa propre hauteur ; l'ouverture de l'une et la fermeture
    // de celle précédemment ouverte s'exécutent en parallèle selon leur prop `open`.
    setOpenId((prev) => (prev === id ? null : id));
  };

  // Pont repère de carte → liste. Chaque ligne reporte son décalage y au sein de
  // la carte de liste ; la carte de liste reporte son propre décalage au sein du
  // contenu défilant. Taper un repère efface toute recherche, déplie la liste
  // complète, ouvre la ligne correspondante et y fait défiler (après un court
  // instant, le temps que la ligne nouvellement montée/dépliée se soit positionnée).
  const listTop = React.useRef(0);
  const rowOffsets = React.useRef<Record<number, number>>({});
  // Références vivantes vers le contenu défilant et vers chaque carte, pour qu'un
  // tap sur un repère puisse lire la position *actuelle* de la carte plutôt qu'un
  // décalage mis en cache (obsolète tant que la carte précédemment ouverte se
  // replie encore au-dessus).
  const listContentRef = React.useRef<View>(null);
  const rowRefs = React.useRef<Record<number, View | null>>({});

  const focusFederation = (id: number) => {
    setQuery("");
    setShowAll(true);
    setOpenId(id);

    // La solution fiable : ne pas faire défiler sur un minuteur fixe (la carte
    // cible bouge encore tant que la carte précédemment ouverte se replie au-dessus
    // — défiler à ce moment-là vous fait atterrir sur une position en pleine
    // animation, ne montrant que le bas de la carte). À la place, on interroge la
    // position *vivante* de la carte via measureLayout jusqu'à ce qu'elle cesse de
    // changer, puis on défile une seule fois pour aligner son haut avec le bord
    // supérieur de la fenêtre.
    const scrollToCached = () => {
      const y = listTop.current + (rowOffsets.current[id] ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: !reducedMotion });
    };

    let lastY = Number.NaN;
    let stable = 0;
    let tries = 0;
    const MAX_TRIES = 24; // plafond ~0,75 s à ~32 ms/interrogation

    const attempt = () => {
      tries += 1;
      const node = rowRefs.current[id];
      const listNode = listContentRef.current;
      if (!node || !listNode || typeof (node as any).measureLayout !== "function") {
        scrollToCached();
        return;
      }
      // Nouvelle architecture (Fabric) : measureLayout prend la *référence* de
      // l'ancêtre par rapport auquel mesurer, et non un numéro findNodeHandle().
      (node as any).measureLayout(
        listNode,
        (_x: number, y: number) => {
          stable = Math.abs(y - lastY) < 0.5 ? stable + 1 : 0;
          lastY = y;
          // Stabilisé (deux lectures concordantes), mouvement réduit, ou plafond
          // atteint → on valide le défilement. Sinon, on attend une frame et on
          // re-mesure.
          if (reducedMotion || stable >= 2 || tries >= MAX_TRIES) {
            scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: !reducedMotion });
          } else {
            setTimeout(attempt, 32);
          }
        },
        scrollToCached
      );
    };

    // Laisser les animations d'ouverture/fermeture démarrer (et les lignes
    // nouvellement révélées se monter) avant la première mesure.
    setTimeout(attempt, reducedMotion ? 30 : 80);
  };

  // Recentre la carte sur la fédération actuellement ouverte. Se déclenche à
  // chaque changement de openId, de sorte qu'ouvrir une ligne, passer à une autre
  // ou taper un repère déplace la carte vers ce lieu. Refermer une ligne laisse
  // la carte là où elle est.
  const mapRef = React.useRef<FederationMapHandle>(null);
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

  // La barre de défilement d'Android est collée au bord droit du ScrollView et
  // ignore scrollIndicatorInsets ; on décale donc le ScrollView lui-même d'un
  // cheveu pour écarter la barre du bord de l'écran, comme sur iOS. iOS conserve
  // la pleine largeur + les insets d'indicateur.
  const ANDROID_BAR_INSET = Platform.OS === "android" ? 8 : 0;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Page claire — conserver des icônes de barre d'état sombres même lorsque
          la page est ouverte par-dessus le hero navy de l'Accueil (qui les passe
          en clair). */}
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
      {/* Fermeture de la modale — uniquement lorsque l'écran est présenté en
          glissement vers le haut (CTA flottant Adhérer). Placée en haut à droite,
          dégagée du grand titre aligné à gauche. */}
      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={onClose}
          hitSlop={10}
          style={({ pressed }) => [
            {
              position: "absolute",
              top: PAGE_TOP_PADDING,
              right: GUTTER,
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? c.separator : c.cardBg,
            },
          ]}
        >
          <X size={18} color={t.text.muted} />
        </Pressable>
      ) : null}
      <ScrollView
        ref={pageRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* La page défile dans son ensemble, pour pouvoir atteindre le bas. La
            carte se déplace au toucher et la liste des fédérations défile dans sa
            propre fenêtre — chacune conserve son geste ; la page défile partout
            ailleurs. */}
        {/* Grand titre + le sous-titre demandé */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            paddingTop: PAGE_TOP_PADDING,
            paddingBottom: 6,
            // Dégager le titre du bouton de fermeture de la modale (en haut à droite).
            paddingRight: onClose ? 52 : GUTTER,
          }}
        >
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
            Pour adhérer, contactez votre fédération départementale ci-dessous.
          </Text>
        </View>

        {/* Carte — un repère par fédération. Taper un repère affiche son nom/
            département dans une bulle. Module natif (react-native-maps) : Apple
            Maps sur iOS, Google Maps sur Android. */}
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
          <FederationMap
            ref={mapRef}
            style={{ width: "100%", height: MAP_HEIGHT }}
            initialRegion={FRANCE_REGION}
            pins={FEDERATION_PINS}
            accessibilityLabel="Carte des fédérations départementales"
            onPinPress={focusFederation}
          />
        </View>

        {/* Champ de recherche — même affordance que la Bibliothèque */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            marginTop: 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              // Un peu plus haut sur Android — la ligne de base native du texte y
              // est plus haute, donc 38 paraissait à l'étroit ; iOS conserve la
              // valeur plus serrée.
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

        {/* Annuaire des fédérations départementales — défile dans sa propre
            fenêtre fixe pour que la page puisse tout de même défiler autour
            (défilement imbriqué). */}
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
            {/* Chaque FederationRow est désormais sa propre carte (marges + ombre
                portées par la ligne) ; ceci n'est qu'un simple conteneur. */}
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

            {/* Afficher plus — révèle le reste de l'annuaire */}
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

            {/* Afficher moins — replie vers la liste courte (uniquement lorsque
                l'utilisateur l'a lui-même dépliée ; la recherche gère son propre
                nombre de résultats) */}
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
                {`Affichage de ${visible.length} fédérations départementales sur ${FEDERATIONS.length}.`}
              </Text>
            ) : null}
          </>
        )}

        {/* Éligibilité */}
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
              Ouvert aux entreprises d'intégration électrique immatriculées en France. Les demandes sont traitées par
              votre fédération départementale, puis examinées par la FFIE avant l'octroi de l'accès. Vous serez notifié par e-mail.
            </Text>
          </View>

          {/* Lien légal (FFIE-18) — seul point d'entrée vers les conditions
              d'utilisation côté invité (pas d'onglet Profil). */}
          {onOpenLegal ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Conditions d'utilisation"
              accessibilityHint="Ouvre les conditions d'utilisation de l'application"
              onPress={onOpenLegal}
              hitSlop={8}
              style={({ pressed }) => ({
                alignSelf: "center",
                marginTop: 16,
                paddingVertical: 6,
                paddingHorizontal: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: t.brand.accent,
                  textDecorationLine: "underline",
                }}
              >
                Conditions d'utilisation
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      </View>

      {/* Pied de page de connexion épinglé — uniquement à l'ouverture depuis
          l'avatar flottant. Un CTA encadré pleine largeur ouvre la fenêtre de
          connexion e-mail → OTP ; la ligne atténuée au-dessus précise à qui il
          s'adresse. */}
      {onLogin ? (
        <View
          onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.separator,
            backgroundColor: c.pageBg,
            paddingHorizontal: GUTTER,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <Text
            style={{
              color: t.text.muted,
              fontSize: 13,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Déjà adhérent ?
          </Text>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            themeName={themeName}
            onPress={onLogin}
            accessibilityLabel="Se connecter"
          >
            Se connecter
          </Button>
        </View>
      ) : null}

      {/* Retour en haut — flotte au-dessus de la liste une fois le défilement en
          profondeur. Le bouton entier apparaît/disparaît en fondu (opacité
          uniquement, pas de glissement). Relevé au-dessus du pied de page de
          connexion lorsqu'il est présent. */}
      <Animated.View
        pointerEvents={showBackToTop ? "box-none" : "none"}
        style={{
          position: "absolute",
          right: GUTTER,
          bottom: 24 + footerH,
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
