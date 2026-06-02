// Tab configuration tables.
//
// Bottom-bar order (both roles): News · Library · Missions · Trades.
//
// Member tabs (Adhérent — Julien):
//   News     · sector + federation news
//   Library  · load-bearing — daily worksite lookups (Bibliothèque)
//   Missions · the federation: partners + mission & values + organisation
//   Trades   · careers, training, external resources (Métiers)
//
// Guest tabs (Entreprise non adhérente + Grand public):
//   News · Library · Missions · Trades
//
// News / Library / Missions / Trades are shared across both roles. Two things
// live OUTSIDE the bottom bar as top-right floating avatars (AdhererButton):
//   - Guests:  "Adhérer" → federation directory (BecomeMemberScreen) modal.
//   - Members: Profile → the account/settings page (the "profile" tab key is
//     kept so the avatar can route to it; it just has no bottom-bar entry).
//
// Note: the "partners" tab key is unchanged (it still routes to PartnersScreen);
// only its label moved to "Missions".

import type { ComponentType } from "react";
import { BookOpen, Compass, Newspaper, Handshake } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Access } from "@/auth/roleContext";

export type MemberTabKey = "library" | "news" | "partners" | "discover" | "profile";
export type GuestTabKey = "discover" | "news" | "partners" | "library";

export type TabKey = MemberTabKey | GuestTabKey;

export type TabConfig<K extends TabKey = TabKey> = {
  key: K;
  label: string;
  icon: LucideIcon;
  access: Access;
};

export const MEMBER_TABS: ReadonlyArray<TabConfig<MemberTabKey>> = [
  { key: "news", label: "Actualités", icon: Newspaper, access: "public" },
  { key: "library", label: "Bibliothèque", icon: BookOpen, access: "member-only" },
  { key: "partners", label: "Missions", icon: Handshake, access: "public" },
  { key: "discover", label: "Métiers", icon: Compass, access: "public" },
  // Profile is intentionally NOT a bottom-tab — it's reached via the top-right
  // avatar (the "profile" key still exists for that route).
];

export const GUEST_TABS: ReadonlyArray<TabConfig<GuestTabKey>> = [
  { key: "news", label: "Actualités", icon: Newspaper, access: "public" },
  // Library + Trades are now part of the guest experience too. Library is
  // marked public here because the guest shell hosts it directly (no
  // RequireRole gate) — non-members browse the same directory.
  { key: "library", label: "Bibliothèque", icon: BookOpen, access: "public" },
  { key: "partners", label: "Missions", icon: Handshake, access: "public" },
  { key: "discover", label: "Métiers", icon: Compass, access: "public" },
];

// Avoid re-typing in renderers that don't care which role's nav they show.
export type AnyTabConfig = TabConfig<MemberTabKey> | TabConfig<GuestTabKey>;

// Re-exporting LucideIcon so consumers don't need a second import.
export type { ComponentType, LucideIcon };
