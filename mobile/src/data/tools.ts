// Hub des outils — la grille de tuiles derrière le segment « Outils » par défaut
// de l'onglet Outils (DiscoverScreen → ToolsHubView). Reprend la maquette client
// « Tools FFIE » : deux sections de tuiles-raccourcis qui lancent les outils
// métier de la fédération.
//
// Une tuile mène vers l'un de deux endroits :
//   • { type: "calculator" } → une feuille calculateur fonctionnelle (adhérents
//     uniquement). Aujourd'hui deux existent — Puissance & courant et Chute de
//     tension — toutes deux déjà construites dans CalculatorsView et réutilisées
//     ici. (« Falling tension » est le libellé client de l'outil de chute de
//     tension.)
//   • { type: "soon" } → un outil que la FFIE n'a pas encore livré. Ceux-ci
//     s'affichent comme des tuiles complètes mais ouvrent une feuille honnête
//     « bientôt disponible » plutôt que d'inventer des fonctionnalités
//     (CLAUDE.md : aucune donnée/comportement fabriqué).
//
// Pour modifier la grille, éditer TOOL_SECTIONS — l'ordre suit les lignes au sein
// de chaque section (l'écran dispose les tuiles deux par deux).

import {
  Cable,
  ClipboardList,
  FileCheck,
  IdCard,
  ShoppingCart,
  Sparkles,
  Sun,
  TrendingDown,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import type { CalculatorKind } from "./calculators";

// Où mène une tuile. Les tuiles « calculator » ouvrent une feuille fonctionnelle
// (adhérents uniquement) ; les tuiles « soon » ouvrent l'état bientôt disponible.
export type ToolAction =
  | { type: "calculator"; kind: CalculatorKind }
  | { type: "soon" };

export type ToolTile = {
  id: string;
  /** Libellé de la tuile (formulation client, reprise telle quelle de la maquette). */
  title: string;
  icon: LucideIcon;
  action: ToolAction;
};

export type ToolSection = {
  id: string;
  /** Titre de section — affiché en majuscules, comme dans la maquette. */
  title: string;
  tiles: ReadonlyArray<ToolTile>;
};

export const TOOL_SECTIONS: ReadonlyArray<ToolSection> = [
  {
    id: "calculations",
    title: "Calculs & dimensionnement",
    tiles: [
      { id: "cable-section", title: "Calculateur de section de câble", icon: Cable, action: { type: "soon" } },
      { id: "power", title: "Calcul de puissance", icon: Zap, action: { type: "calculator", kind: "power" } },
      { id: "lux", title: "Éclairage & calcul des lux", icon: Sun, action: { type: "soon" } },
      // « Falling tension » = chute de tension → l'outil de chute de tension existant.
      { id: "voltage-drop", title: "Chute de tension", icon: TrendingDown, action: { type: "calculator", kind: "voltage-drop" } },
    ],
  },
  {
    id: "compliance",
    title: "Aide à la conformité",
    tiles: [
      { id: "normative", title: "Références normatives", icon: FileCheck, action: { type: "soon" } },
      { id: "intervention", title: "Rapport d'intervention", icon: ClipboardList, action: { type: "soon" } },
      { id: "assistant", title: "Assistant IA FFIE", icon: Sparkles, action: { type: "soon" } },
      { id: "member-card", title: "Carte des adhérents", icon: IdCard, action: { type: "soon" } },
    ],
  },
  {
    // FFIE-12 — nouveau service « Centrale d'achat ». L'icône et la destination
    // (URL / page) doivent être fournies par le client ; en attendant, la tuile
    // s'affiche en « Bientôt » plutôt que de feindre une destination (CLAUDE.md :
    // aucun comportement fabriqué). Section dédiée à confirmer avec le client.
    id: "services",
    title: "Services",
    tiles: [
      { id: "purchasing", title: "Centrale d'achat", icon: ShoppingCart, action: { type: "soon" } },
    ],
  },
];
