// Onglet Profil — compte adhérent, qualifications et réglages.
//
// S'ouvre sur un « hero d'identité » bleu marine (avatar + nom + intitulé de
// poste + ligne adhérent), reprenant le motif du hero de l'Accueil : une
// surface de marque bleu marine fixe qui déborde derrière la barre d'état. La
// coquille (App.tsx) masque l'AppHeader persistant sur cet onglet pour que le
// hero occupe seul le haut — une seule région bleu marine, pas deux.
//
// En dessous, des listes groupées encartées (look Réglages iOS, via les
// primitives partagées de ios.tsx) accueillent, dans l'ordre :
//   • Mon entreprise  — raison sociale, région, SIRET (faits de compte en lecture seule)
//   • Qualifications  — certifications métier + un badge « Valide » chacune
//   • Notifications push / Types d'alertes — l'interrupteur principal + les bascules
//     par catégorie (pastilles colorées). État d'UI local uniquement — il n'y a pas de
//     backend de notifications en v1 (voir NotificationsScreen / CLAUDE.md).
//   • Préférences     — région affichée, centres d'intérêt (ébauches)
//   • Compte          — modifier le profil, changer le mot de passe, se déconnecter
//
// L'identité + l'entreprise + les qualifications viennent de src/data/member.ts
// pour que l'app reste cohérente partout où l'adhérent connecté apparaît (hero
// de l'Accueil, ici). Les lignes délèguent au parent via onRowPress ; « signout »
// est géré par la coquille (efface la session simulée + retour à la connexion),
// le reste sont des ébauches.

import React, { useState } from "react";
import {
  Building2,
  Check,
  Globe,
  Hash,
  Lock,
  LogOut,
  MapPin,
  ScrollText,
  SlidersHorizontal,
  SquarePen,
  type LucideIcon,
} from "lucide-react-native";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { useRole } from "@/auth/roleContext";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { HEADER_SURFACE } from "@/theme/brandHeader";
import {
  GUTTER,
  InsetGroup,
  InsetRow,
  useGroupedColors,
} from "@/components/ui/ios";
import { currentMember } from "@/data/member";
import {
  ChangePasswordSheet,
  EditProfileSheet,
  INTEREST_OPTIONS,
  InterestsSheet,
  RegionPickerSheet,
  type EditableProfile,
  type InterestKey,
} from "@/screens/settings/ProfileSettingsSheets";

// --- fixed brand-surface colours (teal hero, shared with HomeHeader) --------
const SURFACE = HEADER_SURFACE; // turquoise de marque derrière le hero d'identité
const WHITE = primitives.colors.white;
const AVATAR = primitives.colors.white; // pastille de monogramme blanche — assortie à la pastille du logo de l'en-tête
const INITIALS = primitives.colors.brand.teal[800]; // #045764 — AAA sur l'avatar blanc

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ROLE_LINE = withAlpha(WHITE, 0.72); // ligne d'intitulé de poste atténuée sur le bleu marine
const TOP_GAP = Platform.OS === "android" ? 14 : 12; // assorti à Home/AppHeader

// Le véritable « Liquid Glass » d'iOS 26 (UIGlassEffect) n'existe que sur iOS 26+.
// isLiquidGlassAvailable() vaut false sur Android et les iOS plus anciens, où
// GlassView retomberait silencieusement sur une simple View — on branche donc
// nous-mêmes dessus pour afficher à la place une capsule de jeton givrée
// intentionnelle (voir GlassSwitch). Lu une seule fois au chargement du module :
// l'OS d'un appareil ne peut pas changer en cours de session.
const LIQUID_GLASS = isLiquidGlassAvailable();

// État ACTIVÉ par défaut pour chaque catégorie d'alerte sauf les offres
// partenaires, conformément à la maquette. Local uniquement — pas de
// persistance/backend en v1.
type AlertKey = "news" | "events" | "regulatory" | "trainings" | "partners";

export function ProfileScreen({
  themeName = "light",
  onRowPress,
}: {
  themeName?: ThemeName;
  onRowPress?: (rowKey: string) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const m = currentMember;

  // Bascules de notification — état d'UI local. L'interrupteur principal commande
  // tout le groupe d'alertes ; quand il est éteint, les interrupteurs par catégorie
  // apparaissent désactivés.
  const [pushEnabled, setPushEnabled] = useState(true);
  const [alerts, setAlerts] = useState<Record<AlertKey, boolean>>({
    news: true,
    events: true,
    regulatory: true,
    trainings: true,
    partners: false,
  });
  const toggleAlert = (key: AlertKey) =>
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));

  // État de compte modifiable — local à cette session (la v1 est une UI simulée ;
  // les feuilles de réglages valident et appliquent ici mais ne se synchronisent
  // pas à un serveur). Le hero de l'Accueil lit toujours le currentMember d'origine,
  // donc les modifications faites ici n'y sont pas répercutées tant qu'un vrai
  // magasin de profil n'est pas en place.
  const [profile, setProfile] = useState<EditableProfile & { region: string }>({
    fullName: m.fullName,
    jobTitle: m.jobTitle,
    companyName: m.company.name,
    region: m.region,
  });
  const [interests, setInterests] = useState<InterestKey[]>([
    "regulatory",
    "training",
    "events",
  ]);
  // Quelle feuille de réglages est ouverte (une à la fois).
  const [sheet, setSheet] = useState<"none" | "edit" | "password" | "region" | "interests">(
    "none"
  );
  const closeSheet = () => setSheet("none");

  // Monogramme dérivé du nom (modifiable) pour que l'avatar reste synchronisé.
  const initials =
    profile.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || m.initials;

  const interestsSummary =
    interests.length === INTEREST_OPTIONS.length
      ? "Tous"
      : interests.length > 0
        ? `${interests.length} sélectionné${interests.length > 1 ? "s" : ""}`
        : "Aucun";

  const handlePress = (rowKey: string) => onRowPress?.(rowKey);

  return (
    <View style={{ flex: 1, backgroundColor: c.pageBg }}>
      {/* Contenu de barre d'état clair (horloge / signal) par-dessus le hero bleu marine. */}
      <StatusBar style="light" />

      {/* Fond turquoise derrière la barre d'état pour qu'un rebond de sur-défilement
          en haut révèle la couleur de l'en-tête, pas la page en dessous (même
          astuce que HomeScreen). Il n'apparaît qu'AU-DESSUS du hero — le conteneur
          aux couleurs de la page sous le hero le recouvre pour tout le contenu. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 200, backgroundColor: SURFACE }}
      />

      {/* contentInsetAdjustmentBehavior="never" : le hero applique lui-même
          l'inset de zone sûre du haut, donc iOS ne doit pas non plus insérer
          automatiquement le contenu défilant (cela le compterait en double).
          flexGrow permet au conteneur de contenu aux couleurs de la page de
          remplir jusqu'en bas même quand la liste est courte. */}
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Hero d'identité (bleu marine) --------------------------- */}
        <View style={[styles.hero, { paddingTop: insets.top + TOP_GAP }]}>
          <View
            style={styles.avatar}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${profile.fullName}, monogramme`}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
              {profile.fullName}
            </Text>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {profile.jobTitle}
            </Text>
            <Text style={styles.memberLine} numberOfLines={1}>
              {role === "admin" ? "Admin" : "Adhérent"} · N° {m.memberNo} · {profile.region}
            </Text>
          </View>
        </View>

        {/* Conteneur aux couleurs de la page pour tout ce qui est SOUS le hero.
            Il recouvre le fond turquoise pour que la couleur de l'en-tête
            n'entoure que le bloc d'identité ; le contenu groupé repose sur le
            fond de page normal comme les autres onglets. flexGrow remplit toute
            hauteur restante sous le dernier groupe. */}
        <View style={{ flexGrow: 1, backgroundColor: c.pageBg, paddingBottom: 32 }}>
          {/* Petit espace au-dessus du premier groupe pour que l'en-tête turquoise
              se lise comme une bande distincte avant le début du contenu groupé. */}
          <View style={{ height: 12 }} />

          {/* ---- Mon entreprise (faits de compte en lecture seule) ------- */}
          <InsetGroup header="Mon entreprise" themeName={themeName}>
          <FactRow icon={Building2} title="Raison sociale" value={profile.companyName} themeName={themeName} />
          <FactRow icon={MapPin} title="Région" value={profile.region} themeName={themeName} />
          <FactRow icon={Hash} title="SIRET" value={m.company.siret} themeName={themeName} isLast />
        </InsetGroup>

        {/* ---- Qualifications ----------------------------------------- */}
        <InsetGroup header="Qualifications" themeName={themeName}>
          {m.qualifications.map((q, i) => (
            <InsetRow
              key={q.label}
              leading={<LeadingIcon icon={Check} color={t.feedback.success} />}
              leadingWidth={LEAD_ICON_W}
              title={q.label}
              trailing={q.valid ? <ValidBadge themeName={themeName} /> : undefined}
              themeName={themeName}
              isLast={i === m.qualifications.length - 1}
              accessibilityLabel={`${q.label}, ${q.valid ? "valide" : "non valide"}`}
            />
          ))}
        </InsetGroup>

        {/* ---- Notifications push (interrupteur principal) ------------- */}
        <InsetGroup header="Notifications push" themeName={themeName}>
          <InsetRow
            leading={<LeadingDot color={t.brand.accent} />}
            leadingWidth={LEAD_DOT_W}
            title="Activer les notifications"
            trailing={
              <GlassSwitch
                value={pushEnabled}
                onToggle={() => setPushEnabled((p) => !p)}
                accessibilityLabel="Activer les notifications"
                themeName={themeName}
              />
            }
            themeName={themeName}
            isLast
          />
        </InsetGroup>

        {/* ---- Types d'alertes (bascules par catégorie) --------------- */}
        <InsetGroup
          header="Types d'alertes"
          footer="Désactivez les notifications ci-dessus pour suspendre toutes les alertes d'un coup."
          themeName={themeName}
        >
          {ALERT_ROWS.map((row, i) => (
            <InsetRow
              key={row.key}
              leading={<LeadingDot color={dotColor(row.tone, t)} />}
              leadingWidth={LEAD_DOT_W}
              title={row.title}
              trailing={
                <GlassSwitch
                  value={pushEnabled && alerts[row.key]}
                  onToggle={() => toggleAlert(row.key)}
                  disabled={!pushEnabled}
                  accessibilityLabel={row.title}
                  themeName={themeName}
                />
              }
              themeName={themeName}
              isLast={i === ALERT_ROWS.length - 1}
            />
          ))}
        </InsetGroup>

        {/* ---- Préférences -------------------------------------------- */}
        <InsetGroup header="Préférences" themeName={themeName}>
          <InsetRow
            leading={<LeadingIcon icon={Globe} color={t.text.muted} />}
            leadingWidth={LEAD_ICON_W}
            title="Région affichée"
            value={profile.region}
            themeName={themeName}
            onPress={() => setSheet("region")}
          />
          <InsetRow
            leading={<LeadingIcon icon={SlidersHorizontal} color={t.text.muted} />}
            leadingWidth={LEAD_ICON_W}
            title="Centres d'intérêt"
            value={interestsSummary}
            themeName={themeName}
            isLast
            onPress={() => setSheet("interests")}
          />
        </InsetGroup>

        {/* ---- Compte ------------------------------------------------ */}
        <InsetGroup header="Compte" themeName={themeName}>
          <InsetRow
            leading={<LeadingIcon icon={SquarePen} color={t.text.muted} />}
            leadingWidth={LEAD_ICON_W}
            title="Modifier le profil"
            themeName={themeName}
            onPress={() => setSheet("edit")}
          />
          <InsetRow
            leading={<LeadingIcon icon={Lock} color={t.text.muted} />}
            leadingWidth={LEAD_ICON_W}
            title="Changer le mot de passe"
            themeName={themeName}
            onPress={() => setSheet("password")}
          />
          <InsetRow
            leading={<LeadingIcon icon={LogOut} color={t.feedback.danger} />}
            leadingWidth={LEAD_ICON_W}
            title="Se déconnecter"
            themeName={themeName}
            isLast
            destructive
            showChevron={false}
            onPress={() => handlePress("signout")}
          />
        </InsetGroup>

        {/* ---- À propos (informations légales) ------------------------ */}
        <InsetGroup header="À propos" themeName={themeName}>
          <InsetRow
            leading={<LeadingIcon icon={ScrollText} color={t.text.muted} />}
            leadingWidth={LEAD_ICON_W}
            title="Conditions d'utilisation"
            themeName={themeName}
            isLast
            accessibilityHint="Ouvre les conditions d'utilisation de l'application"
            onPress={() => handlePress("legal")}
          />
        </InsetGroup>

          <Text style={{ textAlign: "center", fontSize: 12, color: t.text.muted, opacity: 0.7 }}>
            FFIE mobile v0.7 · aperçu du design
          </Text>
        </View>
      </ScrollView>

      {/* Éditeurs de réglages — fonctionnels mais locaux/simulés (pas de backend
          en v1). Un seul ouvert à la fois, commandé par `sheet`. */}
      <EditProfileSheet
        visible={sheet === "edit"}
        initial={{
          fullName: profile.fullName,
          jobTitle: profile.jobTitle,
          companyName: profile.companyName,
        }}
        onClose={closeSheet}
        onSave={(next) => {
          setProfile((p) => ({ ...p, ...next }));
          closeSheet();
        }}
        themeName={themeName}
      />
      <ChangePasswordSheet
        visible={sheet === "password"}
        onClose={closeSheet}
        onUpdated={closeSheet}
        themeName={themeName}
      />
      <RegionPickerSheet
        visible={sheet === "region"}
        selected={profile.region}
        onClose={closeSheet}
        onSelect={(region) => {
          setProfile((p) => ({ ...p, region }));
          closeSheet();
        }}
        themeName={themeName}
      />
      <InterestsSheet
        visible={sheet === "interests"}
        selected={interests}
        onClose={closeSheet}
        onSave={(next) => {
          setInterests(next);
          closeSheet();
        }}
        themeName={themeName}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Largeurs des visuels de tête — passées à InsetRow.leadingWidth pour que les
// séparateurs fins s'insèrent et s'alignent sous le titre de la ligne (le
// détail iOS).
// ---------------------------------------------------------------------------
const LEAD_ICON_W = 24;
const LEAD_DOT_W = 12;

// Une icône de ligne simple (non encadrée) dans une boîte de largeur fixe, pour
// que les différents glyphes de tête s'alignent et que les séparateurs tombent
// de façon cohérente sous le titre.
function LeadingIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <View style={{ width: LEAD_ICON_W, alignItems: "center" }}>
      <Icon size={20} color={color} strokeWidth={2} />
    </View>
  );
}

// Une petite pastille de statut colorée (catégories d'alertes / interrupteur push principal).
function LeadingDot({ color }: { color: string }) {
  return (
    <View style={{ width: LEAD_DOT_W, alignItems: "center" }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

// Une bascule de notification qui flotte sur un plateau Liquid Glass.
//
// Sur iOS 26, la capsule est l'UIGlassEffect natif d'Apple (via le GlassView
// d'expo-glass-effect) : elle réfracte tout ce qui défile derrière elle et se
// déforme/lentille sous le toucher (`isInteractive`). Le Switch au-dessus est le
// contrôle natif ordinaire — le verre n'est que la surface sur laquelle il
// repose, donc le comportement/l'accessibilité sont inchangés. On fixe
// `colorScheme` au thème de l'app plutôt qu'à « auto » pour que le verre ne suive
// pas l'apparence de l'OS indépendamment de notre bascule.
//
// Sur Android / iOS < 26 (LIQUID_GLASS === false), GlassView n'a aucun effet
// système à rendre, on lui substitue donc une capsule givrée construite à partir
// de jetons — un léger remplissage d'accent + une bordure fine — pour que la
// bascule se lise toujours comme un plateau intentionnel plutôt qu'un interrupteur
// nu. On ne descend jamais l'opacité propre de GlassView sous 1 (le module avertit
// que cela casse l'effet) ; l'état désactivé est porté par le Switch seul.
function GlassSwitch({
  value,
  onToggle,
  disabled = false,
  accessibilityLabel,
  themeName,
}: {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  const sw = (
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      // Couleurs d'interrupteur façon iOS — piste « activée » turquoise (accent de marque), neutre désactivée.
      trackColor={{ false: t.border.strong, true: t.brand.accent }}
      thumbColor={WHITE}
      ios_backgroundColor={t.border.strong}
    />
  );

  if (LIQUID_GLASS) {
    return (
      <GlassView
        style={styles.glassCapsule}
        glassEffectStyle="regular"
        isInteractive
        colorScheme={themeName === "dark" ? "dark" : "light"}
      >
        {sw}
      </GlassView>
    );
  }

  // Repli (Android / iOS < 26) : une capsule de jeton givrée, sans verre natif.
  return (
    <View
      style={[
        styles.glassCapsule,
        {
          backgroundColor: withAlpha(t.brand.accent, 0.06),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: withAlpha(t.brand.accent, 0.18),
        },
      ]}
    >
      {sw}
    </View>
  );
}

// Ligne « fait » en lecture seule — icône de tête simple, libellé, valeur alignée
// à droite, pas de chevron (informatif, non cliquable).
function FactRow({
  icon,
  title,
  value,
  themeName,
  isLast = false,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  themeName: ThemeName;
  isLast?: boolean;
}) {
  const t = themes[themeName];
  return (
    <InsetRow
      leading={<LeadingIcon icon={icon} color={t.text.muted} />}
      leadingWidth={LEAD_ICON_W}
      title={title}
      value={value}
      themeName={themeName}
      isLast={isLast}
      accessibilityLabel={`${title}: ${value}`}
    />
  );
}

// Badge « Valide » — pastille verte discrète (sans icône), utilisée dans les
// Qualifications. Lit les jetons « success subtle » pour correspondre à la
// palette de StatusPill sans en reprendre la machinerie d'icône/animation.
function ValidBadge({ themeName }: { themeName: ThemeName }) {
  const sub = themes[themeName].feedback.subtle.success;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: primitives.radii.full,
        backgroundColor: sub.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: sub.border,
      }}
    >
      <Text
        style={{
          color: sub.fg,
          fontSize: 12,
          fontFamily: ralewayFamily("600"),
          fontWeight: "600",
          letterSpacing: 0.1,
        }}
      >
        Valide
      </Text>
    </View>
  );
}

// Catégories d'alertes + leur teinte de pastille. L'ordre correspond à la maquette.
type AlertTone = "accent" | "warning" | "danger" | "success" | "muted";
const ALERT_ROWS: { key: AlertKey; title: string; tone: AlertTone }[] = [
  { key: "news", title: "Actualités FFIE", tone: "accent" },
  { key: "events", title: "Rappels d'événements", tone: "warning" },
  { key: "regulatory", title: "Alertes réglementaires", tone: "danger" },
  { key: "trainings", title: "Nouvelles formations", tone: "success" },
  { key: "partners", title: "Offres partenaires", tone: "muted" },
];

function dotColor(tone: AlertTone, t: (typeof themes)[ThemeName]): string {
  switch (tone) {
    case "accent":
      return t.brand.accent;
    case "warning":
      return t.feedback.warning;
    case "danger":
      return t.feedback.danger;
    case "success":
      return t.feedback.success;
    case "muted":
      return t.text.muted;
  }
}

const styles = StyleSheet.create({
  // Plateau Liquid Glass épousant le Switch de notification. Une pastille
  // entièrement arrondie avec juste assez de marge pour se lire comme une capsule
  // autour du contrôle ; borderRadius + overflow:hidden gardent à la fois le verre
  // natif et le remplissage de repli rognés à la pastille. L'UIGlassEffect natif
  // fournit sa propre profondeur, donc pas d'ombre ici.
  glassCapsule: {
    borderRadius: primitives.radii.full,
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Barre d'identité compacte — réglée sur le même rythme vertical que l'AppHeader
  // des autres onglets (paddingBottom 16, rangée de contenu d'environ 52pt) pour que
  // la bande turquoise se lise comme un en-tête, pas comme un grand hero. Un avatar
  // de 44pt + une identité serrée sur trois lignes tiennent dans cette hauteur tout
  // en conservant chaque détail.
  hero: {
    backgroundColor: SURFACE,
    paddingHorizontal: GUTTER,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AVATAR,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: INITIALS,
    fontSize: 16,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  name: {
    color: WHITE,
    fontSize: 19,
    lineHeight: 23,
    fontFamily: displayFamily("700"),
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  jobTitle: {
    color: ROLE_LINE,
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: ralewayFamily("500"),
    fontWeight: "500",
    marginTop: 1,
  },
  memberLine: {
    // Blanc (pas l'ancien accent turquoise, qui disparaîtrait sur le hero turquoise).
    color: WHITE,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: ralewayFamily("600"),
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 2,
  },
});
