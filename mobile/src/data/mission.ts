// Chiffres clés FFIE — les données de l'infographie animée « La FFIE en chiffres »
// (MissionInfographic), ouverte en appuyant sur le logo FFIE de l'en-tête Accueil
// (FFIE-02). Reprend l'infographie « en chiffres » du bas de la page « Missions et
// valeurs » du site (ffie.fr). En production ces chiffres viendront du back-office
// FFIE ; saisis ici à la main pour l'instant. Les pourcentages sont de 0 à 100.
//
// L'infographie n'a besoin que de ces deux exports — le composant ne possède que la
// présentation, les valeurs vivent ici pour rester la source de vérité unique.

export const MISSION_FIGURES = {
  entreprises: 8500, // entreprises adhérentes
  salariesPct: 50, // % des salariés du secteur
  actifs: 150000, // actifs FFIE
  caPct: 50, // % du chiffre d'affaires du secteur
  caMds: 25, // milliards d'euros de chiffre d'affaires
  // Répartition du chiffre d'affaires
  neufPct: 40,
  renovationPct: 60,
  // Type de travaux
  reseauxPct: 18, // travaux et réseaux
  batimentsPct: 82, // travaux en bâtiment
  // Travaux en bâtiment, par marché
  residentielPct: 27,
  tertiairePct: 44,
  industrielPct: 29,
} as const;

// Les huit métiers de l'électricité listés dans l'infographie, dans l'ordre de la
// page. L'infographie associe chaque libellé à une icône (voir METIER_ICON dans
// MissionInfographic) — garder les deux en phase si l'on traduit/renomme un métier.
export const MISSION_METIERS: string[] = [
  "Automatismes",
  "Communication",
  "Confort thermique",
  "Éclairage",
  "Énergie",
  "GTB",
  "Maintenance",
  "Sécurité",
];
