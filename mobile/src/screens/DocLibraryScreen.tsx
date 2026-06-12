// FFIE — Écran Bibliothèque de documents, stylé selon iOS HIG (grand titre,
// recherche arrondie, liste en cartes groupées) via les primitives iOS partagées
// (components/ui/ios).
//
// Affiche le catalogue complet des documents FFIE (335 documents — voir
// src/data/docs.ts), STRUCTURÉ en une carte de section par famille FFIE (la
// taxonomie de premier niveau du site), chacune coiffée de son nom + un compteur
// « N docs » en direct — reproduisant la mise en page documentaire sectionnée du
// client. En plus du sectionnement :
//   - Chaque section s'ouvre repliée sur un aperçu (SECTION_PREVIEW lignes) ; un
//     « Tout afficher » par section révèle le reste de cette famille.
//   - La recherche + le filtre restreignent le corpus ET la liste des sections
//     (les familles vides disparaissent, les compteurs se mettent à jour en direct).
//   - Un bouton « retour en haut » apparaît dès qu'on fait défiler vers le bas.
//   - Les documents réservés aux adhérents portent une étiquette cadenas pour les
//     visiteurs qui ne peuvent pas les ouvrir (les invités) — le même LockTag que
//     les cartes Actualités.
// Les sections s'ouvrent repliées, donc une simple ScrollView suffit — seuls les
// aperçus (plus toute famille que l'utilisateur déplie explicitement) sont rendus.
//
// Contrats de conception respectés :
//   1. Champ de recherche en haut (P3) — pas d'autofocus (ouvrir le clavier au
//      montage est impoli).
//   2. Lignes ≥ 48 pt (P1) — InsetRow plafonne minHeight à 48.
//   3. Bandeau hors ligne quand offline=true (P2).
//   4. Chaque ligne porte un SavedBadge OU un LockTag (icône + libellé, jamais la
//      couleur seule — P2+P4).
//   5. Thème + densité fournis par l'appelant. 6. Gouttière mobile = 16.

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

// Le filtre hors ligne de la bibliothèque est à deux états, calqué sur l'indicateur
// `saved` du document (FFIE-DOC-03 / P2) : « montre-moi ce qui est sur cet appareil »
// vs « ce qu'il me reste à télécharger ». Rien de plus riche n'est prévu.
type SavedFilterKey = "saved" | "not-saved";

const FILTER_OPTIONS: { key: SavedFilterKey; label: string }[] = [
  { key: "saved", label: "Enregistré hors ligne" },
  { key: "not-saved", label: "Non enregistré" },
];

// Taxonomie de filtre du site FFIE (FFIE-DOC-04) — l'arbre famille → catégorie
// EXACTEMENT tel que la barre latérale de filtre du site public le présente
// (ordre conservé). Chaque option est une vraie facette FFIE ; cocher une puce
// restreint le corpus via les champs `category`/`categories` du document. Sept
// facettes que le site liste mais qu'aucun document de l'instantané actuel ne
// porte encore (marquées « (sans doc) ») sont incluses telles quelles pour
// reproduire le site 1:1 — elles se peupleront à la synchro live. L'ordre des
// familles suit DOC_FAMILIES (mêmes intitulés que les en-têtes de section de la
// page) ; « Autres documents » n'est pas une facette du site → hors filtre.
const DOC_FILTER_GROUPS: { family: DocFamily; options: string[] }[] = [
  {
    family: "Courants forts",
    options: [
      "CVC",
      "Éclairage",
      "Commande et distribution électrique",
      "PoE / SPE",
      "IRVE",
      "Règles d'installation",
      "Habilitations électriques",
    ],
  },
  {
    family: "Sûreté / Sécurité Incendie",
    options: [
      "Sécurité incendie",
      "Contrôle d'accès",
      "Vidéoprotection",
      "Serrures connectées",
      "Cybersécurité",
    ],
  },
  {
    family: "Vie de l'entreprise",
    options: [
      "Gestion des travaux",
      "Démarche commerciale",
      "Aides financières",
      "Gestion de l'entreprise",
      "Qualification",
      "Ressources humaines / Compétences",
      "Formations pour les électriciens",
    ],
  },
  {
    family: "Bâtiments connectés",
    options: [
      "Audiovisuel / Sonorisation / Antennes", // (sans doc)
      "Pilotage du bâtiment GTB / GTC / BACS",
      "IA Intelligence Artificielle",
      "Réseaux de communication",
      "Fibre optique",
      "Supervision / Hypervision", // (sans doc)
      "API (Interfaces de programmation)",
      "Accessibilité /Silver Economie",
    ],
  },
  {
    family: "Performance énergétique",
    options: [
      "CEE",
      "RE 2020 / RT 2012",
      "CITE / PTZ",
      "Autoconsommation / Stockage",
      "Photovoltaïque PV",
    ],
  },
  {
    family: "Maintenance",
    options: ["Gammes opératoires", "Modèle de contrat", "Fiches Maintenance"],
  },
  {
    family: "Types de documents",
    options: [
      "JE Journal des électriciens",
      "Mémos RH",
      "Séries Marchés",
      "Posters",
      "Documents de communication",
      "Notéco", // (sans doc)
      "Notec", // (sans doc)
      "Guides", // (sans doc)
      "Collection Innov'Elec", // (sans doc)
      "Fiches marketing", // (sans doc)
    ],
  },
];

// Rapproche l'intitulé d'une facette de filtre des valeurs `category`/`categories`
// d'un document SANS dépendre d'un encodage identique au caractère près (accents,
// apostrophe droite/courbe, espaces). Comparaison de présentation, pas de sécurité.
const normCat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// L'ensemble des catégories d'un document, son intitulé principal inclus.
const docCategorySet = (d: Doc): string[] => [d.category, ...d.categories];

// Chaque section de famille s'ouvre en montrant un aperçu de SECTION_PREVIEW
// lignes ; un « Tout afficher » par section révèle le reste de cette famille. Réglable.
const SECTION_PREVIEW = 3;
// Afficher le bouton retour-en-haut une fois que l'utilisateur a fait défiler à peu
// près un écran.
const BACK_TO_TOP_AT = 520;
// Le bouton flottant de l'assistant Claude (AssistantChatWidget) occupe le coin
// inférieur droit. Ce bouton vit dans la zone de contenu de l'écran (au-dessus de
// la barre d'onglets, donc l'inset bas est déjà absorbé) et s'empile 12 pt au-dessus
// du bouton flottant. Reproduit BACK_TO_TOP_LIFT dans NewsScreen.
const BACK_TO_TOP_LIFT = ASSISTANT_FAB_GAP + ASSISTANT_FAB_SIZE + 12;

// Visuels de vignette — une boîte 50×66 montrant la vraie image de couverture FFIE
// du document. Pendant le chargement de cette image (ou en cas d'échec / hors ligne)
// on rend une « page rendue » fictive pour que la ligne n'affiche jamais une image
// cassée.
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

// La teinte de la page fictive est indexée sur la famille FFIE du document — un
// accent porteur de sens pour le repli (jamais le SEUL signal : le sous-titre le dit
// en toutes lettres, P4).
const FAMILY_TONE: Record<DocFamily, ThumbTone> = {
  "Courants forts": "navy",
  "Sûreté / Sécurité Incendie": "amber",
  "Vie de l'entreprise": "slate",
  "Bâtiments connectés": "teal",
  "Performance énergétique": "green",
  Maintenance: "slate",
  "Types de documents": "navy",
  "Autres documents": "slate",
};

// Icône d'en-tête de section par famille FFIE — un repère visuel rapide pour
// chaque en-tête de carte (la colonne d'icônes que la maquette du client montre
// à côté du nom de section).
const FAMILY_ICON: Record<DocFamily, LucideIcon> = {
  "Courants forts": Zap,
  "Sûreté / Sécurité Incendie": Flame,
  "Vie de l'entreprise": Building2,
  "Bâtiments connectés": Wifi,
  "Performance énergétique": Gauge,
  Maintenance: Wrench,
  "Types de documents": FileText,
  "Autres documents": Files,
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
  // Afficher la vraie couverture FFIE ; en cas d'échec de chargement (hors ligne / 404)
  // basculer sur la version fictive.
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

// CountBadge — la pastille grise arrondie à droite de chaque en-tête de section
// (« N docs »), comptant l'ensemble des correspondances de la famille (pas seulement
// l'aperçu).
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

// SectionHeaderRow — la ligne en haut de carte qui nomme une famille : icône de
// famille, nom de la famille (en gras) et le compteur en direct. Se place dans la
// carte au-dessus des lignes de documents, avec un filet en dessous.
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

// SectionToggleRow — la ligne « Tout afficher (N) / Afficher moins » par section,
// en bas d'une carte de famille, affichée uniquement quand la famille compte plus de
// SECTION_PREVIEW documents. Reprend l'ancien « Afficher plus » global, limité à une
// famille.
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
      accessibilityLabel={expanded ? "Afficher moins de documents" : `Afficher les ${total} documents`}
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
          {expanded ? "Afficher moins" : `Tout afficher (${total})`}
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
  /** Quand un invité tape un document réservé aux adhérents, l'incitation à
   *  l'adhésion s'ouvre ; son CTA principal appelle ceci — le shell invité le pointe
   *  vers l'annuaire des fédérations (carte + liste départementale). Omis dans le
   *  shell adhérent (les adhérents peuvent ouvrir tous les documents, donc l'incitation
   *  n'apparaît jamais). */
  onApply?: () => void;
  /** CTA secondaire de cette incitation — « J'ai déjà un compte » → connexion. */
  onSignIn?: () => void;
  /** Incrémenté par le shell quand on retape l'onglet Bibliothèque alors qu'il est
   *  déjà actif. Referme un document / une incitation ouverts pour revenir à la liste. */
  resetSignal?: number;
  /** Déclenché avec `true` quand un détail de document ou l'incitation est ouvert,
   *  `false` de retour sur la liste. Le shell s'en sert pour masquer l'avatar flottant. */
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
  void density; // les lignes groupées gèrent désormais leur propre rythme
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { role } = useRole();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<SavedFilterKey>>(new Set());
  // Catégories FFIE cochées (clés = intitulés de facette de DOC_FILTER_GROUPS).
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  // Un document tapé ouvre soit son détail (accessible), soit l'incitation à
  // l'adhésion (un invité tapant un document verrouillé) — une seule surface à la
  // fois au-dessus de la liste.
  const [active, setActive] = useState<{ kind: "detail" | "locked"; doc: Doc } | null>(null);
  // Quelles sections de famille sont dépliées au-delà de leur aperçu. Réinitialisé à
  // tout changement de filtre pour qu'un nouvel ensemble de résultats s'ouvre toujours
  // replié.
  const [expandedSections, setExpandedSections] = useState<Set<DocFamily>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Les invités voient des cadenas sur les documents réservés aux adhérents ; les
  // adhérents/admins peuvent tout ouvrir.
  const canReadMemberContent = canAccess(role, "member-only");

  // Prévenir le shell quand une sous-vue (détail ou incitation) est ouverte pour qu'il
  // puisse masquer l'avatar flottant (pages principales uniquement).
  useEffect(() => {
    onDetailChange?.(active !== null);
  }, [active, onDetailChange]);

  // Retaper l'onglet Bibliothèque actif referme un document / une incitation ouverts
  // pour revenir à la liste. On saute l'exécution au montage pour que seuls de vrais
  // retaps la déclenchent.
  const isFirstResetRun = useRef(true);
  useEffect(() => {
    if (isFirstResetRun.current) {
      isFirstResetRun.current = false;
      return;
    }
    setActive(null);
  }, [resetSignal]);

  const openDoc = (doc: Doc) => {
    // Un invité tapant un document réservé aux adhérents obtient l'incitation, pas un
    // cul-de-sac (la règle du modèle d'accès : le contenu réservé redirige vers
    // connexion + adhésion, jamais un 403).
    const locked = doc.memberOnly && !canReadMemberContent;
    setActive({ kind: locked ? "locked" : "detail", doc });
    onDocPress?.(doc); // préserve tout hook externe (analytique, etc.)
  };

  const scrollToTop = (animated = true) => {
    scrollRef.current?.scrollTo({ y: 0, animated: animated && !reducedMotion });
  };

  // La recherche + les filtres catégorie + statut restreignent le corpus (gardé
  // dans l'ordre du site). Au sein d'une facette les puces sélectionnées sont en OU
  // — un document passe la facette catégorie s'il porte AU MOINS une catégorie
  // cochée ; les facettes sont en ET (p. ex. « IRVE » ET « Enregistré hors ligne »).
  const filtered = useMemo<Doc[]>(() => {
    const q = query.trim().toLowerCase();
    const hasStatusFilter = statusFilter.size > 0;
    // Catégories cochées normalisées une seule fois, pour une comparaison tolérante
    // aux accents/apostrophes face aux valeurs `category`/`categories` des docs.
    const selectedCats = categoryFilter.size > 0
      ? new Set([...categoryFilter].map(normCat))
      : null;
    return DOCS.filter((d) => {
      if (selectedCats && !docCategorySet(d).some((c) => selectedCats.has(normCat(c))))
        return false;
      const savedKey: SavedFilterKey = d.saved ? "saved" : "not-saved";
      if (hasStatusFilter && !statusFilter.has(savedKey)) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    });
  }, [query, statusFilter, categoryFilter]);

  // Tout changement de l'ensemble des résultats replie chaque section sur son aperçu.
  useEffect(() => {
    setExpandedSections(new Set());
  }, [query, statusFilter, categoryFilter]);

  // Regroupe le corpus filtré en sections de familles, dans l'ordre canonique des
  // familles, en écartant les familles sans correspondance (pour que la recherche/le
  // filtre restreigne aussi la liste des sections). Chaque section porte sa liste
  // complète de correspondances ; le plafond d'aperçu est appliqué au rendu.
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

  const activeFilterCount = statusFilter.size + categoryFilter.size;
  const cachedCount = useMemo(() => DOCS.filter((d) => d.saved).length, []);

  // Bascule une clé dans/hors d'un filtre à valeur d'ensemble (de façon immuable).
  const toggleIn = <K,>(set: React.Dispatch<React.SetStateAction<Set<K>>>) => (key: K) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Une section repliable par famille FFIE (reproduisant la barre latérale de
  // filtre du site), chacune listant ses catégories en puces — puis la facette
  // Hors ligne (état du cache appareil, propre à l'app, gardée en dernier). Toutes
  // les sections famille partagent le même `categoryFilter` ; chaque section ne
  // reçoit que le sous-ensemble coché de SES options pour que le compteur
  // d'accordéon (et la réinitialisation) restent justes.
  const filterSections: FilterSection[] = [
    ...DOC_FILTER_GROUPS.map((g) => ({
      label: g.family,
      options: g.options.map((o) => ({ key: o, label: o })),
      selected: new Set(g.options.filter((o) => categoryFilter.has(o))),
      onToggle: toggleIn(setCategoryFilter) as (key: string) => void,
    })),
    {
      label: "Hors ligne",
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
    // L'invité a tapé un document réservé aux adhérents → l'incitation partagée. Son
    // CTA principal (onApply) est pointé vers l'annuaire des fédérations (carte + liste
    // départementale) par le shell invité ; le CTA secondaire ouvre la connexion.
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
    // Le titre de page vit désormais dans l'AppHeader partagé (shell) ; le contenu se
    // rend directement en dessous.
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
        {/* Champ de recherche arrondi style iOS + bouton de filtre en ligne */}
        <View
          style={{
            paddingHorizontal: GUTTER,
            marginBottom: 14,
            flexDirection: "row",
            alignItems: "center",
            columnGap: 10,
          }}
        >
          {/* Toute la barre est un Pressable qui donne le focus au champ, pour que les
              taps sur l'icône / la marge (et pas seulement l'étroite zone de texte)
              fassent apparaître le clavier. */}
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
              placeholder="Rechercher des documents"
              placeholderTextColor={t.text.placeholder}
              style={{ flex: 1, alignSelf: "stretch", color: t.text.body, fontSize: 16 }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Rechercher un document"
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
                ? `Filtrer les documents, ${activeFilterCount} actif${activeFilterCount === 1 ? "" : "s"}`
                : "Filtrer les documents"
            }
          />
        </View>

        {/* Nombre de résultats — reprend la ligne « 335 documents » du site FFIE. */}
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

        {/* Bandeau hors ligne — P2 pas-de-cul-de-sac */}
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

        {/* Liste de documents — une carte de section par famille FFIE, chacune coiffée
            de son nom + un compteur en direct (la mise en page sectionnée du client). */}
        {sections.length === 0 ? (
          <View style={{ padding: 48, alignItems: "center" }}>
            <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>Aucun document.</Text>
            <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
              Essayez « Notec », « Mesh » ou « électrification ».
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
                          ? "Réservé aux adhérents"
                          : doc.saved
                            ? "Enregistré hors ligne"
                            : "Non enregistré hors ligne"
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

      {/* Retour en haut — apparaît une fois défilé vers le bas. Empilé au-dessus du
          bouton flottant de l'assistant Claude (qui occupe le coin) plutôt que de le
          chevaucher. */}
      {showBackToTop ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour en haut"
          onPress={() => scrollToTop()}
          style={({ pressed }) => ({
            position: "absolute",
            right: GUTTER,
            bottom: BACK_TO_TOP_LIFT,
            // Même diamètre que le bouton flottant de l'assistant au-dessus duquel il s'empile.
            width: ASSISTANT_FAB_SIZE,
            height: ASSISTANT_FAB_SIZE,
            borderRadius: ASSISTANT_FAB_SIZE / 2,
            backgroundColor: pressed ? t.action.primary.bgPressed : t.action.primary.bg,
            alignItems: "center",
            justifyContent: "center",
            // Le détacher de la liste.
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
        // FFIE-13 — les groupes de filtres (une famille FFIE par groupe, puis Hors
        // ligne) sont des accordéons repliables, fermés par défaut à chaque ouverture ;
        // déplier un groupe révèle ses puces et la liste se restreint en direct à
        // chaque sélection.
        collapsibleSections
        resultCount={filtered.length}
        onReset={() => {
          setCategoryFilter(new Set());
          setStatusFilter(new Set());
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}
