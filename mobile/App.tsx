// FFIE mobile — racine.
// v0.7 : navigation par onglets en bas, adaptée au rôle.
//
// Expérience adhérent (Julien) : Bibliothèque / Actualités / Partenaires / Profil.
// Invités : PublicPlaceholder pour l'instant — les onglets invité (Découvrir /
// Actualités / Partenaires / Adhérer à la FFIE) arriveront à la prochaine
// itération.
//
// La barre d'onglets est faite maison (src/components/navigation/BottomTabBar.tsx) ;
// son contrat est compatible avec react-navigation pour que le remplacement,
// le jour où un routeur arrivera, soit mécanique. Chaque clé d'onglet est
// associée à un écran via renderMemberTab ; l'état des onglets vit dans
// MainSurface pour persister entre les re-rendus déclenchés par le commutateur
// de rôle de débogage.
//
// En v1 (auth simulée), le rôle est initialisé par le choix de parcours et
// peut être cyclé en direct via RoleDebugSwitcher (puce en haut à droite).
// Mettre ENABLE_ROLE_DEBUG = false pour le masquer en production.

import React, { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { themes, type ThemeName, type DensityMode } from "@tokens";
import { FONTS } from "@/theme/fonts";
import { HomeScreen, type HomeNavTarget } from "@/screens/HomeScreen";
import { DocLibraryScreen } from "@/screens/DocLibraryScreen";
import { NewsScreen } from "@/screens/NewsScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { PartnersScreen } from "@/screens/PartnersScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { DiscoverScreen } from "@/screens/DiscoverScreen";
import { BecomeMemberScreen } from "@/screens/BecomeMemberScreen";
import { OnboardingFlow, type OnboardingResult } from "@/screens/onboarding/OnboardingFlow";
import { RoleProvider, roleFromOnboardingMode, useRole } from "@/auth/roleContext";
import { MembershipProvider } from "@/auth/membershipContext";
import { MembershipApplicationFlow } from "@/screens/membership/MembershipApplicationFlow";
import { AgendaModalScreen } from "@/screens/AgendaModalScreen";
import { MembersMapScreen } from "@/screens/MembersMapScreen";
import { FfieFiguresScreen } from "@/screens/FfieFiguresScreen";
import { LegalScreen } from "@/screens/legal/LegalScreen";
import { SignInFlow } from "@/screens/auth/SignInFlow";
import { ActiveTabProvider, useActiveTab } from "@/navigation/activeTabContext";
import { RequireRole } from "@/auth/RequireRole";
import { RoleDebugSwitcher } from "@/components/dev/RoleDebugSwitcher";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { AssistantChatWidget } from "@/components/assistant/AssistantChatWidget";
import { AppHeader } from "@/components/navigation/AppHeader";
import { TabSkeletonGate, skeletonForTab } from "@/components/skeletons";
import {
  MEMBER_TABS,
  GUEST_TABS,
  type MemberTabKey,
  type GuestTabKey,
  type TabKey,
} from "@/navigation/tabs";

// Ces valeurs deviendront contrôlables par l'utilisateur via un écran Réglages
// plus tard. Pour l'instant, elles correspondent à l'état de départ attendu de
// Julien (mobile, en ligne, confortable).
const themeName: ThemeName = "light";
const density: DensityMode = "comfortable";
const offline = false;

// Indicateur prototype v1 — laisser ON pour l'aperçu client, OFF pour les
// builds de production.
const ENABLE_ROLE_DEBUG = false;

// La fermeture par glissement d'un modal plein écran iOS dure ~0,5 s. Quand un
// parcours se termine en remplaçant toute la surface de l'app (invité →
// adhérent), on attend la fin de la fermeture avant le remplacement pour qu'un
// modal en train de se fermer ne reste jamais bloqué par-dessus l'écran suivant.
const MODAL_DISMISS_MS = 500;

// Titre de page affiché dans l'AppHeader persistant (bandeau de marque bleu
// marine) sur chaque onglet principal. Accueil est exclu — il affiche son
// propre en-tête plus riche (HomeHeader) à la place.
const TAB_TITLE: Record<TabKey, string> = {
  home: "Accueil",
  news: "Actualités",
  library: "Bibliothèque",
  partners: "Partenaires",
  discover: "Outils",
  profile: "Profil",
  // « join » est un onglet-action invité (ouvre la modale d'adhésion) ; il
  // n'affiche jamais d'AppHeader, mais l'entrée est requise pour le Record<TabKey>.
  join: "Adhérer",
};

type AppState =
  | { phase: "onboarding"; skipSplash?: boolean }
  | { phase: "main"; result: OnboardingResult };

// La police par défaut globale Raleway-400 pour <Text> est installée dans
// src/theme/installGlobalFont (importée en premier dans index.ts). L'ancienne
// approche Text.defaultProps est sans effet sous React 19 ; elle vivait ici
// auparavant et a silencieusement cessé de fonctionner — voir l'en-tête de ce
// fichier.

export default function App() {
  const [fontsLoaded] = useFonts(FONTS);

  if (!fontsLoaded) {
    // Maintient le splash natif / un canevas vide jusqu'à ce que les fichiers
    // de police soient en mémoire — le premier rendu doit être Raleway, jamais
    // la police système de repli.
    return null;
  }

  return (
    <SafeAreaProvider>
      <RoleProvider>
        <MembershipProvider>
          <ActiveTabProvider>
            <AppRoot />
          </ActiveTabProvider>
        </MembershipProvider>
      </RoleProvider>
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const [appState, setAppState] = useState<AppState>({ phase: "onboarding" });
  const { setRole } = useRole();
  const t = themes[themeName];

  const completeOnboarding = (result: OnboardingResult) => {
    setRole(roleFromOnboardingMode(result.mode));
    setAppState({ phase: "main", result });
  };

  // La déconnexion est complète : on efface le rôle de session (simulé) ET on
  // revient à l'écran de connexion / choix de parcours. Supprimer le rôle seul
  // laissait l'app en phase "main", qui retombe sur le shell invité
  // (Actualités) en tant qu'utilisateur public — c'est le bug que cela corrige.
  // skipSplash envoie l'utilisateur directement à l'écran de connexion au lieu
  // de rejouer le splash de lancement lors d'une déconnexion explicite.
  const handleSignOut = () => {
    setRole("guest-public");
    setAppState({ phase: "onboarding", skipSplash: true });
  };

  // skipSplash n'existe que sur la variante onboarding ; on le lit via un
  // ternaire de réduction de type pour rester sûr au niveau des types même
  // quand l'onboarding est contourné.
  const skipSplash = appState.phase === "onboarding" ? appState.skipSplash : false;

  return (
    <View style={{ flex: 1, backgroundColor: t.surface.default }}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />

      {appState.phase === "onboarding" ? (
        <OnboardingFlow
          themeName={themeName}
          onComplete={completeOnboarding}
          initialStep={skipSplash ? "path" : "splash"}
        />
      ) : (
        <MainSurface onSignOut={handleSignOut} />
      )}

      {ENABLE_ROLE_DEBUG && appState.phase === "main" ? (
        <RoleDebugSwitcher themeName={themeName} />
      ) : null}
    </View>
  );
}

// MainSurface : le rôle actif décide quelle surface de premier niveau s'affiche.
//   - Adhérent/Admin → MemberShell (Accueil / Actualités / Bibliothèque /
//     Partenaires / Métiers)
//   - Invité → GuestShell (Accueil / Actualités / Bibliothèque / Partenaires /
//     Métiers)
function MainSurface({ onSignOut }: { onSignOut: () => void }) {
  const { role } = useRole();

  if (role === "member" || role === "admin") {
    return <MemberShell onSignOut={onSignOut} />;
  }

  return <GuestShell />;
}

// MemberShell — l'habillage persistant pour Julien : contenu + barre d'onglets
// en bas. L'état des onglets vit ici pour survivre aux allers-retours du
// commutateur de rôle de débogage. `settingsOverlay` suit les appuis sur les
// rangées du Profil qui routent vers des sous-écrans (pour l'instant juste les
// Notifications) ; chacun arrive sous forme de Modal qui monte par le bas pour
// que la barre d'onglets adhérent reste montée en dessous.
function MemberShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<MemberTabKey>("home");
  const [settingsOverlay, setSettingsOverlay] = useState<"none" | "notifications">("none");
  // Modal Événements ("Agenda") plein écran, ouvert par le raccourci Agenda de
  // l'Accueil.
  const [agendaOpen, setAgendaOpen] = useState(false);
  // Modal « Carte des adhérents » (FFIE-16) plein écran, ouvert par le raccourci
  // « Trouver un pro » de l'Accueil.
  const [membersMapOpen, setMembersMapOpen] = useState(false);
  // Modal « La FFIE en chiffres » (FFIE-02), ouvert en touchant le logo FFIE de l'Accueil.
  const [figuresOpen, setFiguresOpen] = useState(false);
  // Modal « Conditions d'utilisation » (FFIE-18), ouvert depuis la rangée
  // « Conditions d'utilisation » du Profil.
  const [legalOpen, setLegalOpen] = useState(false);
  // Incrémenté à chaque fois que l'onglet déjà actif est ré-appuyé, pour qu'un
  // écran posé sur une sous-vue (p. ex. Actualités affichant un article,
  // Bibliothèque affichant un document) puisse revenir à sa racine. Passer à un
  // onglet *différent* le réinitialise déjà en remontant le gate ; ceci couvre
  // le cas du même onglet.
  const [resetSignal, setResetSignal] = useState(0);
  // Vrai tant qu'un onglet affiche une vue détail/sous-vue (p. ex. article
  // Actualités, document Bibliothèque). L'avatar flottant est masqué sur les
  // pages de détail — uniquement les pages principales.
  const [detailOpen, setDetailOpen] = useState(false);
  // Segment de lien profond en attente pour l'onglet Découvrir (Outils FFIE →
  // Outils, Nos métiers → Métiers) ; effacé à tout appui manuel sur la barre
  // d'onglets pour que le bouton de l'onglet ouvre son défaut (Métiers).
  const [tradesSegment, setTradesSegment] = useState<
    "trades" | "tools" | "videos" | null
  >(null);

  // Appui sur la barre d'onglets. Un onglet différent → on bascule (le gate se
  // remonte + rejoue son squelette). De nouveau l'onglet actif → on ramène cet
  // onglet à sa racine via resetSignal. Dans les deux cas on atterrit sur une
  // page principale, donc on efface l'indicateur de détail.
  const handleTabSelect = (key: TabKey) => {
    setDetailOpen(false);
    // Un appui manuel sur un onglet ouvre toujours le segment par défaut de
    // l'onglet.
    setTradesSegment(null);
    if (key === activeTab) setResetSignal((n) => n + 1);
    else setActiveTab(key as MemberTabKey);
  };

  const handleSignIn = () => {
    // Parcours réel : ouvrir le modal SignInFlow (LoginScreen). Pour la
    // simulation v1, le commutateur de rôle de débogage est le chemin de retour
    // vers "member".
  };
  const handleApply = () => {
    // Parcours réel : naviguer vers l'onglet Devenir adhérent + ouvrir le
    // formulaire de candidature. Pour la simulation v1, ceci est un stub sans
    // effet.
  };

  const handleProfileRowPress = (rowKey: string) => {
    if (rowKey === "signout") return onSignOut();
    if (rowKey === "notifications") setSettingsOverlay("notifications");
    if (rowKey === "legal") setLegalOpen(true);
    // Les autres rangées du Profil (région, centres d'intérêt, modifier le
    // profil, changer le mot de passe) sont encore des stubs ; les bascules de
    // notification sont désormais gérées dans l'écran lui-même.
  };

  return (
    <RequireRole
      access="member-only"
      themeName={themeName}
      onApply={handleApply}
      onSignIn={handleSignIn}
    >
      <View style={{ flex: 1, backgroundColor: themes[themeName].surface.default }}>
        {/* Barre d'état : claire par-dessus l'AppHeader bleu marine / l'en-tête
            Accueil ; sombre par-dessus une vue détail blanche (article ou
            document ouvert). */}
        <StatusBar style={detailOpen ? "dark" : "light"} />

        {/* En-tête de marque persistant sur chaque onglet sauf Accueil et
            Profil (chacun affiche son propre en-tête bleu marine) et tant qu'une
            vue détail est ouverte (elle apporte sa propre barre de retour). */}
        {activeTab !== "home" && activeTab !== "profile" && !detailOpen ? (
          <AppHeader
            title={TAB_TITLE[activeTab]}
            variant="member"
            hasUnread
            onPressNotifications={() => setSettingsOverlay("notifications")}
            onPressSearch={() => {
              // TODO : ouvrir la recherche globale quand la surface de recherche
              // arrivera.
            }}
            // Le bouton profil de l'en-tête a été retiré : le Profil vit désormais
            // uniquement dans la barre d'onglets du bas (onglet « Profil »).
          />
        ) : null}

        <View style={{ flex: 1 }}>
          {/* Chaque onglet s'ouvre sur un bref squelette qui reflète sa mise en
              page, puis bascule sur l'écran réel. Clé sur activeTab pour que le
              changement d'onglet remonte le gate et rejoue la phase de
              chargement. */}
          <TabSkeletonGate
            key={activeTab}
            skeleton={skeletonForTab(activeTab, themeName)}
          >
            {renderMemberTab(activeTab, {
              onProfileRowPress: handleProfileRowPress,
              onOpenProfile: () => setActiveTab("profile"),
              onOpenFigures: () => setFiguresOpen(true),
              onOpenSearch: () => {
                // TODO : ouvrir la recherche globale quand la surface de
                // recherche arrivera.
              },
              onHomeNavigate: (target) => {
                // Agenda ouvre le modal Événements plein écran (pas un onglet).
                if (target === "agenda") return setAgendaOpen(true);
                // "Trouver un pro" ouvre la Carte des adhérents plein écran (FFIE-16).
                if (target === "find-pro") return setMembersMapOpen(true);
                // "tools" ouvre le segment Outils (les calculateurs y vivent) ;
                // "trades" ouvre le segment carrières.
                setTradesSegment(
                  target === "tools" ? "tools" : target === "trades" ? "trades" : null,
                );
                // Associe chaque carte de l'Accueil à l'onglet qui héberge sa
                // destination.
                const map: Partial<Record<HomeNavTarget, MemberTabKey>> = {
                  docs: "library",
                  tools: "discover", // Onglet Découvrir → segment Outils
                  trades: "discover", // Onglet Découvrir → segment Métiers
                  partners: "partners",
                  news: "news",
                };
                const next = map[target];
                if (next) setActiveTab(next);
              },
              tradesSegment,
              resetSignal,
              onDetailChange: setDetailOpen,
            })}
          </TabSkeletonGate>
        </View>
        <BottomTabBar
          tabs={MEMBER_TABS}
          activeKey={activeTab}
          onSelect={handleTabSelect}
          themeName={themeName}
        />

        {/* L'avatar de compte qui flottait ici est désormais l'action profil
            dans l'AppHeader (onglets hors Accueil) et le bloc d'identité
            cliquable sur l'en-tête Accueil — le disque flottant est donc
            retiré. */}

        {/* Assistant flottant propulsé par Claude — FAB d'angle → panneau de
            discussion. Monté ici (par-dessus le jeu d'onglets, sous les Modals
            plein écran) pour qu'il chevauche chaque onglet adhérent. Maquette
            uniquement ; voir AssistantChatWidget. */}
        <AssistantChatWidget />

        {/* Réglages des notifications — Modal qui monte par le bas.
            SafeAreaProvider neuf pour que l'inset ne se cumule pas à travers la
            vue hôte du modal natif (voir OnboardingFlow pour le même
            correctif). */}
        <Modal
          visible={settingsOverlay === "notifications"}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setSettingsOverlay("none")}
        >
          <SafeAreaProvider>
            <NotificationsScreen onBack={() => setSettingsOverlay("none")} />
          </SafeAreaProvider>
        </Modal>

        {/* Modal Agenda (Événements) plein écran — ouvert par le raccourci
            "Agenda" de l'Accueil. SafeAreaProvider neuf selon le correctif de
            cumul d'inset. Les adhérents ne sont jamais verrouillés, donc aucun
            CTA d'upsell n'est branché ici. */}
        <Modal
          visible={agendaOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setAgendaOpen(false)}
        >
          <SafeAreaProvider>
            <AgendaModalScreen
              themeName={themeName}
              onClose={() => setAgendaOpen(false)}
            />
          </SafeAreaProvider>
        </Modal>

        {/* Carte des adhérents (FFIE-16) plein écran — ouverte par le raccourci
            « Trouver un pro ». SafeAreaProvider neuf (fix du cumul d'inset). */}
        <Modal
          visible={membersMapOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setMembersMapOpen(false)}
        >
          <SafeAreaProvider>
            <MembersMapScreen
              themeName={themeName}
              onClose={() => setMembersMapOpen(false)}
            />
          </SafeAreaProvider>
        </Modal>

        {/* Modal « La FFIE en chiffres » (FFIE-02) plein écran — ouvert en touchant
            le logo FFIE de l'en-tête Accueil. SafeAreaProvider neuf (correctif de
            cumul d'inset). */}
        <Modal
          visible={figuresOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setFiguresOpen(false)}
        >
          <SafeAreaProvider>
            <FfieFiguresScreen themeName={themeName} onClose={() => setFiguresOpen(false)} />
          </SafeAreaProvider>
        </Modal>

        {/* Modal « Conditions d'utilisation » (FFIE-18) plein écran — ouvert
            depuis la rangée À propos du Profil. SafeAreaProvider neuf (correctif
            de cumul d'inset). */}
        <Modal
          visible={legalOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setLegalOpen(false)}
        >
          <SafeAreaProvider>
            <LegalScreen themeName={themeName} onClose={() => setLegalOpen(false)} />
          </SafeAreaProvider>
        </Modal>
      </View>
    </RequireRole>
  );
}

function renderMemberTab(
  tab: MemberTabKey,
  actions: {
    onProfileRowPress: (rowKey: string) => void;
    onOpenProfile: () => void;
    onOpenFigures: () => void;
    onOpenSearch: () => void;
    onHomeNavigate: (target: HomeNavTarget) => void;
    tradesSegment: "trades" | "tools" | "videos" | null;
    resetSignal: number;
    onDetailChange: (isDetail: boolean) => void;
  }
) {
  switch (tab) {
    case "home":
      return (
        <HomeScreen
          themeName={themeName}
          onOpenNotifications={() => actions.onProfileRowPress("notifications")}
          onOpenProfile={actions.onOpenProfile}
          onOpenFigures={actions.onOpenFigures}
          onOpenSearch={actions.onOpenSearch}
          onNavigate={actions.onHomeNavigate}
        />
      );
    case "library":
      return (
        <DocLibraryScreen
          themeName={themeName}
          density={density}
          offline={offline}
          resetSignal={actions.resetSignal}
          onDetailChange={actions.onDetailChange}
          onDocPress={() => {
            // TODO : naviguer vers le Détail du document (Écran 2) quand il
            // arrivera.
          }}
        />
      );
    case "news":
      return (
        <NewsScreen
          themeName={themeName}
          resetSignal={actions.resetSignal}
          onDetailChange={actions.onDetailChange}
        />
      );
    case "partners":
      return <PartnersScreen themeName={themeName} />;
    case "discover":
      // Métiers — carrières, formation, ressources externes. Public et
      // autonome, désormais aussi présent dans la nav adhérent (Julien).
      return (
        <DiscoverScreen
          themeName={themeName}
          resetSignal={actions.resetSignal}
          initialSegment={actions.tradesSegment ?? undefined}
        />
      );
    case "profile":
      return <ProfileScreen themeName={themeName} onRowPress={actions.onProfileRowPress} />;
  }
}

// GuestShell — l'habillage persistant pour Karim + Léa : contenu + barre
// d'onglets en bas. Chaque onglet invité est en accès public, donc aucun
// wrapper RequireRole n'est nécessaire ici (la vérification d'accès dans
// tabs.tsx est là par symétrie / pour un usage futur). L'état des onglets vit
// ici pour survivre aux allers-retours du commutateur de rôle de débogage.
function GuestShell() {
  const [activeTab, setActiveTab] = useState<GuestTabKey>("home");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // Le CTA "Adhérer" flotte désormais en haut à droite de chaque page invité et
  // ouvre l'annuaire des fédérations (BecomeMemberScreen) sous forme de modal
  // qui monte par le bas, plutôt que d'occuper un emplacement de la barre
  // d'onglets.
  const [becomeMemberOpen, setBecomeMemberOpen] = useState(false);
  // Modal Événements ("Agenda") plein écran, ouvert par le raccourci Agenda de
  // l'Accueil.
  const [agendaOpen, setAgendaOpen] = useState(false);
  // Modal « Carte des adhérents » (FFIE-16) plein écran, ouvert par le raccourci
  // « Trouver un pro » de l'Accueil.
  const [membersMapOpen, setMembersMapOpen] = useState(false);
  // Modal « La FFIE en chiffres » (FFIE-02), ouvert en touchant le logo FFIE de l'Accueil.
  const [figuresOpen, setFiguresOpen] = useState(false);
  // Modal « Conditions d'utilisation » (FFIE-18), ouvert depuis le lien légal du
  // bas de l'écran d'adhésion (BecomeMemberScreen). Imbriqué DANS le modal
  // d'adhésion (voir plus bas) — sur iOS un modal frère à la racine ne peut pas
  // s'afficher tant que celui de l'adhésion est ouvert.
  const [legalOpen, setLegalOpen] = useState(false);
  // Ré-appuyer sur l'onglet actif le ramène à sa racine (p. ex. Actualités
  // affichant un article) ; changer d'onglet le réinitialise déjà en remontant
  // le gate.
  const [resetSignal, setResetSignal] = useState(0);
  // Vrai tant qu'un onglet affiche une vue détail/sous-vue (article Actualités,
  // document Bibliothèque). L'avatar flottant est masqué sur les pages de
  // détail — uniquement les pages principales.
  const [detailOpen, setDetailOpen] = useState(false);
  // Segment de lien profond en attente pour l'onglet Métiers (Outils FFIE →
  // Calculateurs) ; effacé à tout appui manuel sur la barre d'onglets. Voir
  // MemberShell pour la justification.
  const [tradesSegment, setTradesSegment] = useState<
    "trades" | "tools" | "videos" | null
  >(null);
  const { setRole } = useRole();
  const { setActiveTab: publishActiveTab } = useActiveTab();

  const handleTabSelect = (key: TabKey) => {
    // Tout appui sur la barre d'onglets atterrit sur une page principale
    // (bascule ou retour à la racine).
    setDetailOpen(false);
    // Un appui manuel sur un onglet ouvre toujours le segment par défaut de
    // l'onglet.
    setTradesSegment(null);
    // « Adhérer » est un onglet-action : il ouvre l'annuaire d'adhésion en modale
    // (l'ancien rôle du bouton « Adhérer » de l'en-tête) plutôt que de basculer
    // vers un écran — il ne devient donc jamais l'onglet actif.
    if (key === "join") return setBecomeMemberOpen(true);
    if (key === activeTab) setResetSignal((n) => n + 1);
    else setActiveTab(key as GuestTabKey);
  };

  // Publie l'onglet invité actif pour que le commutateur de débogage flottant
  // puisse se cantonner à une surface (la puce Réinitialiser de l'adhésion ne
  // s'affiche que sur Adhérer-FFIE). On l'efface au démontage (p. ex. quand le
  // rôle bascule vers adhérent).
  useEffect(() => {
    publishActiveTab(activeTab);
    return () => publishActiveTab(null);
  }, [activeTab, publishActiveTab]);

  // Depuis n'importe quelle surface invité, candidater ou se connecter promeut
  // la session.
  // Simulation v1 :
  //   - Le CTA flottant "Adhérer" et les upsells Actualités / réservés aux
  //     adhérents ouvrent tous l'annuaire des fédérations (BecomeMemberScreen)
  //     sous forme de modal — l'étape d'entonnoir douce avant le formulaire.
  //   - Le formulaire de candidature s'ouvre en modal montant par le bas
  //     (openApplication).
  //   - "J'ai déjà un compte" ouvre le parcours de connexion e-mail → OTP ;
  //     un code vérifié promeut la session vers adhérent.
  const goToJoin = () => setBecomeMemberOpen(true);
  const openApplication = () => setApplicationOpen(true);
  const openSignIn = () => setSignInOpen(true);
  const authenticate = () => {
    // On ferme D'ABORD les modals, puis on promeut vers adhérent une fois qu'ils
    // ont glissé hors champ. Basculer le rôle immédiatement démonte le shell
    // invité en pleine fermeture, ce qui peut laisser un modal bloqué par-dessus
    // la page Actualités adhérent.
    //
    // Deux chemins d'entrée partagent ce gestionnaire, et ils diffèrent par leur
    // profondeur de modal :
    //   - Depuis l'annuaire (avatar → Adhérer → "Se connecter") : la popup de
    //     connexion est IMBRIQUÉE dans le modal de l'annuaire. iOS ne peut pas
    //     fermer un modal présentateur (l'annuaire) tant que son enfant présenté
    //     (la connexion) est encore affiché — faire les deux dans le même tick
    //     arrache le contrôleur de vue de l'enfant en pleine fermeture et laisse
    //     un ÉCRAN NOIR. On ferme donc l'enfant, on attend qu'il finisse de
    //     glisser hors champ, PUIS on ferme le parent, PUIS (après qu'il a lui
    //     aussi glissé hors champ) on promeut le rôle.
    //   - Depuis Actualités, etc. (aucun annuaire ouvert) : seul le modal de
    //     connexion est affiché, donc rien à échelonner — on le ferme et on
    //     promeut après un seul glissement.
    // Les deux shells s'ouvrent sur Accueil, donc le bref échange
    // invité→adhérent sous le modal qui se ferme est invisible — l'utilisateur
    // atterrit simplement sur Accueil, connecté.
    setSignInOpen(false);
    if (becomeMemberOpen) {
      setTimeout(() => setBecomeMemberOpen(false), MODAL_DISMISS_MS);
      setTimeout(() => setRole("member"), MODAL_DISMISS_MS * 2);
    } else {
      setTimeout(() => setRole("member"), MODAL_DISMISS_MS);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themes[themeName].surface.default }}>
      {/* Barre d'état : claire par-dessus l'AppHeader bleu marine / l'en-tête
          Accueil ; sombre par-dessus une vue détail blanche (article ou
          document ouvert). */}
      <StatusBar style={detailOpen ? "dark" : "light"} />

      {/* En-tête de marque persistant sur chaque onglet sauf Accueil (son
          propre en-tête) et tant qu'une vue détail est ouverte. */}
      {activeTab !== "home" && !detailOpen ? (
        <AppHeader
          title={TAB_TITLE[activeTab]}
          variant="guest"
          onPressSearch={() => {
            // TODO : ouvrir la recherche globale quand la surface de recherche
            // arrivera.
          }}
          // Le bouton « Adhérer » de l'en-tête a été retiré : l'adhésion vit
          // désormais dans l'onglet-action « Adhérer » de la barre du bas.
        />
      ) : null}

      <View style={{ flex: 1 }}>
        {/* Bref squelette adapté à la mise en page à chaque ouverture d'onglet,
            puis l'écran réel. Clé sur activeTab pour qu'un changement d'onglet
            rejoue la phase de chargement. */}
        <TabSkeletonGate
          key={activeTab}
          skeleton={skeletonForTab(activeTab, themeName)}
        >
          {renderGuestTab(activeTab, {
            onApply: goToJoin,
            onSignIn: openSignIn,
            onStartApplication: openApplication,
            onOpenFigures: () => setFiguresOpen(true),
            onOpenSearch: () => {
              // TODO : ouvrir la recherche globale quand la surface de recherche
              // arrivera.
            },
            onHomeNavigate: (target) => {
              // Invités : "find-pro" ouvre la Carte des adhérents (FFIE-16) ;
              // "agenda" ouvre le modal Événements plein écran ; le reste est
              // associé à l'onglet invité correspondant.
              if (target === "find-pro") return setMembersMapOpen(true);
              if (target === "agenda") return setAgendaOpen(true);
              // "tools" ouvre le segment Outils (les calculateurs y vivent) ;
              // "trades" ouvre le segment carrières.
              setTradesSegment(
                target === "tools" ? "tools" : target === "trades" ? "trades" : null,
              );
              const map: Partial<Record<HomeNavTarget, GuestTabKey>> = {
                docs: "library",
                tools: "discover", // Onglet Découvrir → segment Outils
                trades: "discover", // Onglet Découvrir → segment Métiers
                partners: "partners",
                news: "news",
              };
              const next = map[target];
              if (next) setActiveTab(next);
            },
            tradesSegment,
            resetSignal,
            onDetailChange: setDetailOpen,
          })}
        </TabSkeletonGate>
      </View>
      <BottomTabBar
        tabs={GUEST_TABS}
        activeKey={activeTab}
        onSelect={handleTabSelect}
        themeName={themeName}
      />

      {/* L'avatar de compte qui flottait ici est désormais l'action d'adhésion
          dans l'AppHeader (onglets hors Accueil) et le CTA "Adhérer à la FFIE"
          sur l'en-tête Accueil — le disque flottant est donc retiré. */}

      {/* Assistant flottant propulsé par Claude — même widget d'angle que le
          shell adhérent, disponible aussi pour les invités public/entreprise.
          Maquette uniquement. */}
      <AssistantChatWidget />

      {/* Annuaire des fédérations ("Adhérer") — Modal qui monte par le bas
          par-dessus le shell invité, pour que la barre d'onglets reste montée en
          dessous. SafeAreaProvider neuf selon le correctif de cumul d'inset
          utilisé ailleurs. Le CTA "Se connecter" en bas ouvre la popup de
          connexion e-mail → OTP, imbriquée dans ce modal pour qu'elle s'affiche
          *par-dessus* la carte + la liste (un modal frère à la racine ne peut
          pas s'afficher tant que celui-ci est ouvert sur iOS). */}
      <Modal
        visible={becomeMemberOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setBecomeMemberOpen(false)}
      >
        <SafeAreaProvider>
          <BecomeMemberScreen
            themeName={themeName}
            onClose={() => setBecomeMemberOpen(false)}
            onLogin={openSignIn}
            onOpenLegal={() => setLegalOpen(true)}
          />
          {/* Conditions d'utilisation (FFIE-18) — imbriquées dans le modal
              d'adhésion pour surgir par-dessus l'annuaire (un frère à la racine
              ne pourrait pas s'afficher tant que ce modal est ouvert). */}
          <Modal
            visible={legalOpen}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setLegalOpen(false)}
          >
            <SafeAreaProvider>
              <LegalScreen themeName={themeName} onClose={() => setLegalOpen(false)} />
            </SafeAreaProvider>
          </Modal>
          {/* Connexion imbriquée : surgit par-dessus l'annuaire ; annuler y
              ramène. Une connexion réussie appelle authenticate() (promeut vers
              adhérent). "Adhérer à la FFIE" ferme simplement la connexion —
              l'annuaire en dessous est déjà l'entonnoir d'adhésion. */}
          <SignInFlow
            visible={signInOpen}
            onClose={() => setSignInOpen(false)}
            onAuthenticated={authenticate}
            onJoin={() => setSignInOpen(false)}
          />
        </SafeAreaProvider>
      </Modal>

      {/* "J'ai déjà un compte" depuis Actualités, etc. (aucun annuaire ouvert)
          → connexion. Monté uniquement quand l'annuaire est fermé, pour ne
          jamais entrer en conflit avec l'instance imbriquée ci-dessus sur le
          même état signInOpen. "Adhérer à la FFIE" ferme la connexion, puis
          ouvre l'annuaire d'adhésion. */}
      {becomeMemberOpen ? null : (
        <SignInFlow
          visible={signInOpen}
          onClose={() => setSignInOpen(false)}
          onAuthenticated={authenticate}
          onJoin={() => {
            setSignInOpen(false);
            setTimeout(() => setBecomeMemberOpen(true), MODAL_DISMISS_MS);
          }}
        />
      )}

      {/* Candidature d'adhésion — Modal qui monte par le bas par-dessus le
          shell invité, pour que la barre d'onglets reste montée en dessous.
          SafeAreaProvider neuf selon le même correctif de cumul d'inset utilisé
          ailleurs. */}
      <Modal
        visible={applicationOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setApplicationOpen(false)}
      >
        <SafeAreaProvider>
          <MembershipApplicationFlow
            themeName={themeName}
            onClose={() => setApplicationOpen(false)}
          />
        </SafeAreaProvider>
      </Modal>

      {/* Modal Agenda (Événements) plein écran — ouvert par le raccourci
          "Agenda" de l'Accueil. Un invité qui touche un événement réservé aux
          adhérents tombe sur l'upsell à l'intérieur du modal ; ses CTA ferment
          D'ABORD CE modal, puis (après le glissement) ouvrent l'entonnoir
          d'adhésion / connexion, pour que deux modals plein écran ne se
          disputent jamais sur iOS — le même motif de fermeture échelonnée
          utilisé ci-dessus. */}
      <Modal
        visible={agendaOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAgendaOpen(false)}
      >
        <SafeAreaProvider>
          <AgendaModalScreen
            themeName={themeName}
            onClose={() => setAgendaOpen(false)}
            onApply={() => {
              setAgendaOpen(false);
              setTimeout(goToJoin, MODAL_DISMISS_MS);
            }}
            onSignIn={() => {
              setAgendaOpen(false);
              setTimeout(openSignIn, MODAL_DISMISS_MS);
            }}
          />
        </SafeAreaProvider>
      </Modal>

      {/* Carte des adhérents (FFIE-16) plein écran — ouverte par le raccourci
          « Trouver un pro ». SafeAreaProvider neuf (fix du cumul d'inset). */}
      <Modal
        visible={membersMapOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMembersMapOpen(false)}
      >
        <SafeAreaProvider>
          <MembersMapScreen
            themeName={themeName}
            onClose={() => setMembersMapOpen(false)}
          />
        </SafeAreaProvider>
      </Modal>

      {/* Modal « La FFIE en chiffres » (FFIE-02) plein écran — ouvert en touchant
          le logo FFIE de l'en-tête Accueil. SafeAreaProvider neuf (cumul d'inset). */}
      <Modal
        visible={figuresOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setFiguresOpen(false)}
      >
        <SafeAreaProvider>
          <FfieFiguresScreen themeName={themeName} onClose={() => setFiguresOpen(false)} />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

function renderGuestTab(
  tab: GuestTabKey,
  actions: {
    onApply: () => void;
    onSignIn: () => void;
    onStartApplication: () => void;
    onOpenFigures: () => void;
    onOpenSearch: () => void;
    onHomeNavigate: (target: HomeNavTarget) => void;
    tradesSegment: "trades" | "tools" | "videos" | null;
    resetSignal: number;
    onDetailChange: (isDetail: boolean) => void;
  }
) {
  switch (tab) {
    case "home":
      // Les invités voient l'en-tête de bienvenue ; "Adhérer à la FFIE" ouvre
      // l'annuaire des fédérations (la même étape d'entonnoir douce que le CTA
      // flottant ailleurs).
      return (
        <HomeScreen
          themeName={themeName}
          onJoin={actions.onApply}
          onOpenFigures={actions.onOpenFigures}
          onOpenSearch={actions.onOpenSearch}
          onNavigate={actions.onHomeNavigate}
        />
      );
    case "discover":
      // L'onglet Métiers est entièrement public (P6) et autonome — uniquement
      // carrières, formation et liens vers des ressources externes.
      return (
        <DiscoverScreen
          themeName={themeName}
          resetSignal={actions.resetSignal}
          initialSegment={actions.tradesSegment ?? undefined}
        />
      );
    case "news":
      // Les invités peuvent tomber sur des articles réservés aux adhérents → on
      // transmet les CTA d'upsell pour que le teaser Actualités route vers
      // Adhérer / connexion comme le reste du shell.
      return (
        <NewsScreen
          themeName={themeName}
          resetSignal={actions.resetSignal}
          onApply={actions.onApply}
          onSignIn={actions.onSignIn}
          onDetailChange={actions.onDetailChange}
        />
      );
    case "partners":
      return <PartnersScreen themeName={themeName} />;
    case "join":
      // Onglet-action : son appui ouvre la modale d'adhésion (handleTabSelect) sans
      // changer l'onglet actif, donc ce cas n'est jamais rendu. Présent pour
      // l'exhaustivité du type GuestTabKey.
      return null;
    case "library":
      // La Bibliothèque fait désormais aussi partie de l'expérience invité —
      // les non-adhérents parcourent le même annuaire de documents (simulation
      // v1 : accès complet).
      return (
        <DocLibraryScreen
          themeName={themeName}
          density={density}
          offline={offline}
          resetSignal={actions.resetSignal}
          onDetailChange={actions.onDetailChange}
          // Un invité qui touche un document verrouillé obtient l'upsell ;
          // "Demander l'adhésion" ouvre l'annuaire des fédérations (carte +
          // liste départementale), "J'ai déjà un compte" ouvre la connexion —
          // même entonnoir que le teaser Actualités.
          onApply={actions.onApply}
          onSignIn={actions.onSignIn}
          onDocPress={() => {
            // TODO : naviguer vers le Détail du document (Écran 2) quand il
            // arrivera.
          }}
        />
      );
  }
}
