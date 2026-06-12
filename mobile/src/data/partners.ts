// Contenu Partenaires — la vitrine soignée et segmentée que la fédération a
// validée pour l'onglet Partenaires. Elle remplace l'ancien annuaire à plat
// « Nos partenaires » par la propre présentation FFIE de ses interlocuteurs,
// répartie en trois segments :
//
//   - Écosystème · la chaîne commerciale avec laquelle un adhérent traite au
//                  quotidien (distributeurs, fabricants) ainsi que la fédération
//                  du bâtiment à laquelle il adhère (FFB).
//   - Lab_FFIE   · les organismes de qualité et de conformité, accompagnés d'un
//                  court texte présentant ce qu'est le Lab_FFIE.
//   - Partenaires · les partenaires institutionnels.
//
// Chaque entrée s'affiche comme une ligne de liste groupée : une tuile « logo »
// de marque, le nom du partenaire, un descriptif d'une ligne et un chevron qui
// ouvre le site officiel du partenaire dans le navigateur in-app. L'écran
// Partenaires est piloté par les données — pour changer ce qui est listé (ou
// ajouter un segment / une section), modifiez ce fichier, pas l'écran.
//
// Logos : nous n'embarquons pas encore les vrais fichiers de logo des
// partenaires, donc la tuile de tête est une pastille colorée portant le
// wordmark de la marque, teintée de la couleur d'identité reconnaissable de
// chaque marque (un substitut explicite, pas un logo inventé). Remplacez
// `PartnerLogo` par une source d'image embarquée quand les vrais visuels
// arriveront.

export type PartnerTabKey = "ecosystem" | "lab" | "partners";

// Une pastille « logo » de marque : une tuile teintée portant le wordmark de la
// marque. `outlined` ajoute un filet de bordure pour que les pastilles claires/
// blanches (Sonepar, FFB) restent lisibles sur une carte blanche.
export type PartnerLogo = {
  bg: string;
  fg: string;
  text: string;
  outlined?: boolean;
  // Quand défini, la tuile rend le vrai logo vectoriel embarqué au lieu du
  // wordmark de substitution (`text`). « ffb » → composant FFBLogo. `text`/`bg`
  // restent le repli. Étendre cette union au fur et à mesure que de vrais logos
  // de partenaires arrivent (FFIE-06).
  brand?: "ffb";
};

export type PartnerEntry = {
  id: string;
  name: string;
  descriptor: string;
  logo: PartnerLogo;
  // Site officiel. Ouvert dans le navigateur in-app natif quand on appuie sur la
  // ligne. À omettre pour une entrée sans site (la ligne n'est alors pas
  // cliquable).
  url?: string;
};

// Une série de lignes titrée au sein d'un segment (ex. « Distributeurs »). Le
// titre est l'en-tête de section de la table groupée, en majuscules.
export type PartnerGroup = {
  header: string;
  entries: PartnerEntry[];
};

// Carte explicative optionnelle affichée sous les groupes d'un segment (texte Lab_FFIE).
export type PartnerNote = {
  title: string;
  body: string;
};

export type PartnerTab = {
  key: PartnerTabKey;
  label: string;
  groups: PartnerGroup[];
  note?: PartnerNote;
};

export const PARTNER_TABS: PartnerTab[] = [
  {
    key: "ecosystem",
    label: "Écosystème",
    groups: [
      {
        header: "Distributeurs",
        entries: [
          {
            id: "rexel",
            name: "Rexel",
            descriptor: "Commande de matériel et suivi de livraison",
            logo: { bg: "#15294E", fg: "#FFFFFF", text: "Rexel" },
            url: "https://www.rexel.fr/",
          },
          {
            id: "sonepar",
            name: "Sonepar",
            descriptor: "Catalogue et Solutions Pro",
            logo: { bg: "#FFFFFF", fg: "#0098D8", text: "Sonepar", outlined: true },
            url: "https://www.sonepar.fr/",
          },
        ],
      },
      {
        header: "Fabricants",
        entries: [
          {
            id: "schneider",
            name: "Schneider Electric",
            descriptor: "Configurateurs techniques et documentation",
            logo: { bg: "#161616", fg: "#3DCD58", text: "Schneider" },
            url: "https://www.se.com/fr/fr/",
          },
          {
            id: "legrand",
            name: "Legrand",
            descriptor: "Produits, logiciels et BIM",
            logo: { bg: "#E2001A", fg: "#FFFFFF", text: "Legrand" },
            url: "https://www.legrand.fr/",
          },
          {
            id: "hager",
            name: "Hager",
            descriptor: "Tableaux électriques et domotique",
            logo: { bg: "#004A99", fg: "#FFFFFF", text: "hager" },
            url: "https://www.hager.fr/",
          },
        ],
      },
      {
        header: "Fédération d'adhésion",
        entries: [
          {
            id: "ffb",
            name: "FFB",
            descriptor: "Fédération Française du Bâtiment",
            // Vrai logo FFB (asset embarqué, le même que l'en-tête Accueil + le
            // pied de connexion) plutôt que le wordmark de substitution.
            logo: { bg: "#FFFFFF", fg: "#14387F", text: "FFB", outlined: true, brand: "ffb" },
            url: "https://www.ffbatiment.fr/",
          },
        ],
      },
    ],
  },
  {
    key: "lab",
    label: "Lab_FFIE",
    // FFIE-07 — CONSUEL et QUALIFELEC ne doivent PAS apparaître identiques ni
    // regroupés. Chacun a donc sa propre section (carte distincte + en-tête
    // distinct), en plus de sa couleur d'identité de marque distincte (CONSUEL
    // bleu marine, QUALIFELEC rouge). Les deux signaux — la séparation
    // structurelle et la couleur — les différencient sans s'appuyer sur la seule
    // couleur (P4).
    groups: [
      {
        header: "Conformité des installations",
        entries: [
          {
            id: "consuel",
            name: "CONSUEL",
            descriptor: "Attestation de conformité des installations électriques",
            logo: { bg: "#1B2A52", fg: "#FFFFFF", text: "Consuel" },
            url: "https://www.consuel.com/",
          },
        ],
      },
      {
        header: "Qualification des entreprises",
        entries: [
          {
            id: "qualifelec",
            name: "QUALIFELEC",
            descriptor: "Qualification des entreprises d'électricité",
            logo: { bg: "#E2001A", fg: "#FFFFFF", text: "Qualifelec" },
            url: "https://www.qualifelec.fr/",
          },
        ],
      },
    ],
    note: {
      title: "À propos du Lab_FFIE",
      body: "Espace dédié aux innovations, expérimentations et projets collaboratifs menés par la fédération et ses partenaires.",
    },
  },
  {
    key: "partners",
    // FFIE-08 — le client nomme ce segment « Partenaires FFIE » (le contrôle
    // segmenté rétrécit le libellé pour le faire tenir : numberOfLines + adjustsFontSizeToFit).
    label: "Partenaires FFIE",
    groups: [
      {
        header: "Partenaires institutionnels",
        entries: [
          {
            id: "afnor",
            name: "AFNOR",
            descriptor: "Normalisation française",
            logo: { bg: "#2C2C2C", fg: "#FFFFFF", text: "Afnor" },
            url: "https://www.afnor.org/",
          },
          {
            id: "oppbtp",
            name: "OPPBTP",
            descriptor: "Prévention et sécurité BTP",
            logo: { bg: "#0072BC", fg: "#FFFFFF", text: "OPP BTP" },
            url: "https://www.preventionbtp.fr/",
          },
          {
            id: "probtp",
            name: "PRO BTP",
            descriptor: "Protection sociale du bâtiment",
            logo: { bg: "#009640", fg: "#FFFFFF", text: "PRO BTP" },
            url: "https://www.probtp.com/",
          },
        ],
      },
    ],
  },
];
