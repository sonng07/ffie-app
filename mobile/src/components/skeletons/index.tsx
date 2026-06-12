// Routage des squelettes — associe une clé d'onglet à son espace réservé de chargement, et
// le TabSkeletonGate qui affiche cet espace réservé pendant un bref instant avant que le
// vrai écran ne s'y substitue.
//
// Pourquoi une barrière temporisée en v1 : les écrans d'onglet lisent des données simulées
// locales, il n'y a donc pas de véritable attente réseau sur laquelle accrocher le squelette.
// La barrière simule la brève « phase de chargement » que chaque onglet aura réellement une
// fois le contenu issu de l'API FFIE — gardant le composant squelette en place pour que la
// substitution soit câblée et le mouvement réglé. Quand le vrai chargement asynchrone
// arrivera, piloter `ready` à partir de l'état de fetch plutôt que d'un minuteur (voir TabSkeletonGate).

import React, { useEffect, useState } from "react";
import type { ThemeName } from "@tokens";
import type { TabKey } from "@/navigation/tabs";
import { HomeSkeleton } from "./HomeSkeleton";
import { NewsSkeleton } from "./NewsSkeleton";
import { LibrarySkeleton } from "./LibrarySkeleton";
import { PartnersSkeleton } from "./PartnersSkeleton";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { DiscoverSkeleton } from "./DiscoverSkeleton";

// Combien de temps le squelette tient avant que le vrai écran apparaisse. Assez court pour
// ne jamais donner l'impression d'un blocage, assez long pour que le scintillement se lise comme une intention.
const DEFAULT_DELAY_MS = 450;

export function skeletonForTab(tab: TabKey, themeName: ThemeName): React.ReactNode {
  switch (tab) {
    case "home":
      return <HomeSkeleton themeName={themeName} />;
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
    case "join":
      // Onglet-action invité (ouvre la modale d'adhésion) : il ne devient jamais
      // l'onglet actif, donc aucun squelette ne s'affiche. Présent pour la symétrie.
      return null;
  }
}

// ---------------------------------------------------------------------------
// TabSkeletonGate — rend `skeleton` jusqu'à ce que le temps de chargement s'écoule, puis le
// vrai écran. Le monter avec `key={activeTab}` pour que changer d'onglet remonte la barrière
// et rejoue la phase de chargement pour l'onglet nouvellement sélectionné.
//
// L'élément enfant réel est créé par l'appelant mais n'est pas monté (ses effets/son travail
// de données ne s'exécutent pas) tant que la barrière n'a pas basculé à `ready` — ainsi le
// squelette possède proprement la première frame.
//
// `delayMs <= 0` saute entièrement le squelette : l'écran se rend dès la première frame, sans
// espace réservé. À utiliser pour les onglets sans rien à charger (par ex. le hero d'Accueil,
// qui est un en-tête statique — un squelette temporisé y ajoute juste un blocage).
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
  const [ready, setReady] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return; // déjà prêt — pas de frame de squelette
    const id = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  return <>{ready ? children : skeleton}</>;
}
