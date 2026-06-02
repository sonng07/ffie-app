// Skeleton routing — maps a tab key to its loading placeholder, and the
// TabSkeletonGate that shows that placeholder for a brief beat before the real
// screen swaps in.
//
// Why a timed gate at v1: the tab screens read from local mock data, so there's
// no real network wait to hang the skeleton on. The gate simulates the brief
// "loading phase" each tab will genuinely have once content comes from the FFIE
// API — keeping the skeleton component in place so the swap is wired and the
// motion is tuned. When real async loading lands, drive `ready` off the fetch
// state instead of a timer (see TabSkeletonGate).

import React, { useEffect, useState } from "react";
import type { ThemeName } from "@tokens";
import type { TabKey } from "@/navigation/tabs";
import { NewsSkeleton } from "./NewsSkeleton";
import { LibrarySkeleton } from "./LibrarySkeleton";
import { PartnersSkeleton } from "./PartnersSkeleton";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { DiscoverSkeleton } from "./DiscoverSkeleton";

// How long the skeleton holds before the real screen appears. Short enough to
// never feel like a stall, long enough for the shimmer to register as intent.
const DEFAULT_DELAY_MS = 450;

export function skeletonForTab(tab: TabKey, themeName: ThemeName): React.ReactNode {
  switch (tab) {
    case "library":
      return <LibrarySkeleton themeName={themeName} />;
    case "news":
      return <NewsSkeleton themeName={themeName} />;
    case "partners":
      return <PartnersSkeleton themeName={themeName} />;
    case "profile":
      return <ProfileSkeleton themeName={themeName} />;
    case "discover":
      return <DiscoverSkeleton themeName={themeName} />;
  }
}

// ---------------------------------------------------------------------------
// TabSkeletonGate — renders `skeleton` until the loading beat elapses, then the
// real screen. Mount it with `key={activeTab}` so switching tabs remounts the
// gate and replays the loading phase for the newly-selected tab.
//
// The real children element is created by the caller but isn't mounted (its
// effects/data work don't run) until the gate flips to `ready` — so the
// skeleton owns the first frame cleanly.
// ---------------------------------------------------------------------------
export function TabSkeletonGate({
  skeleton,
  delayMs = DEFAULT_DELAY_MS,
  children,
}: {
  skeleton: React.ReactNode;
  delayMs?: number;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  return <>{ready ? children : skeleton}</>;
}
