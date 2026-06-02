// Mission & valeurs content — mirrors the FFIE "Missions et valeurs" page
// (ffie.fr/les-missions-de-la-ffie/missions-et-valeurs). In production this
// comes from the FFIE backend / CMS; entered here by hand for now so the
// Partners tab's "Mission & valeurs" segment has the federation's real copy.
//
// Structure follows the source page's sections, in order:
//   intro → Nos missions (3 points) → Sur tout le territoire →
//   Connectée aux marchés émergents (lead-in + list) → closing line.

// Opening statement at the top of the page.
export const MISSION_INTRO =
  "Depuis 1924, la FFIE poursuit une triple mission : représenter, défendre et promouvoir les entreprises d'intégration électrique.";

// "Nos missions" — the three pillars. `verb` is the action word the page
// emphasises; `body` is the text that follows it.
export type MissionPoint = { verb: string; body: string };

export const MISSION_POINTS: MissionPoint[] = [
  {
    verb: "Représenter",
    body: "les entreprises affiliées : majors du secteur, entreprises artisanales ou indépendantes. La FFIE compte aujourd'hui 8 500 entreprises et 150 000 salariés, soit 50 % des effectifs du secteur et 50 % de son chiffre d'affaires.",
  },
  {
    verb: "Défendre",
    body: "les intérêts de la profession à l'échelon national, européen et international auprès des organismes de la filière électrique et des grands acteurs.",
  },
  {
    verb: "Promouvoir",
    body: "et diffuser aux adhérents une information continue sur l'environnement normatif, technologique ou encore économique.",
  },
];

// "Sur tout le territoire" — the federation's local footprint.
export const MISSION_TERRITORY_TITLE = "Sur tout le territoire";
export const MISSION_TERRITORY_BODY =
  "La FFIE conseille et accompagne les entreprises au niveau local avec l'appui de ses 92 organisations départementales.";

// "Connectée aux marchés émergents" — lead-in + the nine emerging market areas
// the federation helps members move into.
export const MISSION_MARKETS_TITLE = "Connectée aux marchés émergents";
export const MISSION_MARKETS_INTRO =
  "La FFIE accompagne les entreprises adhérentes dans le développement de leur expertise et de leur savoir-faire, grâce aux conseils, outils de gestion et veille technologique ou réglementaire qu'elle délivre.";

export const MISSION_MARKETS: string[] = [
  "Intégration du numérique",
  "PoE (Power over Ethernet)",
  "Big data, IoT",
  "Compteurs intelligents",
  "Transition énergétique",
  "Photovoltaïque, autoconsommation",
  "Intelligence artificielle",
  "Mobilité électrique, IRVE",
];

// Closing line at the foot of the page.
export const MISSION_CLOSING =
  "La FFIE est engagée auprès de ses adhérents pour construire l'e-électricité.";

// ---------------------------------------------------------------------------
// Key figures — the federation's "FFIE en chiffres" infographic at the foot of
// the Missions et valeurs page. Reproduced as raw numbers so the animated
// infographic (components/MissionInfographic.tsx) can count up / fill rings to
// them. Percentages are 0–100.
// ---------------------------------------------------------------------------
export const MISSION_FIGURES = {
  entreprises: 8500, // entreprises adhérentes
  salariesPct: 50, // % des salariés du secteur
  actifs: 150000, // actifs FFIE
  caPct: 50, // % du CA du secteur
  caMds: 25, // Mds€ de chiffre d'affaires
  // Répartition du chiffre d'affaires
  neufPct: 40,
  renovationPct: 60,
  // Nature des travaux
  reseauxPct: 18, // travaux et réseaux
  batimentsPct: 82, // travaux dans les bâtiments
  // Travaux dans les bâtiments, par marché
  residentielPct: 27,
  tertiairePct: 44,
  industrielPct: 29,
} as const;

// The eight métiers listed down the left rail of the infographic, in page order.
// The infographic maps each to an icon; labels stay here so they're translatable
// and stay the single source of truth.
export const MISSION_METIERS: string[] = [
  "Automatismes",
  "Communication",
  "Confort thermique",
  "Éclairage",
  "Énergies",
  "Gestion technique du bâtiment",
  "Maintenance",
  "Sécurité",
];
