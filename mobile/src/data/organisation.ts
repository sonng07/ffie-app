// Organisation content — mirrors the FFIE "Organisation" page
// (ffie.fr/les-missions-de-la-ffie/organisation). In production this comes from
// the FFIE backend / CMS; entered here by hand for now so the Partners tab's
// "Organisation" segment has the federation's real copy.
//
// The page presents a short intro then the three bodies that run the federation:
// the Bureau, the Conseil d'administration, and the permanent Équipe.

// Subtitle under the large "Organisation" title.
export const ORG_SUBTITLE =
  "Un bureau et un conseil d'administration, composés exclusivement de chefs d'entreprise du secteur de l'intégration électrique, participent à l'organisation et définissent l'orientation générale.";

// One card per governing body. `stat` (optional) is the headline figure shown as
// a small badge; `body` is the descriptive line.
export type OrgBody = {
  id: string;
  title: string;
  stat?: string;
  body: string;
};

export const ORG_BODIES: OrgBody[] = [
  {
    id: "bureau",
    title: "Bureau",
    stat: "9 membres",
    body: "L'organe décisionnaire de la FFIE, composé de chefs d'entreprise du secteur et présidé par Pascal Toggenburger.",
  },
  {
    id: "conseil",
    title: "Conseil d'administration",
    stat: "46 membres",
    body: "46 chefs d'entreprise — l'ensemble des délégués régionaux, les membres du bureau et les administrateurs honoraires — assurent une représentation élargie de la gouvernance.",
  },
  {
    id: "equipe",
    title: "Équipe",
    body: "Toute l'action de l'équipe permanente de la FFIE est tournée vers le service aux entreprises adhérentes : informer, conseiller, défendre et accompagner.",
  },
];

// A person in one of the governing bodies. The source pages pair each with a
// portrait. To show real photo avatars, set `photo` on a member to either:
//   - a bundled asset:  photo: require("../../assets/team/rifaux.jpg")  (a number), or
//   - an image URL:     photo: "https://www.ffie.fr/.../rifaux.jpg"     (a string).
// When `photo` is absent the avatar falls back to an initials monogram
// (`initials`, or one derived from the name). `roles` are the title lines shown
// beside the name (stacked, in order).
export type OrgMember = {
  name: string;
  initials?: string;
  /** require()'d local asset (number) or remote image URL (string). */
  photo?: number | string;
  roles: string[];
};

// Members of the Bureau, from the "Les membres du bureau FFIE" org chart.
export const BUREAU_MEMBERS: OrgMember[] = [
  { name: "Pascal Toggenburger", initials: "PT", roles: ["Président"] },
  {
    name: "Renaud Collard de Soucy",
    initials: "RC",
    roles: ["Vice-président", "Commission Économique"],
  },
  {
    name: "François Bressolette",
    initials: "FB",
    roles: ["Vice-président", "Trésorier", "Chef de file IRVE"],
  },
  { name: "Philippe Ceschia", initials: "PC", roles: ["Animateur du GT Courants forts"] },
  {
    name: "Julien Chomont",
    initials: "JC",
    roles: ["Chef de file Social", "Président de la CSEEE (à partir de janvier 2026)"],
  },
  { name: "Frédéric Demongeot", initials: "FD", roles: ["Commission Technique et Innovations"] },
  { name: "Cathie Meppiel", initials: "CM", roles: ["Commission Emploi et Compétences"] },
  { name: "Francis Renier", initials: "FR", roles: ["Commission Artisanat"] },
  { name: "Jérôme Teste", initials: "JT", roles: ["Président du GMPV"] },
];

// Members of the Conseil d'administration, from the "Les membres du conseil
// d'administration" page — 46 chefs d'entreprise (regional delegates, department
// presidents, commission leads). The page also lists honorary administrators,
// not named here. Names are normalised to "Prénom NOM" order; roles preserve the
// page's labels, split into stacked lines where it lists two distinct roles.
export const CONSEIL_MEMBERS: OrgMember[] = [
  { name: "Julien Adrast", roles: ["Président de l'Indre-et-Loire"] },
  { name: "Jean-Marie Bailly", roles: ["Délégué régional Grand Est", "Président de l'Aube"] },
  { name: "Arnaud Belloir", roles: ["Délégué régional Pays de la Loire"] },
  { name: "Edith Berard", roles: ["Présidente des Pyrénées-Orientales"] },
  { name: "Daniel Bisegna", roles: ["Président du Calvados"] },
  { name: "Philippe Boni", roles: ["Animateur du GT Énergie"] },
  { name: "Christophe Bouguin", roles: ["Président FFB Yvelines"] },
  { name: "François Bressolette", roles: ["Vice-président Trésorier", "Chef de file IRVE"] },
  { name: "Claude Cadario", roles: ["Rhône"] },
  { name: "Philippe Ceschia", roles: ["Président du Territoire de Belfort"] },
  { name: "Franck Chaput", roles: ["Président de la Haute-Vienne"] },
  { name: "Julien Chomont", roles: ["CSEEE"] },
  { name: "Renaud Collard de Soucy", roles: ["Vice-président", "Président de la Commission Économique"] },
  { name: "Fabien Crief", roles: ["Délégué régional", "Président de la Seine-et-Marne"] },
  { name: "Régine Delanerie", roles: ["Hautes-Alpes"] },
  {
    name: "Frédéric Demongeot",
    roles: ["Délégué régional Bourgogne-Franche-Comté", "Président de la Commission Technique et Innovations"],
  },
  { name: "Bertrand Desplats", roles: ["Délégué régional Occitanie", "Président de l'Aude"] },
  { name: "Jonathan Duval", roles: ["Président de l'AniTEC"] },
  { name: "Sylvain François", roles: ["Président Le Havre Pointe de Caux"] },
  { name: "Cédric Ghigou", roles: ["Président du Var"] },
  { name: "Bernard Gioan", roles: ["Alpes-Maritimes"] },
  { name: "Frédéric Gondeau", roles: ["Président du Rhône"] },
  { name: "Gaëtan Guchet", roles: ["Grand Paris"] },
  { name: "Xavier Guidez", roles: ["Président Nord Pas-de-Calais"] },
  { name: "Thierry Guillot", roles: ["Délégué régional Nouvelle-Aquitaine"] },
  { name: "Nathalie Lacroix", roles: ["Présidente du Gers"] },
  { name: "Didier Lahure", roles: ["Président Nord Pas-de-Calais"] },
  { name: "Claude Leboue", roles: ["Délégué régional Hauts-de-France"] },
  { name: "Jocelyn Lefebvre", roles: ["Délégué régional Normandie"] },
  { name: "Stéphane Lelievre", roles: ["Délégué régional Bretagne"] },
  { name: "Alexandre Mahout", roles: ["Délégué régional Île-de-France 78-91-95"] },
  { name: "Nicolas Maillet-Avenel", roles: ["Seine-Maritime"] },
  { name: "Dominique Mathieu", roles: ["Président Meurthe-et-Moselle"] },
  {
    name: "Cathie Meppiel",
    roles: ["Présidente du Bas-Rhin", "Présidente de la Commission Emploi et Compétences"],
  },
  { name: "Patrick Moulard", roles: ["Alpes-Maritimes"] },
  { name: "Denis Onimus", roles: ["Grand Paris"] },
  { name: "Eric Ouvrard", roles: ["Essonne"] },
  { name: "Vincent Pireddu", roles: ["Délégué régional Corse"] },
  { name: "Marc Potier", roles: ["Président Côte d'Or"] },
  { name: "Francis Renier", roles: ["Président Commission Artisanat", "Délégué régional Centre-Val de Loire"] },
  { name: "Patrick Richaud", roles: ["Délégué régional PACA", "Président des Bouches-du-Rhône"] },
  { name: "Xavier Rosa", roles: ["Délégué régional Grand Paris", "Chef de file Social"] },
  { name: "Jérôme Teste", roles: ["Délégué régional Auvergne-Rhône-Alpes"] },
  { name: "Pascal Texereau", roles: ["Président de la Vienne"] },
  { name: "Pascal Toggenburger", roles: ["Président de la FFIE"] },
  { name: "Philippe Zanni", roles: ["Président de l'Hérault et du Gard"] },
];

// Administrateurs honoraires — listed alongside the Conseil d'administration,
// separate from its 46 acting members. A few hold an honorific presidency.
export const CONSEIL_HONORARY: OrgMember[] = [
  { name: "Jean-Claude Albarran", roles: [] },
  { name: "Jean-Claude Appert", roles: [] },
  { name: "Patrick Aygobere", roles: [] },
  { name: "Christian Desplats", roles: [] },
  { name: "Dominique Gabrielle", roles: [] },
  { name: "Emmanuel Gravier", roles: ["Président d'honneur"] },
  { name: "Jean-Claude Guillot", roles: ["Président d'honneur"] },
  { name: "Jean Lagarrigue", roles: [] },
  { name: "Francis Lepers", roles: ["Président honoraire"] },
  { name: "Jean-Pierre Monclin", roles: [] },
];

// The permanent team (the "Équipe FFIE" org chart). Portraits aren't ours to
// ship, so the popup renders initials monograms. The "Courants Forts" engineer
// slot is shown as a vacancy on the source (no name yet).
export const EQUIPE_MEMBERS: OrgMember[] = [
  { name: "Philippe Rifaux", roles: ["Délégué Général"] },
  { name: "Carole Falguières", roles: ["Secrétaire Générale"] },
  { name: "Solange Caboche", roles: ["Assistante Secrétariat Général"] },
  { name: "Leïla Ricato", roles: ["Ingénieure Performance Énergétique"] },
  { name: "Laurence Auger", roles: ["Assistante du Président et du Délégué Général"] },
  { name: "Clotilde Lepape", roles: ["Responsable Communication"] },
  { name: "Louis-Michel Rodrigues", roles: ["Responsable des Affaires Intérieures"] },
  { name: "Antoine Appol", roles: ["Assistant des Affaires Intérieures"] },
  { name: "Pierre-Mary Le Person", roles: ["Directeur des Affaires Techniques"] },
  { name: "Adel Guediri", roles: ["Ingénieur Courants Faibles"] },
  { name: "Poste à pourvoir", initials: "?", roles: ["Ingénieur Courants Forts"] },
];

// ANITEC team, shown as a separate cluster on the same org chart.
export const ANITEC_MEMBERS: OrgMember[] = [
  { name: "Lilian Caule", roles: ["Directeur technique"] },
  { name: "Karine Clément", roles: ["Assistante de direction"] },
];

// Switchboard numbers from the foot of the org chart. Real FFIE contact data.
export type OrgContact = { label: string; phone: string };
export const ORG_CONTACTS: OrgContact[] = [
  { label: "Accueil FFIE", phone: "01 44 05 84 00" },
  { label: "Hot line Technique", phone: "01 44 05 84 01" },
  { label: "Accueil Anitec", phone: "01 44 05 84 40" },
];
