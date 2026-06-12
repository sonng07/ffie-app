// Tables de configuration des onglets.
//
// Ordre de la barre du bas — fixé par le retour client FFIE-05 :
//   Adhérent : Accueil · Actus · Docs · Outils · Partenaires · Profil   (6 onglets)
//   Invité   : Accueil · Actus · Docs · Outils · Partenaires            (5 onglets)
// Les libellés de la barre du bas sont les formes courtes demandées par le client
// (« Actus », « Docs ») ; le grand titre de chaque écran (AppHeader → TAB_TITLE
// dans App.tsx) garde sa forme longue (« Actualités », « Bibliothèque »).
//
// Onglets adhérent (Adhérent — Julien) :
//   Accueil      · la surface d'atterrissage — premier onglet, ouverture ici au lancement
//   Actus        · actualités du secteur + de la fédération (Actualités)
//   Docs         · pilier — consultations quotidiennes sur chantier (Bibliothèque, clé « library »)
//   Outils       · calculateurs + outils métier (clé « discover » → segment Outils)
//   Partenaires  · l'annuaire des partenaires de la fédération (PartnersScreen). Les
//                  segments « Mission & valeurs » / « Organisation » sont masqués en
//                  Phase 1 — voir SHOW_FEDERATION_SEGMENTS dans PartnersScreen.tsx.
//   Profil       · compte / qualifications / réglages (ProfileScreen). Promu en onglet
//                  de la barre du bas par FFIE-14 (auparavant accessible uniquement via
//                  l'avatar de l'en-tête). Réservé aux adhérents.
//
// Onglets invité (Entreprise non adhérente + Grand public) :
//   Accueil · Actus · Docs · Outils · Partenaires · Adhérer
//   (pas de Profil : les invités n'ont pas de compte. « Adhérer » est désormais un
//   onglet-ACTION en dernière position — symétrique du Profil adhérent : au lieu de
//   basculer vers un écran de contenu, son appui ouvre l'annuaire des fédérations
//   (BecomeMemberScreen) en modale. Il ne devient jamais l'onglet « actif ». Il
//   remplace l'ancien bouton « Adhérer » de l'en-tête, désormais retiré.)
//
// Note : la clé d'onglet « partners » route vers PartnersScreen ; son libellé affiche
// « Partenaires », ce qui correspond au grand titre de l'écran. La clé « discover »
// porte le libellé « Outils » (son segment par défaut).

import type { ComponentType } from "react";
import { BookOpen, Compass, Home, Newspaper, Handshake, User, UserPlus } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Access } from "@/auth/roleContext";

export type MemberTabKey = "home" | "library" | "news" | "partners" | "discover" | "profile";
// « join » est un onglet-action invité (ouvre la modale d'adhésion), pas une destination.
export type GuestTabKey = "home" | "discover" | "news" | "partners" | "library" | "join";

export type TabKey = MemberTabKey | GuestTabKey;

export type TabConfig<K extends TabKey = TabKey> = {
  key: K;
  label: string;
  icon: LucideIcon;
  access: Access;
  /** Sémantique d'accessibilité. Par défaut « tab » (une destination sélectionnable).
   *  Mettre « button » pour un onglet-ACTION (ex. « Adhérer ») qui déclenche une
   *  action / ouvre une modale au lieu de devenir l'onglet actif : il s'annonce alors
   *  comme un bouton, sans état « sélectionné » (WCAG 4.1.2 nom/rôle/valeur). */
  role?: "tab" | "button";
  /** Indice d'accessibilité optionnel — surtout utile pour les onglets-action. */
  accessibilityHint?: string;
};

export const MEMBER_TABS: ReadonlyArray<TabConfig<MemberTabKey>> = [
  { key: "home", label: "Accueil", icon: Home, access: "public" },
  { key: "news", label: "Actus", icon: Newspaper, access: "public" },
  { key: "library", label: "Docs", icon: BookOpen, access: "member-only" },
  // Onglet « discover » — libellé « Outils » (le segment Métiers est temporairement
  // retiré ; il ne propose plus que Vidéos + Calculateurs). Voir DiscoverScreen.
  { key: "discover", label: "Outils", icon: Compass, access: "public" },
  { key: "partners", label: "Partenaires", icon: Handshake, access: "public" },
  // Profil — désormais un onglet du bas (FFIE-14), en dernière position. Réservé aux
  // adhérents (la coquille adhérent est déjà sous RequireRole). L'avatar de l'en-tête
  // y route toujours.
  { key: "profile", label: "Profil", icon: User, access: "member-only" },
];

export const GUEST_TABS: ReadonlyArray<TabConfig<GuestTabKey>> = [
  { key: "home", label: "Accueil", icon: Home, access: "public" },
  { key: "news", label: "Actus", icon: Newspaper, access: "public" },
  // La Bibliothèque + les Métiers font désormais aussi partie de l'expérience invité. La
  // Bibliothèque est marquée publique ici parce que la coquille invité l'héberge
  // directement (pas de barrière RequireRole) — les non-adhérents parcourent le même annuaire.
  { key: "library", label: "Docs", icon: BookOpen, access: "public" },
  { key: "discover", label: "Outils", icon: Compass, access: "public" },
  { key: "partners", label: "Partenaires", icon: Handshake, access: "public" },
  // Onglet-action « Adhérer » (dernière position, symétrique du Profil adhérent).
  // Son appui ouvre l'annuaire d'adhésion en modale au lieu de basculer d'onglet —
  // voir GuestShell.handleTabSelect dans App.tsx. Il ne s'affiche jamais comme actif,
  // d'où role:"button" (il s'annonce comme un bouton, pas un onglet sélectionnable).
  {
    key: "join",
    label: "Adhérer",
    icon: UserPlus,
    access: "public",
    role: "button",
    accessibilityHint: "Ouvre les informations d'adhésion",
  },
];

// Évite de re-typer dans les rendus qui se moquent de la navigation de quel rôle ils affichent.
export type AnyTabConfig = TabConfig<MemberTabKey> | TabConfig<GuestTabKey>;

// Réexport de LucideIcon pour que les consommateurs n'aient pas besoin d'un second import.
export type { ComponentType, LucideIcon };
