// FFIE mobile — root.
// v0.7: role-aware bottom tab navigation.
//
// Member experience (Julien): Library / News / Partners / Profile.
// Guests: PublicPlaceholder for now — guest tabs (Discover / News /
// Partners / Join FFIE) land in the next iteration.
//
// The tab bar is home-rolled (src/components/navigation/BottomTabBar.tsx);
// the contract is wire-compatible with react-navigation so the swap-in
// when a router lands is mechanical. Each tab key maps to a screen via
// renderMemberTab; tab state lives in MainSurface so it persists across
// re-renders triggered by the role debug switcher.
//
// In v1 (mock auth) the role is seeded by the path-selection tap and
// can be cycled live via RoleDebugSwitcher (top-right chip). Set
// ENABLE_ROLE_DEBUG = false to hide for real launch.

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

// These will become user-controlled via a Settings screen later. For now they
// default to Julien's expected starting state (mobile, online, comfortable).
const themeName: ThemeName = "light";
const density: DensityMode = "comfortable";
const offline = false;

// v1 prototype flag — keep ON for client preview, OFF for production builds.
const ENABLE_ROLE_DEBUG = false;

// iOS fullScreen modal slide-dismiss runs ~0.5s. When a flow ends by swapping
// the whole app surface (guest → member), wait the dismissal out before the
// swap so a closing modal never strands over the next screen.
const MODAL_DISMISS_MS = 500;

// Page title shown in the persistent AppHeader (navy branded bar) on each main
// tab. Home is excluded — it renders its own richer hero (HomeHeader) instead.
const TAB_TITLE: Record<TabKey, string> = {
  home: "Home",
  news: "News",
  library: "Library",
  partners: "Partners",
  discover: "Tools",
  profile: "Profile",
};

type AppState =
  | { phase: "onboarding"; skipSplash?: boolean }
  | { phase: "main"; result: OnboardingResult };

// The global Raleway-400 default for <Text> is installed in
// src/theme/installGlobalFont (imported first in index.ts). The old
// Text.defaultProps approach is a no-op under React 19, so it lived here
// before and silently stopped working — see that file's header.

export default function App() {
  const [fontsLoaded] = useFonts(FONTS);

  if (!fontsLoaded) {
    // Hold the native splash / a blank canvas until the font files are in
    // memory — first paint should be Raleway, never the system fallback.
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

  // Sign out is a full logout: clear the (mock) session role AND return to the
  // login / path-selection screen. Dropping the role alone left the app in the
  // "main" phase, which falls through to the guest shell (News) as a public
  // user — the bug this fixes. skipSplash sends the user straight to the login
  // screen instead of replaying the launch splash on an explicit logout.
  const handleSignOut = () => {
    setRole("guest-public");
    setAppState({ phase: "onboarding", skipSplash: true });
  };

  // skipSplash only exists on the onboarding variant; read it through a
  // narrowing ternary so it stays type-safe even while onboarding is bypassed.
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

// MainSurface: the live role decides which top-level surface renders.
//   - Member/Admin → MemberShell (Home / News / Library / Partners / Trades)
//   - Guest → GuestShell (Home / News / Library / Partners / Trades)
function MainSurface({ onSignOut }: { onSignOut: () => void }) {
  const { role } = useRole();

  if (role === "member" || role === "admin") {
    return <MemberShell onSignOut={onSignOut} />;
  }

  return <GuestShell />;
}

// MemberShell — the persistent chrome for Julien: content + bottom tab bar.
// Tab state lives here so it survives the role debug switcher round-tripping.
// `settingsOverlay` tracks Profile-row presses that route to sub-screens
// (currently just Notifications); each lands as a slide-up Modal so the
// member tab bar stays mounted underneath.
function MemberShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<MemberTabKey>("home");
  const [settingsOverlay, setSettingsOverlay] = useState<"none" | "notifications">("none");
  // Full-screen Events ("Agenda") modal, opened by the Home Agenda shortcut.
  const [agendaOpen, setAgendaOpen] = useState(false);
  // Bumped each time the already-active tab is re-tapped, so a screen sitting
  // on a sub-view (e.g. News showing an article, Library showing a doc) can
  // pop back to its root. Switching to a *different* tab already resets it by
  // remounting the gate; this covers the same-tab case.
  const [resetSignal, setResetSignal] = useState(0);
  // True while a tab is showing a detail/sub-view (e.g. News article, Library
  // doc). The floating avatar is hidden on detail pages — main pages only.
  const [detailOpen, setDetailOpen] = useState(false);
  // Pending deep-link segment for the Discover tab (Tools FFIE → Tools,
  // Our trades → Trades); cleared on any manual tab-bar press so the tab
  // button opens its default (Trades).
  const [tradesSegment, setTradesSegment] = useState<
    "trades" | "tools" | "videos" | null
  >(null);

  // Tab-bar press. A different tab → switch (the gate remounts + replays its
  // skeleton). The active tab again → pop that tab to its root via resetSignal.
  // Either way we land on a main page, so clear the detail flag.
  const handleTabSelect = (key: TabKey) => {
    setDetailOpen(false);
    // A manual tab press always opens the tab's default segment.
    setTradesSegment(null);
    if (key === activeTab) setResetSignal((n) => n + 1);
    else setActiveTab(key as MemberTabKey);
  };

  const handleSignIn = () => {
    // Real flow: open the SignInFlow (LoginScreen) modal. For v1 mock the
    // role debug switcher is the path back to "member".
  };
  const handleApply = () => {
    // Real flow: navigate to the Become-a-member tab + open the application
    // form. For v1 mock this is a no-op stub.
  };

  const handleProfileRowPress = (rowKey: string) => {
    if (rowKey === "signout") return onSignOut();
    if (rowKey === "notifications") setSettingsOverlay("notifications");
    // Other Profile rows (region, interests, edit-profile, change-password)
    // are still stubs; the notification toggles are handled in-screen now.
  };

  return (
    <RequireRole
      access="member-only"
      themeName={themeName}
      onApply={handleApply}
      onSignIn={handleSignIn}
    >
      <View style={{ flex: 1, backgroundColor: themes[themeName].surface.default }}>
        {/* Status bar: light over the navy AppHeader / Home hero; dark over a
            white detail view (open article, doc). */}
        <StatusBar style={detailOpen ? "dark" : "light"} />

        {/* Persistent branded header on every tab except Home and Profile (each
            renders its own navy hero) and while a detail view is open (it brings
            its own back-button bar). */}
        {activeTab !== "home" && activeTab !== "profile" && !detailOpen ? (
          <AppHeader
            title={TAB_TITLE[activeTab]}
            variant="member"
            hasUnread
            onPressNotifications={() => setSettingsOverlay("notifications")}
            onPressSearch={() => {
              // TODO: open global search when the search surface lands.
            }}
            // Profile has its own tab + navy hero now, so the header's profile
            // action always navigates there (this header never renders ON the
            // profile tab — see the guard above).
            onPressProfile={() => setActiveTab("profile")}
          />
        ) : null}

        <View style={{ flex: 1 }}>
          {/* Each tab opens on a brief skeleton that mirrors its layout, then
              swaps in the real screen. Keyed on activeTab so switching tabs
              remounts the gate and replays the loading phase. */}
          <TabSkeletonGate
            key={activeTab}
            skeleton={skeletonForTab(activeTab, themeName)}
          >
            {renderMemberTab(activeTab, {
              onProfileRowPress: handleProfileRowPress,
              onOpenProfile: () => setActiveTab("profile"),
              onOpenSearch: () => {
                // TODO: open global search when the search surface lands.
              },
              onHomeNavigate: (target) => {
                // Agenda opens the full-screen Events modal (not a tab).
                if (target === "agenda") return setAgendaOpen(true);
                // "tools" opens the Tools segment (calculators live there);
                // "trades" opens the careers segment.
                setTradesSegment(
                  target === "tools" ? "tools" : target === "trades" ? "trades" : null,
                );
                // Map each Home card to the tab that hosts its destination.
                const map: Partial<Record<HomeNavTarget, MemberTabKey>> = {
                  docs: "library",
                  tools: "discover", // Discover tab → Tools segment
                  trades: "discover", // Discover tab → Trades segment
                  partners: "partners",
                  "find-pro": "partners",
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

        {/* The account avatar that used to float here is now the profile
            action in AppHeader (non-Home tabs) and the tappable identity block
            on the Home hero — so the floating disc is retired. */}

        {/* Floating Claude-powered assistant — corner FAB → chat panel. Mounted
            here (over the tab set, under the full-screen Modals) so it rides on
            top of every member tab. Mockup only; see AssistantChatWidget. */}
        <AssistantChatWidget />

        {/* Notifications settings — slide-up Modal. Fresh SafeAreaProvider
            so the inset doesn't compound through the native modal host
            view (see OnboardingFlow for the same fix). */}
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

        {/* Full-screen Agenda (Events) modal — opened by the Home "Agenda"
            shortcut. Fresh SafeAreaProvider per the inset-compounding fix.
            Members are never locked, so no upsell CTAs are wired here. */}
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
      </View>
    </RequireRole>
  );
}

function renderMemberTab(
  tab: MemberTabKey,
  actions: {
    onProfileRowPress: (rowKey: string) => void;
    onOpenProfile: () => void;
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
            // TODO: navigate to Doc Detail (Screen 2) when it lands.
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
      // Trades — careers, training, external resources. Public and
      // self-contained, now part of the member nav too (Julien).
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

// GuestShell — the persistent chrome for Karim + Léa: content + bottom tab
// bar. Every guest tab is public-access, so no RequireRole wrapper is
// needed here (the access check in tabs.tsx is for symmetry / future use).
// Tab state lives here so it survives the role debug switcher round-tripping.
function GuestShell() {
  const [activeTab, setActiveTab] = useState<GuestTabKey>("home");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // The "Join" CTA now floats top-right on every guest page and opens the
  // federation directory (BecomeMemberScreen) as a slide-up modal, rather than
  // owning a bottom-tab slot.
  const [becomeMemberOpen, setBecomeMemberOpen] = useState(false);
  // Full-screen Events ("Agenda") modal, opened by the Home Agenda shortcut.
  const [agendaOpen, setAgendaOpen] = useState(false);
  // Re-tapping the active tab pops it to root (e.g. News showing an article);
  // switching tabs already resets by remounting the gate.
  const [resetSignal, setResetSignal] = useState(0);
  // True while a tab is showing a detail/sub-view (News article, Library doc).
  // The floating avatar is hidden on detail pages — main pages only.
  const [detailOpen, setDetailOpen] = useState(false);
  // Pending deep-link segment for the Trades tab (Tools FFIE → Calculators);
  // cleared on any manual tab-bar press. See MemberShell for the rationale.
  const [tradesSegment, setTradesSegment] = useState<
    "trades" | "tools" | "videos" | null
  >(null);
  const { setRole } = useRole();
  const { setActiveTab: publishActiveTab } = useActiveTab();

  const handleTabSelect = (key: TabKey) => {
    // Any tab-bar press lands on a main page (switch or pop-to-root).
    setDetailOpen(false);
    // A manual tab press always opens the tab's default segment.
    setTradesSegment(null);
    if (key === activeTab) setResetSignal((n) => n + 1);
    else setActiveTab(key as GuestTabKey);
  };

  // Publish the active guest tab so the floating debug switcher can scope
  // itself to a surface (the membership Reset chip only shows on Join-FFIE).
  // Clear it on unmount (e.g. when the role flips to member).
  useEffect(() => {
    publishActiveTab(activeTab);
    return () => publishActiveTab(null);
  }, [activeTab, publishActiveTab]);

  // From any guest surface, applying or signing in promotes the session.
  // v1 mock:
  //   - The floating "Join" CTA and News / member-only upsells both open
  //     the federation directory (BecomeMemberScreen) as a modal — the soft
  //     funnel step before the form.
  //   - The application form opens as a slide-up modal (openApplication).
  //   - "I already have an account" opens the email → OTP sign-in flow;
  //     a verified code promotes the session to member.
  const goToJoin = () => setBecomeMemberOpen(true);
  const openApplication = () => setApplicationOpen(true);
  const openSignIn = () => setSignInOpen(true);
  const authenticate = () => {
    // Dismiss the modals FIRST, then promote to member once they've slid away.
    // Flipping the role immediately unmounts the guest shell mid-dismiss, which
    // can strand a modal over the member News page.
    //
    // Two entry paths share this handler, and they differ in modal depth:
    //   - From the directory (avatar → Join → "Sign in"): the sign-in
    //     popup is NESTED inside the directory modal. iOS cannot dismiss a
    //     presenting modal (the directory) while its presented child (sign-in)
    //     is still up — doing both in the same tick rips the child's view
    //     controller out mid-dismiss and leaves a BLACK SCREEN. So we dismiss
    //     the child, wait for it to finish sliding away, THEN dismiss the
    //     parent, THEN (after that too has slid away) promote the role.
    //   - From News etc. (no directory open): only the sign-in modal is up, so
    //     there's nothing to stagger — dismiss it and promote after one slide.
    // Both shells open on Home, so the brief guest→member swap underneath the
    // closing modal is invisible — the user simply lands on Home, logged in.
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
      {/* Status bar: light over the navy AppHeader / Home hero; dark over a
          white detail view (open article, doc). */}
      <StatusBar style={detailOpen ? "dark" : "light"} />

      {/* Persistent branded header on every tab except Home (its own hero) and
          while a detail view is open. */}
      {activeTab !== "home" && !detailOpen ? (
        <AppHeader
          title={TAB_TITLE[activeTab]}
          variant="guest"
          onPressSearch={() => {
            // TODO: open global search when the search surface lands.
          }}
          onPressJoin={() => setBecomeMemberOpen(true)}
        />
      ) : null}

      <View style={{ flex: 1 }}>
        {/* Brief layout-matched skeleton on each tab open, then the real
            screen. Keyed on activeTab so a tab switch replays the loading
            phase. */}
        <TabSkeletonGate
          key={activeTab}
          skeleton={skeletonForTab(activeTab, themeName)}
        >
          {renderGuestTab(activeTab, {
            onApply: goToJoin,
            onSignIn: openSignIn,
            onStartApplication: openApplication,
            onOpenSearch: () => {
              // TODO: open global search when the search surface lands.
            },
            onHomeNavigate: (target) => {
              // Guests: "find-pro" opens the federation directory (the join
              // funnel); "agenda" opens the full-screen Events modal; the rest
              // map to the matching guest tab.
              if (target === "find-pro") return goToJoin();
              if (target === "agenda") return setAgendaOpen(true);
              // "tools" opens the Tools segment (calculators live there);
              // "trades" opens the careers segment.
              setTradesSegment(
                target === "tools" ? "tools" : target === "trades" ? "trades" : null,
              );
              const map: Partial<Record<HomeNavTarget, GuestTabKey>> = {
                docs: "library",
                tools: "discover", // Discover tab → Tools segment
                trades: "discover", // Discover tab → Trades segment
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

      {/* The account avatar that used to float here is now the join action in
          AppHeader (non-Home tabs) and the "Join the FFIE" CTA on the Home hero
          — so the floating disc is retired. */}

      {/* Floating Claude-powered assistant — same corner widget as the member
          shell, available to public/company guests too. Mockup only. */}
      <AssistantChatWidget />

      {/* Federation directory ("Join") — slide-up Modal over the guest
          shell, so the tab bar stays mounted underneath. Fresh
          SafeAreaProvider per the inset-compounding fix used elsewhere. The
          bottom "Sign in" CTA opens the email → OTP sign-in popup, nested
          inside this modal so it presents *on top of* the map + list (a sibling
          modal at the root can't present while this one is up on iOS). */}
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
          />
          {/* Nested sign-in: pops up over the directory; cancelling returns to
              it. A successful login calls authenticate() (promotes to member).
              "Join the FFIE" just closes the login — the directory underneath
              is already the join funnel. */}
          <SignInFlow
            visible={signInOpen}
            onClose={() => setSignInOpen(false)}
            onAuthenticated={authenticate}
            onJoin={() => setSignInOpen(false)}
          />
        </SafeAreaProvider>
      </Modal>

      {/* "I already have an account" from News etc. (no directory open) →
          login. Only mounted when the directory is closed, so it never competes
          with the nested instance above for the same signInOpen state.
          "Join the FFIE" dismisses login, then opens the join directory. */}
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

      {/* Membership application — slide-up Modal over the guest shell, so the
          tab bar stays mounted underneath. Fresh SafeAreaProvider per the same
          inset-compounding fix used elsewhere. */}
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

      {/* Full-screen Agenda (Events) modal — opened by the Home "Agenda"
          shortcut. A guest tapping a member-only event hits the upsell inside
          the modal; its CTAs close THIS modal first, then (after the slide)
          open the join / sign-in funnel, so two full-screen modals never fight
          on iOS — the same staggered-dismiss pattern used above. */}
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
    </View>
  );
}

function renderGuestTab(
  tab: GuestTabKey,
  actions: {
    onApply: () => void;
    onSignIn: () => void;
    onStartApplication: () => void;
    onOpenSearch: () => void;
    onHomeNavigate: (target: HomeNavTarget) => void;
    tradesSegment: "trades" | "tools" | "videos" | null;
    resetSignal: number;
    onDetailChange: (isDetail: boolean) => void;
  }
) {
  switch (tab) {
    case "home":
      // Guests get the welcome hero; "Join the FFIE" opens the federation
      // directory (the same soft-funnel step as the floating CTA elsewhere).
      return (
        <HomeScreen
          themeName={themeName}
          onJoin={actions.onApply}
          onOpenSearch={actions.onOpenSearch}
          onNavigate={actions.onHomeNavigate}
        />
      );
    case "discover":
      // The Trades tab is fully public (P6) and self-contained — careers,
      // training, and external resource links only.
      return (
        <DiscoverScreen
          themeName={themeName}
          resetSignal={actions.resetSignal}
          initialSegment={actions.tradesSegment ?? undefined}
        />
      );
    case "news":
      // Guests can hit member-only articles → forward the upsell CTAs so the
      // News teaser routes to Join / sign-in just like the rest of the shell.
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
    case "library":
      // Library is now part of the guest experience too — non-members
      // browse the same document directory (v1 mock: full access).
      return (
        <DocLibraryScreen
          themeName={themeName}
          density={density}
          offline={offline}
          resetSignal={actions.resetSignal}
          onDetailChange={actions.onDetailChange}
          // A guest tapping a locked doc gets the upsell; "Request membership"
          // opens the federation directory (map + departmental list), "I already
          // have an account" opens sign-in — same funnel as the News teaser.
          onApply={actions.onApply}
          onSignIn={actions.onSignIn}
          onDocPress={() => {
            // TODO: navigate to Doc Detail (Screen 2) when it lands.
          }}
        />
      );
  }
}
