// Repères « adhérents » pour la Carte des adhérents (FFIE-16).
//
// FFIE-16 (carte des adhérents + géolocalisation + consentement RGPD) est bloqué
// côté backend : il n'existe aucune API d'annuaire des adhérents en v1. Les repères
// ci-dessous sont des marqueurs de DÉMONSTRATION placés sur les grandes métropoles
// françaises, pour que la carte se lise comme peuplée — ce ne sont PAS de vrais
// adhérents FFIE, et ils ne portent volontairement AUCUNE coordonnée inventée
// (règle « aucune donnée réelle fabriquée » : pas de téléphone/adresse/email
// factices). Toucher un repère affiche un espace réservé « coordonnées à venir ».
//
// Les `specialty` sont de vraies catégories de métiers de l'électricité (pas des
// raisons sociales). Remplacer ce module par l'annuaire géolocalisé réel quand le
// backend FFIE-16 sera livré.

import type { FederationPin } from "@/components/ui/FederationMap";

export type MemberPin = FederationPin & {
  /** Ville principale du repère (libellé d'affichage). */
  city: string;
  /** Catégorie de métier (vraie spécialité, pas une raison sociale). */
  specialty: string;
};

export const MEMBER_PINS: MemberPin[] = [
  { id: 1, lat: 48.8566, lng: 2.3522, city: "Paris", specialty: "Électricité générale", title: "Entreprise adhérente", description: "Paris · Électricité générale" },
  { id: 2, lat: 45.764, lng: 4.8357, city: "Lyon", specialty: "Courants faibles", title: "Entreprise adhérente", description: "Lyon · Courants faibles" },
  { id: 3, lat: 43.2965, lng: 5.3698, city: "Marseille", specialty: "Bornes de recharge (IRVE)", title: "Entreprise adhérente", description: "Marseille · Bornes de recharge (IRVE)" },
  { id: 4, lat: 43.6047, lng: 1.4442, city: "Toulouse", specialty: "Photovoltaïque", title: "Entreprise adhérente", description: "Toulouse · Photovoltaïque" },
  { id: 5, lat: 44.8378, lng: -0.5792, city: "Bordeaux", specialty: "Automatisme du bâtiment", title: "Entreprise adhérente", description: "Bordeaux · Automatisme du bâtiment" },
  { id: 6, lat: 47.2184, lng: -1.5536, city: "Nantes", specialty: "Réseaux & fibre optique", title: "Entreprise adhérente", description: "Nantes · Réseaux & fibre optique" },
  { id: 7, lat: 50.6292, lng: 3.0573, city: "Lille", specialty: "Éclairage & domotique", title: "Entreprise adhérente", description: "Lille · Éclairage & domotique" },
  { id: 8, lat: 48.5734, lng: 7.7521, city: "Strasbourg", specialty: "Génie climatique", title: "Entreprise adhérente", description: "Strasbourg · Génie climatique" },
];
