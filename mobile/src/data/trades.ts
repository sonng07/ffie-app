import type { ImageSourcePropType } from "react-native";
import type { RichSegment } from "@/data/news";

// Content for the Trades tab — "Discover the professions" (WBS Epic 4).
//
// Structured to mirror the CLIENT careers page
// (ffie.fr/les-metiers-de-lelectricite/metiers-et-formations): hero + intro,
// the 5 specialization domains (accordion), a hero illustration, two feature
// cards (7 reasons / the kit), and a "professions of tomorrow" training
// section (card grid).
//
// P6 — No login wall: everything here is public, readable, shareable.
//
// IMAGERY: all `seed`/illustration visuals are PLACEHOLDERS (random
// picsum.photos). Production MUST replace them with real FFIE assets — the
// branded hero illustration, real training photography, and partner logos.
// The `alt` text is the contract those real images have to meet (P7:
// representation — women, people of colour, a range of ages). Each item also
// takes an optional `imageUrl`, so dropping in a real asset is one line.

// The hero intro paragraph — the client page's own wording (translated), used
// verbatim so the screen matches their copy as well as their layout.
export const TRADE_INTRO =
  "Des métiers, des évolutions professionnelles, le travail en équipe, un secteur moderne et innovant, riche en rencontres, des savoir-faire toujours plus pointus — le secteur de l'électricité est aujourd'hui en plein essor !";

// The branded hero illustration that sits under the accordion on the client
// page (an isometric connected-building scene). Placeholder until FFIE supplies
// the real artwork.
export const ILLUSTRATION = {
  seed: "ffie-trades-illustration",
  imageUrl: undefined as string | undefined,
  alt: "Illustration isométrique d'un bâtiment connecté et électrifié — panneaux solaires, recharge de véhicules électriques, éclairage et liaisons réseau",
};

// The rich content shown in the full-screen DETAIL MODAL when a domain row is
// tapped (mirrors the client page's expanded view: hero photo, a definition,
// an accent call-to-action heading, body copy, and a key-terms box). Filled in
// per-domain as FFIE supplies the real copy; a domain without `detail` falls
// back to its blurb + tags in the modal.
export type DomainDetail = {
  // Hero photo at the top of the sheet. Prefer a bundled `source`
  // (`require("../../assets/x.jpg")`) for a real shipped asset; `imageUrl` for
  // a CMS URL; otherwise the seeded picsum PLACEHOLDER (see IMAGERY note above)
  // shows. `alt` is the contract the real image must meet.
  image: { source?: ImageSourcePropType; seed: string; imageUrl?: string; alt: string };
  // Lead paragraph — the plain-language definition that opens the sheet.
  intro: string;
  // The accent sub-heading ("Devenez acteur…") under the intro.
  heading: string;
  // Body paragraphs. `**term**` spans render bold for key vocabulary.
  body: string[];
  // The "Mots-clés" box at the foot of the sheet.
  keywords: { title: string; terms: string[] };
};

// The 5 specialization DOMAINS, named exactly as the client page lists them.
// Each row opens a detail modal (title + the `detail` content below); domains
// keep a short `blurb` + `tags` as the modal's fallback summary.
export type Domain = {
  id: string;
  title: string;
  blurb: string;
  /** A few concrete sub-areas, shown as small tags. */
  tags: string[];
  /** Rich modal content. Added per-domain as FFIE supplies the real copy. */
  detail?: DomainDetail;
};

export const DOMAINS: Domain[] = [
  {
    id: "energy",
    title: "Transition énergétique",
    blurb:
      "Panneaux solaires, bornes de recharge pour véhicules électriques, batteries et gestion intelligente de l'énergie — l'ensemble qui électrifie le chauffage, les transports et les logements.",
    tags: ["Solaire", "Recharge VE", "Stockage"],
    detail: {
      image: {
        source: require("../../assets/domain-energy.jpg"),
        seed: "ffie-domain-energy",
        imageUrl: undefined,
        alt: "Une main tenant une sphère végétale entourée d'icônes d'énergies renouvelables : solaire, éolien, recharge électrique, recyclage",
      },
      intro:
        "La rénovation énergétique regroupe l'ensemble des travaux d'un bâtiment qui visent à réduire la consommation d'énergie de ses habitants ou de ses usagers (locaux tertiaires).",
      heading: "Devenez acteur de la transition énergétique",
      body: [
        "Dans le domaine des énergies renouvelables et de la transition énergétique, l'électricien intégrateur installe les **panneaux solaires photovoltaïques** et propose des **solutions d'autoconsommation** grâce aux **batteries de stockage d'énergie**.",
        "Il conseille et accompagne ses clients pour **maîtriser leur consommation**, en déployant des **systèmes de pilotage et de gestion** de l'**éclairage, du chauffage et de la climatisation**.",
        "Il installe également les **bornes de recharge pour véhicules électriques**, chez les particuliers comme dans tous les espaces dédiés.",
      ],
      keywords: {
        title: "Mots-clés",
        terms: [
          "Photovoltaïque",
          "Stockage d'énergie",
          "Autoconsommation",
          "Recharge des véhicules électriques et hybrides rechargeables",
          "Éoliennes",
          "Hydroélectricité",
          "Hydrogène",
        ],
      },
    },
  },
  {
    id: "buildings",
    title: "Bâtiments connectés",
    blurb:
      "Des bâtiments intelligents : éclairage, chauffage, accès et confort qui réagissent d'eux-mêmes. Domotique et gestion technique du bâtiment.",
    tags: ["Domotique", "GTB", "IoT"],
    detail: {
      image: {
        source: require("../../assets/domain-buildings.jpg"),
        seed: "ffie-domain-buildings",
        imageUrl: undefined,
        alt: "Vue aérienne d'une ville moderne au crépuscule, parcourue de lignes lumineuses reliant les bâtiments — symbole du bâtiment connecté",
      },
      intro: "Grâce à l'électricité, le bâtiment devient intelligent.",
      heading: "L'électricité au cœur du bâtiment intelligent",
      body: [
        "On parle aussi de **gestion technique du bâtiment (GTB)** : un système informatique qui pilote et supervise les différents équipements électriques et mécaniques d'un bâtiment — température (chaud-froid), éclairage, alimentation électrique, systèmes de sécurité ou de protection incendie.",
        "L'électricien intervient dans l'intégration de ces équipements : il devient le **vecteur du bâtiment dit intelligent, connecté et piloté**.",
        "Grâce à sa formation, l'électricien peut devenir un véritable spécialiste de la GTB.",
      ],
      keywords: {
        title: "Mots-clés",
        terms: [
          "Smart Building",
          "Domotique",
          "Capteurs",
          "Maison connectée",
          "GTB",
          "IoT",
          "Bâtiment à énergie positive",
          "Gestion du bâtiment",
          "Intelligence artificielle",
          "Data",
          "Confort et sécurité",
          "Bâtiment intelligent",
          "Performance énergétique",
          "Maintenance prédictive",
        ],
      },
    },
  },
  {
    id: "networks",
    title: "Réseaux de communication",
    blurb:
      "Fibre, Wi-Fi et 5G — le câblage qui fait circuler les données dans un bâtiment. La colonne vertébrale de tout ce qui est connecté.",
    tags: ["Fibre", "5G", "Wi-Fi"],
    detail: {
      image: {
        source: require("../../assets/domain-networks.jpg"),
        seed: "ffie-domain-networks",
        imageUrl: undefined,
        alt: "Une main tenant un smartphone affichant une application de maison connectée, dans une cuisine entourée d'objets connectés",
      },
      intro:
        "Dans les années à venir, Internet, la télévision numérique, les réseaux d'objets connectés, ainsi que les nouveaux besoins et usages liés à l'évolution de la société et de l'habitat vont continuer à se développer considérablement, à la maison comme au bureau.",
      heading: "L'électricité et les réseaux de communication",
      body: [
        "L'électricien peut se spécialiser dans les **réseaux de communication** et se placer au cœur de la **communication**.",
        "Pilotage des objets à distance, réseaux sociaux, maintien du lien social, e-commerce, accès à la vidéo, au câble… Tous ces services circulent à l'intérieur des bâtiments grâce aux **réseaux de communication**, dont les performances n'ont cessé de progresser ces dernières années.",
        "Certaines formations d'électricien mènent directement à ces nouvelles compétences.",
      ],
      keywords: {
        title: "Mots-clés",
        terms: [
          "Fibre optique",
          "5G",
          "Connexion",
          "Câblage",
          "Technologies de l'information et de la communication (TIC)",
          "Radio et télévision",
          "Informatique",
          "Télécommunications",
          "Tableau de communication",
          "Réseau domestique",
          "Radiofréquences",
        ],
      },
    },
  },
  {
    id: "cyber",
    title: "Cybersécurité",
    blurb:
      "Protéger les bâtiments connectés et les réseaux contre les intrusions — un domaine du métier en forte croissance et très demandé.",
    tags: ["Réseaux", "Sécurité"],
    detail: {
      image: {
        source: require("../../assets/domain-cyber.jpg"),
        seed: "ffie-domain-cyber",
        imageUrl: undefined,
        alt: "Des mains tapant sur un clavier d'ordinateur, entourées d'icônes de cybersécurité : cadenas, données et protection",
      },
      intro:
        "L'évolution numérique des systèmes de sécurité électroniques — et en particulier le déploiement de solutions numériques et informatiques enrichies par l'intelligence artificielle — ouvre de nouveaux usages et de nouvelles missions pour les électriciens intégrateurs.",
      heading: "Cybersécurité",
      body: [
        "Grâce aux innovations du numérique, il est désormais possible d'**anticiper**, de **repenser** les scénarios de prévention et d'alerte, et de **redéployer rapidement** les mesures de sécurité nécessaires.",
        "Ces technologies de sécurité transforment l'espace urbain en **territoire intelligent**. C'est l'une des **voies d'avenir pour les électriciens** : se spécialiser dans ce domaine pour intégrer, maintenir, exploiter et sécuriser les risques liés aux **cybermenaces** et à la protection des **données personnelles**.",
      ],
      keywords: {
        title: "Mots-clés",
        terms: [
          "Cybermenaces",
          "Sécurité informatique",
          "Sécurité des réseaux",
          "Sécurité applicative",
          "Stockage des données",
          "Protection des données",
          "Cyberattaques",
        ],
      },
    },
  },
  {
    id: "automation",
    title: "Automatisation",
    blurb:
      "Automatisation industrielle et robotique — les systèmes qui pilotent les machines, les lignes de production et les procédés.",
    tags: ["Robotique", "Systèmes de commande"],
    detail: {
      image: {
        source: require("../../assets/domain-automation.jpg"),
        seed: "ffie-domain-automation",
        imageUrl: undefined,
        alt: "Un technicien tenant un ordinateur portable dans une salle de serveurs aux éclairages bleus",
      },
      intro:
        "L'automatisation industrielle est un secteur moderne et innovant, où les technologies électroniques, électrotechniques, mécaniques ou de communication sont conçues pour faire fonctionner des machines ou des procédés automatisés — des mécanismes capables de fonctionner sans intervention humaine.",
      heading: "L'électricité et l'automatisation",
      body: [
        "L'électricien peut se spécialiser dans ce domaine porteur et en devenir l'opérateur : celui qui **donne les instructions** et **programme le système**, et qui sait interpréter les **signaux** que les commandes lui renvoient.",
      ],
      keywords: {
        title: "Mots-clés",
        terms: [
          "Robotique",
          "Motorisation",
          "Systèmes électriques automatiques",
          "Électronique",
          "Électrotechnique",
          "Télécommunication",
          "Contrôle d'accès",
          "Vidéosurveillance",
          "Vidéoprotection",
          "Sûreté",
          "Automatisation industrielle",
          "Décarbonation",
          "Transition énergétique",
        ],
      },
    },
  },
];

const METIERS_PAGE = "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations";

// The two feature cards under the illustration (client: "7 Reasons…" and the
// "kit professions"). Each opens its source externally (P6 — no gate).
export type Feature = {
  id: string;
  title: string;
  blurb: string;
  url: string;
};

export const FEATURES: Feature[] = [
  {
    id: "reasons",
    title: "7 raisons de devenir électricien",
    blurb:
      "Intéressé par le métier d'intégrateur électricien, ou simplement intrigué ? Voici 7 bonnes raisons de se former ou de postuler.",
    url: METIERS_PAGE,
  },
  {
    id: "kit",
    title: "Découvrez les métiers de l'électricité",
    blurb:
      "Un « kit métiers de l'électricité » pour découvrir les métiers, les formations et les témoignages de jeunes apprentis et de chefs d'entreprise.",
    url: METIERS_PAGE,
  },
];

// The training section heading + intro, then the training cards.
export const TRAINING_HEADING = "Découvrez les formations aux métiers de demain !";
export const TRAINING_INTRO =
  "L'électricien est aujourd'hui un véritable intégrateur — un multi-technicien dont le travail est divers et varié. Il déploie des solutions pour les bâtiments connectés, les nouvelles mobilités, les énergies renouvelables et la performance énergétique, en alliant électricité et numérique. Ces métiers sont modernes, tournés vers l'avenir et accessibles à tous les niveaux de qualification, avec de réelles perspectives d'évolution.";

// Rich content shown in the formation DETAIL reader (pushed when a training
// card is tapped). Mirrors the News article reader's structure: a small accent
// chip, the title (the card's `title`), a muted meta line, then the body —
// paragraphs or rich lines where bold / link spans render (link spans open in
// the in-app browser). Filled in per-formation as FFIE supplies the copy; a
// training without `detail` shows a "Détails à venir" placeholder in the reader.
// A formation body block. Extends the News article's paragraph / rich-line
// model with two structural blocks the FFIE formation pages use — section
// sub-headings and bulleted lists. Local to Trades, so the News reader is
// untouched. The first block renders as a larger "lead" line (like News).
export type TrainingBlock =
  | string // a plain paragraph
  | RichSegment[] // a rich line — bold / link spans, like a News article line
  | { heading: string } // an accent section sub-heading
  | { list: string[] }; // a bulleted list

export type TrainingDetail = {
  /** Small accent pill above the title (e.g. "Formation", "Bac +2"). */
  chip?: string;
  /** Muted line under the title, where the News reader shows the date
   *  (e.g. "Niveau CAP · 2 ans"). */
  meta?: string;
  /** Body blocks — paragraphs, rich lines, sub-headings, and lists. */
  body: TrainingBlock[];
  /** Optional "En savoir plus →" external link at the foot of the reader. */
  link?: { label: string; url: string };
};

export type Training = {
  id: string;
  title: string;
  blurb: string;
  seed: string;
  imageUrl?: string;
  alt: string;
  /** Rich reader content. Added per-formation as FFIE supplies the copy. */
  detail?: TrainingDetail;
};

export const TRAININGS: Training[] = [
  {
    id: "cap",
    title: "CAP Électricien",
    blurb: "Ce diplôme mène directement à la vie active — avec un emploi à la clé.",
    seed: "ffie-train-cap",
    alt: "Un apprenti électricien câblant un tableau sur un établi, concentré",
    detail: {
      meta: "Niveau CAP · 2 ans · après la 3ᵉ",
      body: [
        "Le CAP est un diplôme professionnel qui se prépare en 2 ans après la 3ᵉ, à temps plein ou en apprentissage. Il débouche sur la vie active avec un emploi à la clé !",
        { heading: "Ma mission" },
        "Avec le CAP, l'électricien intègre des lignes de câbles auxquelles il raccorde les différents équipements électriques pour distribuer l'électricité dans les bâtiments.",
        "L'électricien intégrateur travaille sur des chantiers de construction ou de rénovation ; il coordonne ses activités avec celles des autres ouvriers. Après avoir étudié les plans et schémas qui concernent la pose des câbles, il repère le futur emplacement des disjoncteurs, tableaux ou armoires électriques. Il installe alors les canalisations et les supports, pose le réseau de câbles, implante les divers matériels (interrupteurs, prises de courant, appareils de chauffage) et effectue les raccordements nécessaires.",
        "Une fois ces travaux achevés, il procède à une série de tests pour vérifier que l'installation est bien conforme aux plans et schémas fournis dès le départ. Il participe à la mise en service en présence du client et du chef de chantier.",
        "Selon les chantiers, l'électricien peut aussi assurer :",
        {
          list: [
            "le câblage des liaisons informatiques ou de la téléphonie,",
            "l'intégration et le réglage de la vidéosurveillance,",
            "les systèmes d'alarme,",
            "la gestion du chauffage et de la climatisation.",
          ],
        },
        "Les missions s'effectuent sous la responsabilité du chef de chantier.",
        { heading: "Une fois mon CAP en poche, je fais quoi ?" },
        [
          { text: "Mes domaines d'intervention. ", bold: true },
          {
            text: "Les domaines des missions de l'électricien sont variés : le bâtiment, l'industrie, l'agriculture, les services et les infrastructures.",
          },
        ],
        [
          { text: "Mes atouts pour réussir et évoluer. ", bold: true },
          {
            text: "Esprit d'équipe, rigueur et sens des responsabilités sont vos principaux atouts. Les débouchés ne manquent pas, et les chances d'évoluer vers un poste de chef d'équipe ou de chef de chantier sont réelles.",
          },
        ],
        { heading: "Et après mon CAP, je peux continuer mes études ?" },
        "Après le CAP, il est possible de poursuivre sa formation, sous certaines conditions : en 1 an avec une mention complémentaire (MC), ou en 2 ans avec le bac professionnel ou un brevet professionnel (BP).",
        { heading: "Témoignage — Gaspard, 18 ans" },
        "« Après la 3ᵉ, j'ai souhaité quitter le cursus scolaire classique pour apprendre un métier. Très vite, j'ai voulu faire un CAP d'électricité : j'étais minutieux et rigoureux, et je savais que je trouverais du travail rapidement.",
        "Une fois mon CAP obtenu, j'ai effectivement trouvé tout de suite un emploi chez un artisan, qui m'a toujours accompagné et m'a appris à développer mes compétences sur le terrain.",
        "Au bout d'un an, mon patron m'a demandé si je souhaitais reprendre mes études en apprentissage. J'ai dit oui tout de suite : je suis aujourd'hui en bac pro, en apprentissage. J'alterne des périodes à l'école et, le plus souvent, je suis sur le terrain. C'est complètement différent des études au collège… je peux mettre en pratique mes connaissances. »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/cap-electricien",
      },
    },
  },
  {
    id: "bacpro",
    title: "Bac Pro MELEC",
    blurb: "Avec le Bac Pro MELEC, c'est l'emploi dès l'obtention du diplôme.",
    seed: "ffie-train-melec",
    alt: "Une jeune étudiante travaillant sur une platine de formation électrique",
    detail: {
      meta: "Niveau Bac · 3 ans · après la 3ᵉ ou un CAP",
      body: [
        "Le baccalauréat professionnel se prépare en 3 ans après la 3ᵉ (2de pro, 1re pro et terminale pro), en lycée professionnel. Il peut aussi se préparer après un CAP de la même spécialité (CAP électricien), sous certaines conditions, ou après une 2de générale et technologique.",
        { heading: "J'ai un Bac Pro MELEC, quel sera mon métier ?" },
        "Ce diplôme peut se préparer en apprentissage ou en école. Le bac pro prépare à l'entrée dans la vie active, mais permet aussi la poursuite d'études, notamment en BTS.",
        "Avec le bac pro MELEC, c'est dans tous les cas une embauche dès l'obtention du diplôme !",
        { heading: "Ma mission" },
        "Avec ce diplôme, vous allez contribuer à la performance énergétique des bâtiments et des installations.",
        "Votre mission sera fortement liée à l'évolution des techniques, des technologies, des méthodes et des matériels. Vous participerez à l'analyse des risques professionnels et à la mise en œuvre, en étant le garant du respect des exigences de santé et de sécurité au travail.",
        "Vous mettrez en œuvre les réglementations environnementales et proposerez des solutions techniques minimisant l'impact sur l'environnement.",
        "Vous participerez activement à la démarche qualité de l'entreprise et aurez un rôle dans l'approche économique des travaux menés.",
        "Votre rôle sera déterminant à toutes les étapes : avant la réalisation, pour la mise en service et pour la maintenance.",
        { heading: "Mes domaines d'intervention" },
        "Le bac pro MELEC est une formation polyvalente qui permet de travailler dans de multiples secteurs d'activité et une grande variété de structures, et qui débouche sur une multitude de métiers :",
        {
          list: [
            "Secteurs d'activité : réseaux (production, transport, distribution et gestion de l'énergie électrique), bâtiment, industrie, services, infrastructures, quartiers et zones d'activité, systèmes énergétiques autonomes et embarqués…",
            "Employeurs : entreprises artisanales et industrielles, collectivités et administrations.",
            "Métiers : artisan électricien, électrotechnicien, technicien d'installation, de maintenance ou de dépannage (domotique, alarmes, fibre optique, câble, réseau informatique ou de télécommunications).",
          ],
        },
        { heading: "Mes atouts pour réussir mes missions" },
        "Un bon sens relationnel pour communiquer avec son environnement professionnel (client, hiérarchie, équipe, autres intervenants…), de la rigueur et un sens de l'écoute, avec un goût prononcé pour les nouvelles technologies.",
        "Esprit d'équipe et d'entraide pour bien s'intégrer sur un chantier.",
        { heading: "Et après mon bac pro, quelles évolutions ?" },
        "Après quelques années d'expérience, vous pourrez coordonner une activité en équipe.",
        "Même si le bac pro a pour premier objectif l'insertion professionnelle, une poursuite d'études est envisageable en BTS avec un bon dossier ou une mention à l'examen. Une spécialisation est aussi possible avec une mention complémentaire.",
        "À noter : c'est en maintenance et en conseil technique que les emplois se développent le plus rapidement.",
        "Quelques poursuites d'études possibles :",
        {
          list: [
            "MC Technicien(ne) en réseaux électriques",
            "BTS Assistance technique d'ingénieur",
            "BTS Conception et réalisation de systèmes automatiques",
            "BTS Contrôle industriel et régulation automatique",
            "BTS Fluides, énergies, domotique — option A génie climatique et fluidique",
            "BTS Fluides, énergies, domotique — option B froid et conditionnement d'air",
            "BTS Fluides, énergies, domotique — option C domotique et bâtiments communicants",
            "BTS Maintenance des systèmes — option A systèmes de production",
            "BTS Maintenance des systèmes — option C systèmes éoliens",
          ],
        },
        { heading: "Témoignage — Paul, 21 ans" },
        "« Après avoir obtenu le bac pro MELEC, j'ai trouvé rapidement un poste dans une entreprise de ma région. En fait, j'avais plusieurs offres et j'ai choisi l'entreprise la plus proche de chez moi.",
        "Depuis près d'un an, je suis électrotechnicien dans une entreprise d'électricité spécialisée dans l'équipement de logements neufs.",
        "Mes missions sont variées, le travail en équipe est motivant, on apprend beaucoup des autres ! Et puis on se déplace : notre activité nous amène à changer de lieu assez souvent, il n'y a pas de routine !",
        "Peut-être que je vais reprendre mes études pour me perfectionner… J'y pense de plus en plus ! »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/bac-pro-melec",
      },
    },
  },
  {
    // Position 3 mirrors the FFIE site's "BEP" entry, which has no detail page
    // on ffie.fr. With no `detail`, the card renders NON-interactive (muted,
    // not tappable) — an honest placeholder until/if FFIE publishes a fiche.
    id: "bep",
    title: "BEP Métiers de l'électricité",
    blurb: "Fiche à venir.",
    seed: "ffie-train-bep",
    alt: "Un apprenti travaillant sur une installation électrique en atelier",
  },
  {
    id: "bp",
    title: "BP Électricien",
    blurb: "Soyez opérationnel immédiatement.",
    seed: "ffie-train-bp",
    alt: "Un électricien installant un tableau électrique dans un logement",
    detail: {
      meta: "Niveau Bac · 2 ans · après un CAP, en alternance",
      body: [
        "Une préparation en alternance, pour un métier directement opérationnel.",
        { heading: "Comment j'intègre un BP d'électricien ?" },
        "Le BP se prépare en 2 ans, après un CAP, et permet d'acquérir un niveau de qualification plus élevé (niveau bac). Ce diplôme est axé sur la maîtrise et le perfectionnement du métier d'électricien. Il se prépare le plus souvent en apprentissage, au sein d'un CFA.",
        { heading: "Quelles seront mes missions avec ce diplôme ?" },
        "Avec ce diplôme, l'électricien a les compétences pour intervenir sur toute la durée d'un chantier : de la réalisation de la structure du gros œuvre (gaines, réservations et inserts…) aux travaux de finition, de mise en service et essais avant réception. Il sera en capacité d'ouvrir un chantier et d'en assurer l'exécution, le suivi, le contrôle et la réception.",
        "Avec le BP, l'électricien sera autonome et capable, sur un petit chantier, d'avoir une ou deux personnes sous sa responsabilité. Cette formation offre les capacités pour intervenir tout au long de la durée de vie du bâtiment et des réseaux (maintenance, dépannage). L'électricien titulaire du BP saura respecter les exigences énergétiques et environnementales et travailler avec les autres corps de métier.",
        "Il aura également des connaissances économiques et commerciales de base pour pouvoir gérer un chantier et/ou une entreprise (coûts, délais, solutions, communication).",
        { heading: "Quels seront mes domaines d'intervention ?" },
        "Avec le BP, l'électricien met en œuvre et intervient sur les installations électriques et sur les réseaux de communication. Les secteurs d'activité sont nombreux : les réseaux (énergie électrique, fibre optique, etc.), les bâtiments des secteurs résidentiel, tertiaire et industriel, les bornes de recharge pour véhicules électriques, le photovoltaïque… Les domaines d'intervention sont variés, au cœur des enjeux environnementaux et sociétaux.",
        { heading: "Mes atouts pour réussir et évoluer" },
        "Esprit d'équipe, rigueur et sens des responsabilités sont vos principaux atouts.",
        { heading: "Témoignage — Slimane, 19 ans" },
        "« Après avoir passé un CAP d'électricité, j'ai poursuivi en passant un BP. Ce diplôme m'a donné des compétences complémentaires pour gagner en autonomie et en expertise. Le métier d'électricien a beaucoup changé : aujourd'hui, il s'agit de rendre l'énergie électrique intelligente pour que les utilisateurs consomment moins et mieux. Et puis, je suis sûr d'avoir toujours un emploi, car l'électricité est partout ! »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/bp-electricien",
      },
    },
  },
  {
    id: "sti2d",
    title: "Bac STI2D, option EE",
    blurb: "Passionné par l'innovation technologique ? Ce Bac est fait pour vous.",
    seed: "ffie-train-sti2d",
    alt: "Des élèves travaillant ensemble sur de l'électronique en classe",
    detail: {
      meta: "Bac technologique · 2 ans · option Énergies & environnement",
      body: [
        "Ce bac technologique donne une approche concrète de l'enseignement des sciences, avec de nombreux débouchés à la clé.",
        { heading: "Le bac STI2D est-il fait pour moi ?" },
        "Passionné(e) par l'innovation technologique et le respect de l'environnement, le bac STI2D est fait pour vous ! Il s'agit du baccalauréat série Sciences et Technologies de l'Industrie et du Développement Durable.",
        "Pour s'orienter vers cette série, il est préférable d'avoir choisi en seconde, comme enseignement d'exploration, SI (sciences de l'ingénieur) ou CIT (création et innovation technologique).",
        "À noter : le bac techno STI2D ne se prépare pas en alternance.",
        { heading: "L'enseignement et les matières" },
        "La série STI2D permet d'acquérir des compétences technologiques étendues, transversales à tous les domaines industriels, ainsi que des compétences approfondies dans un champ de spécialité.",
        "Les enseignements sont conçus de façon interdisciplinaire et en lien étroit avec les sciences, ce qui ouvre des possibilités de poursuites d'études. Ils reposent sur des connaissances dans trois domaines : l'énergie, l'information et la matière.",
        "Préparé en 2 ans après une seconde générale ou technologique, le bac STI2D propose deux spécialités en terminale :",
        {
          list: [
            "Physique-chimie et mathématiques.",
            "Ingénierie, innovation et développement durable — avec, au choix, l'un des enseignements spécifiques : innovation technologique et écoconception ; systèmes d'information et numérique ; énergies et environnement ; architecture et construction.",
          ],
        },
        "Le programme associe l'observation, l'expérimentation et le raisonnement théorique. Vous travaillerez sur un projet pour réaliser un prototype ou une maquette.",
        { heading: "Les perspectives professionnelles" },
        "Ces cursus conduisent aux métiers de technicien ou d'ingénieur en électrotechnique, électronique, informatique, mécanique, génie civil ou logistique.",
        "Avec le bac STI2D, c'est un parcours diversifié et concret qui vous attend, et l'opportunité d'intégrer des filières d'avenir.",
        { heading: "Mes atouts pour réussir" },
        "Un bon sens relationnel, de la curiosité, une appétence pour les nouvelles technologies et l'envie de créer, d'innover…",
        { heading: "Et après mon bac STI2D, quelles évolutions ?" },
        "En tête des poursuites d'études après le bac STI2D : un BTS (en 2 ans) ou un BUT (diplôme en 3 ans qui a remplacé le DUT). Vous pouvez également postuler, sur dossier, dans certaines écoles d'ingénieurs (5 ans) ou dans quelques écoles spécialisées.",
        { heading: "Autres voies possibles" },
        "Une classe préparatoire aux grandes écoles (2 ans), réservée aux bacheliers STI2D, qui permet d'intégrer une école d'ingénieurs.",
        "L'entrée en licence (3 ans) est envisageable. Attention : l'université nécessite un bon niveau dans les matières générales, de l'autonomie et de bonnes capacités à l'écrit.",
        "Avec le bac STI2D, un large choix d'études courtes ou longues s'offre à vous, en particulier dans le secteur du BTP et la gestion de l'électricité et des énergies en général :",
        {
          list: [
            "BTS ou DUT puis licence pro dans le BTP, les énergies et l'environnement, le paramédical, le commerce, l'audiovisuel, l'électronique et l'informatique, les télécommunications et le numérique, les constructions diverses, la maintenance, les matériaux ou la mécanique.",
            "Licence (sciences et technologies, sciences pour l'ingénieur, mécanique, génie civil), puis master.",
            "Prépa TSI (technologie et sciences industrielles) pour intégrer les écoles d'ingénieurs recrutant sur concours communs : Concours commun INP, CentraleSupélec, Epita-Ipsa-Esme.",
          ],
        },
        { heading: "Témoignage — Lucie, 21 ans" },
        "« Mon bac STI2D en poche, j'ai choisi de me spécialiser dans la gestion des réseaux et des télécommunications, et j'ai postulé via Parcoursup au BUT (ancien DUT) Réseaux et Télécommunications (R&T).",
        "Cet enseignement propose un mix technologique et professionnel. Il permet de développer des connaissances et des compétences en informatique pour les réseaux et télécommunications, en administration des réseaux (architecture de l'internet, exploitation de systèmes virtualisés, cloud…) et en télécommunications (mobiles, Wi-Fi), ainsi qu'en cybersécurité. Ces enseignements sont complétés par des cours de mathématiques, d'électronique, de physique, d'économie-gestion, de communication et d'anglais.",
        "À partir du 3ᵉ semestre, quatre parcours de spécialisation sont proposés au choix, et nous devons nous spécialiser.",
        "J'ai choisi la cybersécurité : je suis convaincue que cette filière va énormément se développer. Après mon BUT, je ne sais pas encore — je vais peut-être poursuivre à l'université et faire un master. »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/bac-sti2d",
      },
    },
  },
  {
    id: "bts",
    title: "BTS Électrotechnique",
    blurb: "Mettez vos compétences scientifiques et techniques à profit.",
    seed: "ffie-train-bts",
    alt: "Un technicien d'origine africaine testant un circuit avec un multimètre",
    detail: {
      meta: "BTS · 2 ans · après un bac (pro ou STI2D)",
      body: [
        "Vous souhaitez mettre à profit vos compétences scientifiques et technologiques pour interpréter et exploiter les informations obtenues à partir d'essais, de tests, de simulations et de réalisations, et pour mener des activités de diagnostic et de maintenance ?",
        { heading: "Le BTS Électrotechnique est-il fait pour moi ?" },
        "Vous vous intéressez à l'efficacité énergétique, au développement des énergies renouvelables et à l'environnement numérique.",
        "Vous disposez de compétences en communication technique pour décrire une idée, un principe, une solution (produit, processus, système)…",
        "N'hésitez pas : ce diplôme est fait pour vous !",
        { heading: "L'enseignement et les matières" },
        "Le BTS Électrotechnique se prépare en 2 ans et est accessible à tout titulaire d'un baccalauréat : bac professionnel industriel de l'électrotechnique, bac STI2D… L'accès se fait sur dossier, voire tests et/ou entretien.",
        "Le BTS est un diplôme conçu pour une insertion professionnelle directe ; il se prépare en école ou par l'apprentissage.",
        "Avec un bon dossier ou une mention à l'examen, il est possible de poursuivre en licence professionnelle (électronique, énergie, automatismes…), en licence LMD (électronique, électricité…) ou d'intégrer une école d'ingénieur, éventuellement via une classe préparatoire ATS (post-bac+2). Les matières enseignées sont principalement orientées vers les équipements électriques.",
        "La formation vous permettra d'acquérir de bonnes connaissances dans le domaine de l'équipement électrique. Vous étudierez, utiliserez, installerez et réparerez des équipements électriques en constante évolution sous l'effet des progrès informatiques et électroniques. Adapté au monde d'aujourd'hui, vous serez capable de travailler sur des équipements très spécialisés (hydraulique, optique, pneumatique…).",
        { heading: "Les perspectives professionnelles" },
        "Avec ce diplôme en poche, vous pouvez devenir chef de chantier en installations électriques et diriger la réalisation des travaux d'électricité, notamment dans les bâtiments.",
        "Vous serez l'intermédiaire entre le bureau d'études et les monteurs électriciens. À la fois technicien, gestionnaire et animateur, vous préparez, coordonnez et contrôlez le travail des monteurs sur le chantier, en fonction des habilitations électriques requises.",
        "Vos équipes réalisent les installations électriques des logements, des administrations, des entreprises ou des industries. Vous serez le garant du respect des coûts et des délais prévus.",
        { heading: "Mes atouts pour réussir" },
        {
          list: [
            "Savoir travailler en équipe dans le cadre d'une démarche de conduite de projet ou de chantier.",
            "Être organisé et autonome.",
            "Disposer de compétences en expression écrite et orale, y compris en anglais, pour communiquer et argumenter.",
          ],
        },
        { heading: "Et pour aller plus loin après le BTS" },
        "Bien que ce ne soit pas sa vocation première, il est possible de poursuivre ses études après un BTS — il convient alors d'avoir un bon dossier ou une mention à l'examen.",
        "Les évolutions les plus fréquentes :",
        {
          list: [
            "Licence mention électronique, énergie électrique, automatique",
            "Licence pro mention domotique",
            "Licence pro mention énergie et propulsion",
            "Licence pro mention maintenance des systèmes industriels, de production et d'énergie",
            "Licence pro mention maîtrise de l'énergie, électricité, développement durable",
            "Licence pro mention métiers de l'électricité et de l'énergie",
            "Classe préparatoire ATS ingénierie industrielle",
            "Diplôme d'ingénieur (ESIEE Amiens, ESIEE Paris…)",
          ],
        },
        { heading: "Témoignage — Lucas, 24 ans" },
        "« Après l'obtention de mon BTS Électrotechnique, j'ai tout de suite trouvé un emploi dans une entreprise d'électricité. J'ai suivi et beaucoup appris de mon chef de chantier, qui part dans quelques mois à la retraite : j'espère pouvoir le remplacer !",
        "C'est un travail qui me plaît par ses différentes missions et les nouvelles technologies qui évoluent chantier après chantier ! Je continue à apprendre tous les jours, et puis c'est un véritable travail d'équipe.",
        "Ma fierté ? Passer à côté d'un bâtiment terminé auquel j'ai contribué ! »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/bts-electrotechnique",
      },
    },
  },
  {
    id: "but",
    title: "BUT Génie Électrique",
    blurb: "Attiré par le monde du numérique ? Allez droit au but.",
    seed: "ffie-train-but",
    alt: "Un étudiant d'origine sud-asiatique programmant un système de commande",
    detail: {
      meta: "BUT · 3 ans · après le bac (Bac+3)",
      body: [
        "Vous vous intéressez à la production de l'énergie électrique (centrales, énergies renouvelables), à sa distribution et à son utilisation (moteurs, actionneurs), mais aussi au traitement numérique de l'information et aux systèmes (câblés, programmés) qui le réalisent ?",
        { heading: "Le BUT GEII est-il fait pour moi ?" },
        "Avec ce diplôme, vous serez au cœur des technologies et de l'informatique industrielle qui régissent la vie quotidienne. Des équipements de la maison jusqu'aux moyens de transport, vous serez technicien supérieur immédiatement opérationnel, capable d'analyser un système ou de participer à sa conception.",
        "Avec la maîtrise de la conception assistée par ordinateur et des appareils de mesure, vous pourrez concevoir un système d'acquisition et de traitement de données, ou un système de détection et de transmission de signaux — côté matériel comme côté logiciel.",
        { heading: "Des univers modernes et innovants" },
        "En automatisme, vous pourrez modéliser, définir l'architecture et mettre en œuvre des solutions de transmission de données entre systèmes. Vous monterez et exploiterez des équipements électriques de puissance et leurs systèmes de commande, pour produire de l'énergie ou faire fonctionner des automatismes.",
        "L'électronique, l'électrotechnique et l'informatique industrielle ayant pénétré la plupart des secteurs, vous pouvez être recruté aussi bien en aéronautique que dans l'industrie manufacturière et de transformation, la microélectronique ou la santé… Vous pourrez travailler en études et développement, en production, en maintenance, en assurance qualité ou en services, voire comme technico-commercial.",
        "Vous pourrez aussi occuper des postes de chargé d'essais, responsable d'équipe de fabrication, spécialiste process ou informaticien industriel. En microélectronique, vous serez le plus souvent rattaché à une activité de conception-production.",
        { heading: "L'enseignement et les matières" },
        "Le BUT (qui a remplacé le DUT) prépare directement à l'insertion professionnelle ; de nombreux diplômés du BUT GEII poursuivent toutefois leurs études.",
        "Le cursus comprend des enseignements généraux et scientifiques et s'étend sur 1 800 h de formation. Professionnalisant, il prévoit au minimum 10 semaines de stage. Il peut aussi se suivre en alternance.",
        "En deuxième année, les étudiants choisissent une spécialisation :",
        {
          list: [
            "production et gestion des énergies électriques et renouvelables,",
            "informatique et électronique,",
            "automatismes, systèmes et réseaux industriels.",
          ],
        },
        "On y retrouve notamment : outils logiciels, automatisme, réseaux, électronique, systèmes d'information, énergie, connaissance de l'entreprise, anglais, mathématiques et communication.",
        { heading: "Les perspectives professionnelles" },
        "Le BUT GEII permet l'entrée dans la vie active comme technicien supérieur (Bac+2) dans des domaines traditionnels — électricité, électronique, télécommunications… — mais aussi dans des secteurs à forts enjeux : aéronautique, santé, transports, agroalimentaire, TIC (techniques d'information et de communication)…",
        "Les titulaires peuvent exercer comme responsable d'équipe, développeur en bureau d'études, responsable de production, adjoint d'ingénieur, agent de maîtrise et d'encadrement ou technico-commercial.",
        { heading: "Mes atouts pour réussir" },
        {
          list: [
            "Savoir travailler en équipe dans le cadre d'une démarche de conduite de projet ou de chantier.",
            "Être organisé et autonome.",
            "Disposer de compétences en expression écrite et orale, y compris en anglais, pour communiquer et argumenter.",
          ],
        },
        { heading: "Et pour aller plus loin après le BUT GEII" },
        {
          list: [
            "Licence mention électronique, énergie électrique, automatique",
            "Licence mention sciences pour l'ingénieur",
            "Licence pro mention maintenance et technologie : contrôle industriel",
            "Licence pro mention maintenance et technologie : systèmes pluritechniques",
            "Licence pro mention métiers de l'électricité et de l'énergie",
            "Licence pro mention métiers de l'industrie : conception et amélioration de processus et procédés industriels",
          ],
        },
        { heading: "Témoignage — Émilie, 23 ans" },
        "« Après mon bac STI2D, j'ai choisi de m'orienter vers un BUT GEII. Pour moi, c'était l'idéal, car je ne savais pas encore ce que je souhaitais véritablement faire après le bac.",
        "Cet enseignement technologique m'a permis de réaliser de vrais projets : c'est à partir de là que je me suis passionnée pour la technique !",
        "L'enseignement de qualité m'a donné envie de poursuivre vers une licence pro pour me spécialiser dans la programmation et les télécommunications. Mon objectif : décrocher une mention, obtenir une place en licence d'électronique et d'automatisme, et peut-être intégrer une école d'ingénieurs…",
        "Ce secteur est passionnant, et les gens que je côtoie le sont aussi : je ne regrette rien ! »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/but-bachelor-universitaire-technologique-genie-electrique-et-informatique-industrielle",
      },
    },
  },
  {
    id: "domotique",
    title: "Licence Pro — Domotique",
    blurb: "Vous aimez piloter les objets à distance ? Cliquez ici.",
    seed: "ffie-train-domotique",
    alt: "Une femme utilisant une application de maison connectée pour piloter un bâtiment",
    detail: {
      meta: "Licence pro · Bac+3 · après un BTS ou un BUT",
      body: [
        "Le diplôme national de licence professionnelle est de niveau Bac+3 ; il se prépare en lycée, en IUT ou à l'université.",
        { heading: "La licence pro domotique est-elle faite pour moi ?" },
        "Réformée fin 2019, sa durée varie selon le niveau d'entrée : bac, BTS ou BUT.",
        "Cette licence est faite pour vous si vous aimez piloter les objets à distance et si vous êtes passionné par l'énergie « intelligente », celle qui rend notre environnement plus écologique et plus confortable.",
        "Avec ce diplôme, vous apprendrez à faire fonctionner une pompe à chaleur à distance via internet (en programmant sa mise en route et son extinction), à piloter l'éclairage à la voix, ou encore à déclencher des alarmes en fonction d'événements indésirables…",
        "Le domoticien installe des systèmes intelligents : il contrôle et programme de façon automatique et à distance les objets connectés de l'habitat.",
        { heading: "Des univers modernes et innovants" },
        "Les spécialistes sont peu nombreux, et donc très recherchés : les débouchés devraient se développer massivement dans les années à venir.",
        "De la domotique pour le logement à l'immotique pour les bureaux, cette spécialité s'invite partout où sont présents les objets connectés. Vous aurez largement le choix pour exercer votre activité.",
        { heading: "Les perspectives professionnelles" },
        "Avec cette licence pro, plus de 90 % des diplômés sont rapidement en activité ; 10 % choisissent de poursuivre leur formation.",
        "Si vous choisissez de travailler après l'obtention du diplôme, vous aurez un emploi stable et pourrez rapidement accéder au niveau de technicien supérieur, voire cadre.",
        "Vous pourrez également poursuivre vos études, en faisant une autre licence pro ou en vous dirigeant vers un master.",
        { heading: "Mes atouts pour réussir" },
        "Être organisé et autonome : les témoignages concordent sur un rythme de travail soutenu, avec beaucoup de travail personnel.",
        "Disposer de compétences en expression écrite et orale, y compris en anglais (pour lire les notices), ainsi que de qualités de vendeur et d'animateur.",
        { heading: "Et pour aller plus loin après la licence pro" },
        {
          list: [
            "Master mention électronique, énergie électrique, automatique",
            "Master mention énergétique, thermique",
          ],
        },
        { heading: "Témoignage — Agathe, 22 ans" },
        "« Après mon BTS Fluides, énergies, domotique — option C « domotique et bâtiments communicants » —, j'ai voulu me perfectionner dans le domaine de la domotique en préparant une licence pro dans cette spécialité.",
        "En un an, j'ai beaucoup travaillé et j'ai obtenu mon diplôme. J'ai rapidement trouvé un emploi en région parisienne, dans un bureau d'études, en tant que domoticienne.",
        "Je découvre que le bâtiment intelligent est sans limite, et cela me passionne. Améliorer le confort de vie des habitants tout en prenant soin de la planète : peu de métiers offrent aujourd'hui ces deux facettes !",
        "Et demain, ce sont encore plus d'univers qui vont se développer, comme la maintenance et la réparation d'objets connectés. »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/licence-pro-mention-domotique",
      },
    },
  },
  {
    id: "energy-licence",
    title: "Licence Pro — Électricité & énergie",
    blurb: "Vous avez une vision innovante de l'électricité ? Ce diplôme vous attend.",
    seed: "ffie-train-energy",
    alt: "Une femme ingénieure inspectant une installation solaire en toiture",
    detail: {
      meta: "Licence pro · Bac+3 · après un BTS ou un BUT",
      body: [
        "Le diplôme national de licence professionnelle est de niveau Bac+3 ; il se prépare en lycée, en IUT ou à l'université.",
        { heading: "Cette licence pro est-elle faite pour moi ?" },
        "L'entrée se fait avec un BTS (électronique, domotique, etc.) ou un BUT génie électrique. Elle peut se préparer en alternance.",
        "Cette licence est faite pour vous si vous vous intéressez à la gestion des courants forts (distribution d'énergie) comme des courants faibles (distribution de données), si vous avez une vision innovante de l'électricité et si la combinaison de l'électricité et du digital vous passionne.",
        "Avec ce diplôme, vous serez compétent pour présenter les données techniques et réglementaires sur les courants forts et faibles (sécurité incendie, télécom, réseau informatique, automatisme du bâtiment, gestion technique centralisée…) et pour organiser et gérer économiquement une opération.",
        "Vous serez en mesure de proposer et de répondre à des appels d'offres en fonction des besoins du maître d'ouvrage, et vous serez le garant des études techniques et de leur suivi vis-à-vis du client.",
        { heading: "Un diplôme prometteur en bureau d'études" },
        "Les spécialistes sont peu nombreux, et donc très recherchés : les débouchés devraient se développer massivement dans les années à venir. Vous aurez rapidement le management de plusieurs personnes.",
        { heading: "Les perspectives professionnelles" },
        "Avec cette licence pro, 100 % des diplômés sont rapidement en activité (dans les 3 mois).",
        "Certains choisissent de poursuivre leurs études pour décrocher un diplôme d'ingénieur.",
        { heading: "Mes atouts pour réussir" },
        {
          list: [
            "Être capable de concevoir ou de lire des schémas.",
            "Savoir réaliser une note de calcul.",
            "Contrôler les installations électriques en phases de conception et d'exécution des travaux.",
            "Réaliser des diagnostics électriques d'ouvrages et d'équipements.",
            "Apporter son sens du service au client et développer son relationnel.",
            "Assurer une veille réglementaire.",
            "Savoir manager une équipe de 3 à 5 personnes.",
          ],
        },
        { heading: "Témoignage — Antoine, 24 ans" },
        "« Après mon BTS électronique, je souhaitais me perfectionner et me spécialiser, tout en combinant les courants forts et les courants faibles.",
        "La licence pro métiers de l'électricité et de l'énergie a répondu à mes attentes : elle a fait de moi un électrotechnicien.",
        "Je suis devenu un spécialiste des applications de l'électricité : je conçois, j'analyse, j'installe et je m'occupe de la maintenance des équipements électriques.",
        "Aujourd'hui, je travaille dans l'automatisation des équipements industriels ; demain, je serai peut-être dans le secteur tertiaire ou résidentiel — les projets ne manquent pas ! »",
      ],
      link: {
        label: "Voir la fiche sur ffie.fr",
        url: "https://www.ffie.fr/les-metiers-de-lelectricite/metiers-et-formations/licence-pro-metiers-de-lelectricite-et-de-lenergie",
      },
    },
  },
];

