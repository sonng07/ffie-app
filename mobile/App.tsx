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
import { SignInFlow } from "@/screens/auth/SignInFlow";
import { ActiveTabProvider, useActiveTab } from "@/navigation/activeTabContext";
import { RequireRole } from "@/auth/RequireRole";
import { RoleDebugSwitcher } from "@/components/dev/RoleDebugSwitcher";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { AdhererButton } from "@/components/navigation/AdhererButton";
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
//   - Member/Admin → MemberShell (Library / News / Partners / Profile)
//   - Guest → GuestShell (Discover / News / Partners / Join FFIE)
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
  const [activeTab, setActiveTab] = useState<MemberTabKey>("news");
  const [settingsOverlay, setSettingsOverlay] = useState<"none" | "notifications">("none");
  // Bumped each time the already-active tab is re-tapped, so a screen sitting
  // on a sub-view (e.g. News showing an article, Library showing a doc) can
  // pop back to its root. Switching to a *different* tab already resets it by
  // remounting the gate; this covers the same-tab case.
  const [resetSignal, setResetSignal] = useState(0);
  // True while a tab is showing a detail/sub-view (e.g. News article, Library
  // doc). The floating avatar is hidden on detail pages — main pages only.
  const [detailOpen, setDetailOpen] = useState(false);

  // Tab-bar press. A different tab → switch (the gate remounts + replays its
  // skeleton). The active tab again → pop that tab to its root via resetSignal.
  // Either way we land on a main page, so clear the detail flag.
  const handleTabSelect = (key: TabKey) => {
    setDetailOpen(false);
    if (key === activeTab) setResetSignal((n) => n + 1);
    else setActiveTab(key as MemberTabKey);
  };

  const handleSignIn = () => {
    // Real flow: open MemberSignInScreen as a modal. For v1 mock the
    // role debug switcher is the path back to "member".
  };
  const handleApply = () => {
    // Real flow: navigate to the Become-a-member tab + open the application
    // form. For v1 mock this is a no-op stub.
  };

  const handleProfileRowPress = (rowKey: string) => {
    if (rowKey === "signout") return onSignOut();
    if (rowKey === "notifications") setSettingsOverlay("notifications");
    // Other rows (account, offline, biometric) are still stubs.
  };

  return (
    <RequireRole
      access="member-only"
      themeName={themeName}
      onApply={handleApply}
      onSignIn={handleSignIn}
    >
      <View style={{ flex: 1, backgroundColor: themes[themeName].surface.default }}>
        <View style={{ flex: 1 }}>
          {/* Each tab opens on a brief skeleton that mirrors its layout, then
              swaps in the real screen. Keyed on activeTab so switching tabs
              remounts the gate and replays the loading phase. */}
          <TabSkeletonGate key={activeTab} skeleton={skeletonForTab(activeTab, themeName)}>
            {renderMemberTab(activeTab, {
              onProfileRowPress: handleProfileRowPress,
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

        {/* Floating account avatar — top-right, on every member *main* page
            (hidden on detail views like an open article). Members get the plain
            user glyph; tapping it opens the personal Profile / settings page. */}
        {detailOpen ? null : (
          <AdhererButton
            themeName={themeName}
            variant="member"
            onPress={() => setActiveTab("profile")}
          />
        )}

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
      </View>
    </RequireRole>
  );
}

function renderMemberTab(
  tab: MemberTabKey,
  actions: {
    onProfileRowPress: (rowKey: string) => void;
    resetSignal: number;
    onDetailChange: (isDetail: boolean) => void;
  }
) {
  switch (tab) {
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
      // Trades (Métiers) — careers, training, external resources. Public and
      // self-contained, now part of the member nav too (Julien).
      return <DiscoverScreen themeName={themeName} resetSignal={actions.resetSignal} />;
    case "profile":
      return <ProfileScreen themeName={themeName} onRowPress={actions.onProfileRowPress} />;
  }
}

// GuestShell — the persistent chrome for Karim + Léa: content + bottom tab
// bar. Every guest tab is public-access, so no RequireRole wrapper is
// needed here (the access check in tabs.tsx is for symmetry / future use).
// Tab state lives here so it survives the role debug switcher round-tripping.
function GuestShell() {
  const [activeTab, setActiveTab] = useState<GuestTabKey>("news");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // The "Adhérer" CTA now floats top-right on every guest page and opens the
  // federation directory (BecomeMemberScreen) as a slide-up modal, rather than
  // owning a bottom-tab slot.
  const [becomeMemberOpen, setBecomeMemberOpen] = useState(false);
  // Re-tapping the active tab pops it to root (e.g. News showing an article);
  // switching tabs already resets by remounting the gate.
  const [resetSignal, setResetSignal] = useState(0);
  // True while a tab is showing a detail/sub-view (News article, Library doc).
  // The floating avatar is hidden on detail pages — main pages only.
  const [detailOpen, setDetailOpen] = useState(false);
  const { setRole } = useRole();
  const { setActiveTab: publishActiveTab } = useActiveTab();

  const handleTabSelect = (key: TabKey) => {
    // Any tab-bar press lands on a main page (switch or pop-to-root).
    setDetailOpen(false);
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
  //   - The floating "Adhérer" CTA and News / member-only upsells both open
  //     the federation directory (BecomeMemberScreen) as a modal — the soft
  //     funnel step before the form.
  //   - The application form opens as a slide-up modal (openApplication).
  //   - "I already have an account" opens the email → OTP sign-in flow;
  //     a verified code promotes the session to member.
  const goToJoin = () => setBecomeMemberOpen(true);
  const openApplication = () => setApplicationOpen(true);
  const openSignIn = () => setSignInOpen(true);
  const authenticate = () => {
    // Dismiss the sign-in (and the directory it's nested in) FIRST, then promote
    // to member once they've slid away. Flipping the role immediately unmounts
    // the guest shell mid-dismiss, which can strand a modal over the member
    // News page (the guest flow nests two modals; onboarding only has one, which
    // is why it doesn't hit this). Both shells open on News, so the brief
    // guest→member swap underneath the closing modal is invisible — the user
    // simply lands on the News page, logged in.
    setSignInOpen(false);
    setBecomeMemberOpen(false);
    setTimeout(() => setRole("member"), MODAL_DISMISS_MS);
  };

  return (
    <View style={{ flex: 1, backgroundColor: themes[themeName].surface.default }}>
      <View style={{ flex: 1 }}>
        {/* Brief layout-matched skeleton on each tab open, then the real
            screen. Keyed on activeTab so a tab switch replays the loading
            phase. */}
        <TabSkeletonGate key={activeTab} skeleton={skeletonForTab(activeTab, themeName)}>
          {renderGuestTab(activeTab, {
            onApply: goToJoin,
            onSignIn: openSignIn,
            onStartApplication: openApplication,
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

      {/* Floating account avatar — top-right, on every guest *main* page (hidden
          on detail views like an open article). Guests get the user-plus glyph;
          tapping it opens the federation directory (map + departmental list)
          with a "Se connecter" login button pinned at its bottom. */}
      {detailOpen ? null : (
        <AdhererButton
          themeName={themeName}
          variant="guest"
          onPress={() => setBecomeMemberOpen(true)}
        />
      )}

      {/* Federation directory ("Adhérer") — slide-up Modal over the guest
          shell, so the tab bar stays mounted underneath. Fresh
          SafeAreaProvider per the inset-compounding fix used elsewhere. The
          bottom "Se connecter" CTA opens the email → OTP sign-in popup, nested
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
              it. A verified code calls authenticate() (promotes to member). */}
          <SignInFlow
            visible={signInOpen}
            onClose={() => setSignInOpen(false)}
            onAuthenticated={authenticate}
          />
        </SafeAreaProvider>
      </Modal>

      {/* "I already have an account" from News etc. (no directory open) → email
          → OTP. Only mounted when the directory is closed, so it never competes
          with the nested instance above for the same signInOpen state. */}
      {becomeMemberOpen ? null : (
        <SignInFlow
          visible={signInOpen}
          onClose={() => setSignInOpen(false)}
          onAuthenticated={authenticate}
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
    </View>
  );
}

function renderGuestTab(
  tab: GuestTabKey,
  actions: {
    onApply: () => void;
    onSignIn: () => void;
    onStartApplication: () => void;
    resetSignal: number;
    onDetailChange: (isDetail: boolean) => void;
  }
) {
  switch (tab) {
    case "discover":
      // The Trades tab is fully public (P6) and self-contained — careers,
      // training, and external resource links only.
      return <DiscoverScreen themeName={themeName} resetSignal={actions.resetSignal} />;
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
      // Bibliothèque is now part of the guest experience too — non-members
      // browse the same document directory (v1 mock: full access).
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
  }
}
