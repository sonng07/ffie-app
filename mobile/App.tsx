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

type AppState =
  | { phase: "onboarding" }
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

  return (
    <View style={{ flex: 1, backgroundColor: t.surface.default }}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />

      {appState.phase === "onboarding" ? (
        <OnboardingFlow themeName={themeName} onComplete={completeOnboarding} />
      ) : (
        <MainSurface />
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
function MainSurface() {
  const { role } = useRole();

  if (role === "member" || role === "admin") {
    return <MemberShell />;
  }

  return <GuestShell />;
}

// MemberShell — the persistent chrome for Julien: content + bottom tab bar.
// Tab state lives here so it survives the role debug switcher round-tripping.
// `settingsOverlay` tracks Profile-row presses that route to sub-screens
// (currently just Notifications); each lands as a slide-up Modal so the
// member tab bar stays mounted underneath.
function MemberShell() {
  const [activeTab, setActiveTab] = useState<MemberTabKey>("news");
  const [settingsOverlay, setSettingsOverlay] = useState<"none" | "notifications">("none");
  // Bumped each time the already-active tab is re-tapped, so a screen sitting
  // on a sub-view (e.g. News showing an article, Library showing a doc) can
  // pop back to its root. Switching to a *different* tab already resets it by
  // remounting the gate; this covers the same-tab case.
  const [resetSignal, setResetSignal] = useState(0);

  // Tab-bar press. A different tab → switch (the gate remounts + replays its
  // skeleton). The active tab again → pop that tab to its root via resetSignal.
  const handleTabSelect = (key: TabKey) => {
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
    if (rowKey === "notifications") setSettingsOverlay("notifications");
    // Other rows (account, offline, biometric, signout) are still stubs.
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
            })}
          </TabSkeletonGate>
        </View>
        <BottomTabBar
          tabs={MEMBER_TABS}
          activeKey={activeTab}
          onSelect={handleTabSelect}
          themeName={themeName}
        />

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
  actions: { onProfileRowPress: (rowKey: string) => void; resetSignal: number }
) {
  switch (tab) {
    case "library":
      return (
        <DocLibraryScreen
          themeName={themeName}
          density={density}
          offline={offline}
          resetSignal={actions.resetSignal}
          onDocPress={() => {
            // TODO: navigate to Doc Detail (Screen 2) when it lands.
          }}
        />
      );
    case "news":
      return <NewsScreen themeName={themeName} resetSignal={actions.resetSignal} />;
    case "partners":
      return <PartnersScreen themeName={themeName} />;
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
  // Re-tapping the active tab pops it to root (e.g. News showing an article);
  // switching tabs already resets by remounting the gate.
  const [resetSignal, setResetSignal] = useState(0);
  const { setRole } = useRole();
  const { setActiveTab: publishActiveTab } = useActiveTab();

  const handleTabSelect = (key: TabKey) => {
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
  //   - News / member-only upsells route to the Join-FFIE tab (the value
  //     page) — the soft funnel step before the form.
  //   - The Join page's own "Apply" CTA opens the application form as a
  //     slide-up modal (openApplication).
  //   - "I already have an account" opens the email → OTP sign-in flow;
  //     a verified code promotes the session to member.
  const goToJoin = () => setActiveTab("become-member");
  const openApplication = () => setApplicationOpen(true);
  const openSignIn = () => setSignInOpen(true);
  const authenticate = () => {
    setSignInOpen(false);
    setRole("member");
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
          })}
        </TabSkeletonGate>
      </View>
      <BottomTabBar
        tabs={GUEST_TABS}
        activeKey={activeTab}
        onSelect={handleTabSelect}
        themeName={themeName}
      />

      {/* "I already have an account" → email → OTP. Reuses the onboarding
          login screens; a verified code calls authenticate(). */}
      <SignInFlow
        visible={signInOpen}
        onClose={() => setSignInOpen(false)}
        onAuthenticated={authenticate}
      />

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
  }
) {
  switch (tab) {
    case "discover":
      // The Trades tab is fully public (P6) and self-contained — careers,
      // training, and external resource links only.
      return <DiscoverScreen themeName={themeName} />;
    case "news":
      // Guests can hit member-only articles → forward the upsell CTAs so the
      // News teaser routes to Join / sign-in just like the rest of the shell.
      return (
        <NewsScreen
          themeName={themeName}
          resetSignal={actions.resetSignal}
          onApply={actions.onApply}
          onSignIn={actions.onSignIn}
        />
      );
    case "partners":
      return <PartnersScreen themeName={themeName} />;
    case "become-member":
      // Directory of departmental federations — joining happens through the
      // federation, so there are no apply/sign-in CTAs on this page.
      return <BecomeMemberScreen themeName={themeName} />;
  }
}
