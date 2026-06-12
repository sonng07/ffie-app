// Onglet Actualités — flux d'articles → lecteur, partagé par tous les personas (Epic 2).
//
// Disposition : un rail horizontal de pastilles de catégorie se trouve sous le
// grand titre (« Tous » + une pastille par NewsCategory, sélection unique), puis
// chaque article se rend comme une carte pleine largeur sur une seule colonne,
// dans l'ordre de publication. Choisir une pastille filtre toute la liste sur
// place ; « Tous » la restaure.
//
// Navigation : NewsScreen est une pile native autonome (Feed → Article /
// Locked) via @react-navigation/native-stack, de sorte que le lecteur obtient
// nativement les gestes de retour de la plateforme — balayage depuis le bord
// gauche sur iOS et retour système Android. Toucher un article ouvre le lecteur.
// Un invité qui touche un article réservé aux adhérents est plutôt redirigé vers
// l'incitation à l'adhésion — la frontière public/adhérent dans les Actualités,
// qui sert aussi de surface de conversion.
//
// La restriction par rôle utilise le canAccess() partagé pour rester cohérente
// avec les gardes de route ailleurs. onApply / onSignIn sont transmis à
// l'incitation par le shell invité ; les adhérents n'atteignent jamais la branche verrouillée.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { ArrowUp } from "lucide-react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Pagination } from "@/components/ui/Pagination";
import { LockTag } from "@/components/ui/LockTag";
import {
  ARTICLES,
  NEWS_IMAGE_ASPECT_RATIO,
  NEWS_IMAGE_PIXELS,
  type Article,
  type NewsCategory,
} from "@/data/news";
import { NavigationContainer, useNavigationContainerRef, StackActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { canAccess, useRole } from "@/auth/roleContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  ASSISTANT_FAB_SIZE,
  ASSISTANT_FAB_GAP,
} from "@/components/assistant/AssistantChatWidget";
import { NewsArticleScreen } from "./NewsArticleScreen";
import { MemberOnlyPrompt } from "./MemberOnlyPrompt";

// Catégories par lesquelles les utilisateurs peuvent filtrer le flux — le rail de
// pastilles en haut du flux. Sélection unique : « Tous » montre tout, une
// pastille de catégorie restreint la liste à cette catégorie. À garder en phase
// avec l'union NewsCategory dans data/news.ts.
type CategoryKey = NewsCategory | "all";
const CATEGORY_PILLS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "Technical", label: "Technique" },
  { key: "Training", label: "Formation" },
  { key: "Communication", label: "Communication" },
  { key: "Economical", label: "Économie" },
];

// Rythme vertical entre les cartes pleine largeur dans la colonne du flux.
const ROW_GAP = 18;

// Profondeur de défilement (px) au-delà de laquelle le bouton flottant retour en
// haut apparaît en fondu. Correspond au seuil utilisé sur le flux Bibliothèque
// pour une sensation cohérente entre les onglets.
const BACK_TO_TOP_AT = 520;

// Le bouton flottant de l'assistant Claude (AssistantChatWidget) occupe le coin
// inférieur droit. Ce bouton vit dans la zone de contenu de l'écran, qui se
// trouve déjà AU-DESSUS de la barre d'onglets (l'inset inférieur y est absorbé) —
// il est donc mesuré depuis le haut de la barre d'onglets, et non depuis le bord
// de l'appareil, et n'a besoin d'aucun inset de safe-area. Le bouton flottant
// s'élève de ASSISTANT_FAB_GAP + ASSISTANT_FAB_SIZE dans cet espace, donc ce
// bouton s'empile un espace de 12pt au-dessus de lui.
const BACK_TO_TOP_LIFT = ASSISTANT_FAB_GAP + ASSISTANT_FAB_SIZE + 12;

// L'onglet Actualités est une pile native pour que le lecteur d'article obtienne
// gratuitement les vraies affordances de retour de la plateforme : le retour par
// balayage depuis le bord gauche d'iOS et le retour système d'Android (bouton ou
// balayage de navigation gestuelle) dépilent tous deux la pile nativement — pas
// besoin de BackHandler maison. La barre d'onglets du bas vit au-dessus de ceci
// dans le shell, elle reste donc visible pendant qu'un écran est empilé.
//
// Les routes ne transportent qu'un id d'article — les params de react-navigation
// doivent être sérialisables (il avertit sur les objets/fonctions), donc chaque
// écran résout l'article depuis ARTICLES par id plutôt que de recevoir l'objet.
type NewsStackParamList = {
  Feed: undefined;
  Article: { id: number };
  Locked: { id: number };
};

const Stack = createNativeStackNavigator<NewsStackParamList>();

export function NewsScreen({
  themeName = "light",
  onApply,
  onSignIn,
  resetSignal,
  onDetailChange,
}: {
  themeName?: ThemeName;
  onApply?: () => void;
  onSignIn?: () => void;
  /** Incrémenté par le shell quand l'onglet Actualités est re-touché alors qu'il
   *  est déjà actif. On l'utilise pour dépiler la pile jusqu'au flux depuis un article ouvert. */
  resetSignal?: number;
  /** Déclenché avec `true` quand une sous-vue (lecteur d'article, invite réservée
   *  aux adhérents) est empilée, `false` de retour sur le flux. Le shell l'utilise
   *  pour masquer l'avatar de compte flottant sur les pages de détail — il
   *  n'appartient qu'aux pages principales. */
  onDetailChange?: (isDetail: boolean) => void;
}) {
  const reducedMotion = useReducedMotion();
  const navRef = useNavigationContainerRef<NewsStackParamList>();

  // Re-toucher l'onglet Actualités actif dépile le lecteur/l'incitation jusqu'au flux.
  // On ignore la première exécution (montage) pour ne réagir qu'aux véritables re-touches.
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
    <NavigationContainer
      ref={navRef}
      // Signaler si l'on est sur une sous-vue empilée (tout sauf le flux) pour
      // que le shell puisse masquer l'avatar flottant sur les pages de détail.
      onStateChange={(state) => {
        if (!state) return;
        const route = state.routes[state.index];
        onDetailChange?.(route?.name !== "Feed");
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // chaque écran dessine son propre en-tête iOS-HIG
          // Le mouvement réduit est non négociable (P5) : on réduit la transition
          // d'empilement/dépilement à une coupe instantanée. Le geste de retour
          // par balayage depuis le bord gauche reste activé dans tous les cas —
          // c'est une entrée, pas un mouvement décoratif.
          animation: reducedMotion ? "none" : "default",
        }}
      >
        <Stack.Screen name="Feed">
          {({ navigation }) => (
            <NewsFeed
              themeName={themeName}
              onOpenArticle={(id) => navigation.navigate("Article", { id })}
              onOpenLocked={(id) => navigation.navigate("Locked", { id })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Article">
          {({ navigation, route }) => (
            <ArticleRoute
              id={route.params.id}
              themeName={themeName}
              onBack={() => navigation.goBack()}
              // Précédent/suivant remplace l'article courant : le retour (bouton ou
              // balayage) ramène toujours au flux et le lecteur se remonte en haut,
              // conformément au comportement d'avant la pile.
              onNavigateId={(id) => navigation.replace("Article", { id })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Locked">
          {({ navigation }) => (
            <MemberOnlyPrompt
              themeName={themeName}
              onBack={() => navigation.goBack()}
              onApply={onApply}
              onSignIn={onSignIn}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ArticleRoute — résout l'id d'article de la route en lecteur et calcule les
// voisins précédent/suivant dans l'ordre du flux (précédent est null sur le
// premier article, suivant sur le dernier → les boutons de navigation dans
// l'article s'y désactivent).
function ArticleRoute({
  id,
  themeName,
  onBack,
  onNavigateId,
}: {
  id: number;
  themeName: ThemeName;
  onBack: () => void;
  onNavigateId: (id: number) => void;
}) {
  const idx = ARTICLES.findIndex((a) => a.id === id);
  const article = idx >= 0 ? ARTICLES[idx] : null;

  // Défensif : un id inconnu (ne devrait pas arriver) dépile simplement jusqu'au flux.
  useEffect(() => {
    if (!article) onBack();
  }, [article, onBack]);
  if (!article) return null;

  const prev = idx > 0 ? ARTICLES[idx - 1] : null;
  const next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;

  return (
    <NewsArticleScreen
      article={article}
      themeName={themeName}
      onBack={onBack}
      prev={prev}
      next={next}
      onNavigate={(a) => onNavigateId(a.id)}
    />
  );
}

// NewsFeed — le flux lui-même (rail de catégories + cartes sur une colonne +
// pagination). Détient l'état de filtre/pagination ; il reste monté sous un
// article empilé (pile native), de sorte que la position de défilement et la
// catégorie active survivent à l'aller-retour.
function NewsFeed({
  themeName = "light",
  onOpenArticle,
  onOpenLocked,
}: {
  themeName?: ThemeName;
  onOpenArticle: (id: number) => void;
  onOpenLocked: (id: number) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { role } = useRole();
  const reducedMotion = useReducedMotion();
  const [category, setCategory] = useState<CategoryKey>("all");

  // « Retour en haut » flottant — la réf de défilement du flux, plus un drapeau de
  // visibilité que le gestionnaire de défilement bascule une fois que l'utilisateur
  // est assez bas pour vouloir un raccourci.
  const scrollRef = useRef<ScrollView>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollToTop = (animated = true) => {
    scrollRef.current?.scrollTo({ y: 0, animated: animated && !reducedMotion });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = y > BACK_TO_TOP_AT;
    if (next !== showBackToTop) setShowBackToTop(next);
  };

  // Pagination purement visuelle. Les flèches déplacent l'indicateur et basculent
  // leur propre état désactivé aux extrémités ; elles ne repaginent pas encore réellement le flux.
  const TOTAL_PAGES = 130;
  const [page, setPage] = useState(1);

  const canReadMemberContent = canAccess(role, "member-only");

  // Tout le flux répond au rail — pas d'exemption pour un article vedette/hero.
  const filtered = useMemo<Article[]>(
    () =>
      category === "all"
        ? ARTICLES
        : ARTICLES.filter((a) => a.category === category),
    [category],
  );

  // Un invité qui touche un article réservé aux adhérents obtient l'incitation ;
  // tous les autres, le lecteur. La frontière public/adhérent dans les Actualités.
  const open = (a: Article) => {
    if (a.memberOnly && !canReadMemberContent) onOpenLocked(a.id);
    else onOpenArticle(a.id);
  };

  return (
    // Le titre de page vit désormais dans l'AppHeader partagé (shell) ; le
    // contenu se rend directement en dessous.
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
      >
        {/* Rail de catégories — pastilles de filtre défilables horizontalement
            sous le grand titre. La sélection change l'état instantanément (sans
            animation), il n'y a donc rien à conditionner au mouvement réduit. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 6, marginBottom: 16 }}
          contentContainerStyle={{ paddingHorizontal: GUTTER, columnGap: 8 }}
        >
          {CATEGORY_PILLS.map((p) => (
            <CategoryPill
              key={p.key}
              label={p.label}
              selected={category === p.key}
              themeName={themeName}
              onPress={() => setCategory(p.key)}
            />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: GUTTER, paddingTop: 4 }}>
          {filtered.length > 0 ? (
            <View style={{ rowGap: ROW_GAP }}>
              {filtered.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  themeName={themeName}
                  locked={a.memberOnly && !canReadMemberContent}
                  onPress={() => open(a)}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: t.text.muted, fontSize: 15, marginBottom: 6 }}>
                Aucun article dans cette catégorie.
              </Text>
              <Text style={{ color: t.text.muted, fontSize: 13, opacity: 0.8, textAlign: "center" }}>
                Choisissez une autre catégorie pour en voir plus.
              </Text>
            </View>
          )}
        </View>

        {/* Indicateur de page — visuel uniquement. Les flèches se désactivent à la première/dernière page. */}
        <Pagination
          themeName={themeName}
          page={page}
          totalPages={TOTAL_PAGES}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
          onJump={(p) => setPage(p)}
        />
      </ScrollView>

      {/* Retour en haut — apparaît en fondu une fois défilé vers le bas. Empilé
          au-dessus du bouton flottant de l'assistant Claude (qui occupe le coin)
          plutôt que de le chevaucher. */}
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// CategoryPill — une pastille de filtre dans le rail. Sélectionnée = remplissage
// teal[700] de la marque (assorti au contrôle segmenté + aux actions primaires)
// avec un libellé blanc ; non sélectionnée = surface de carte avec une bordure fine.
// L'état est exposé aux technologies d'assistance via accessibilityState, et le
// renforcement de graisse garde la sélection lisible au-delà du changement de couleur (P4).
// ---------------------------------------------------------------------------
function CategoryPill({
  label,
  selected,
  themeName,
  onPress,
}: {
  label: string;
  selected: boolean;
  themeName: ThemeName;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      // La pastille de 38pt seule rate le plancher tactile de 44pt — hitSlop comble
      // le déficit vertical sans gonfler le visuel.
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => ({
        height: 38,
        paddingHorizontal: 16,
        borderRadius: primitives.radii.full,
        backgroundColor: selected
          ? primitives.colors.brand.teal[700]
          : pressed ? t.border.subtle : c.cardBg,
        // Bordure dans les deux états pour que la pastille ne change pas de taille à la sélection.
        borderWidth: 1,
        borderColor: selected ? primitives.colors.brand.teal[700] : (c.cardBorder ?? t.border.subtle),
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          color: selected ? "#FFFFFF" : t.text.body,
          fontSize: 14,
          fontFamily: ralewayFamily(selected ? "600" : "500"),
          fontWeight: selected ? "600" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// CategoryTag — pastille portant la catégorie de l'article. Couleur + libellé
// (jamais la couleur seule, P4). `muted` rend le traitement verrouillé/réservé aux adhérents.
// ---------------------------------------------------------------------------
function CategoryTag({
  label,
  themeName,
  muted = false,
}: {
  label: string;
  themeName: ThemeName;
  muted?: boolean;
}) {
  const t = themes[themeName];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: muted ? t.surface.subtle : t.brand.accent,
        borderRadius: primitives.radii.full,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          color: muted ? t.text.muted : "#FFFFFF",
          fontSize: 10.5,
          fontFamily: ralewayFamily("600"),
          fontWeight: "600",
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ArticleCard — une carte pleine largeur dans le flux à une colonne : image 16:9,
// étiquette de catégorie, titre en Raleway, date. L'extrait reste hors de la carte
// (il se lit dans l'article) mais est conservé dans le libellé d'accessibilité pour le contexte.
// ---------------------------------------------------------------------------
function ArticleCard({
  article,
  themeName,
  locked,
  onPress,
}: {
  article: Article;
  themeName: ThemeName;
  locked: boolean;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.title}.${locked ? " Réservé aux adhérents." : ""} ${article.excerpt}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? t.border.subtle : c.cardBg,
        borderRadius: primitives.radii.lg,
        borderWidth: c.cardBorder ? 1 : 0,
        borderColor: c.cardBorder,
        overflow: "hidden",
        transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
      })}
    >
      <RemoteImage
        seed={`ffie-news-${article.id}`}
        uri={article.imageUrl}
        width="100%"
        aspectRatio={NEWS_IMAGE_ASPECT_RATIO}
        pixelWidth={NEWS_IMAGE_PIXELS.width}
        pixelHeight={NEWS_IMAGE_PIXELS.height}
        themeName={themeName}
        accessibilityLabel={`Illustration pour ${article.title}`}
      />

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 9 }}>
          <CategoryTag label={article.category} themeName={themeName} muted={locked} />
          <View style={{ flex: 1 }} />
          {locked ? <LockTag themeName={themeName} /> : null}
        </View>

        <Text
          style={{
            color: t.text.body,
            fontSize: 17,
            lineHeight: 22,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
          numberOfLines={3}
        >
          {article.title}
        </Text>

        <Text style={{ color: t.text.muted, fontSize: 12, marginTop: 9, opacity: 0.85 }}>
          {article.date}
        </Text>
      </View>
    </Pressable>
  );
}
