// Contenu d'actualités factice — reproduit la structure que servira le backend
// FFIE (Epic 2, fil d'actualités). En production, ces données proviennent du
// CMS / back-office.
//
// Les articles `memberOnly` apparaissent dans le fil public comme des teasers
// verrouillés : un visiteur qui appuie dessus est dirigé vers l'incitation à
// l'adhésion plutôt que vers le lecteur. C'est le seul endroit où la frontière
// public/adhérent apparaît dans les Actualités, et elle fait aussi office de
// surface de conversion (DESIGN_PRINCIPLES : l'actualité est « l'appât »).
//
// Le texte est réaliste mais délibérément exempt de statistiques précises
// inventées — les vrais chiffres viennent de la FFIE.

export type NewsCategory = "Technical" | "Training" | "Communication" | "Economical";

// Un bloc de corps est soit un paragraphe simple (string), soit une « ligne
// riche » — un tableau de segments pouvant être en gras ou stylés comme un
// lien. Cela permet à quelques articles de reproduire la mise en forme du site
// FFIE (amorces de date en gras, mots-liens) pendant que les autres restent de
// simples chaînes.
export type RichSegment = { text: string; bold?: boolean; link?: boolean; url?: string };
export type BodyBlock = string | RichSegment[];

// Un document joint à un article (NEWS-02 : « la vue détaillée peut afficher du
// texte, des images ET des documents associés »). Ce sont les vrais fichiers
// FFIE qu'un article référence — mis en avant comme une liste « Documents
// associés » à part entière dans le lecteur, et non enfouis comme de simples
// liens dans le corps. `kind` ne pilote que l'icône de la ligne ; tout s'ouvre
// dans le navigateur in-app pour l'instant (le téléchargement arrive avec
// FFIE-DOC-03).
export type ArticleAttachment = { label: string; url: string; kind?: "pdf" | "doc" };

export type Article = {
  id: number;
  category: NewsCategory;
  title: string;
  excerpt: string;
  body: BodyBlock[]; // paragraphes (string) ou lignes riches (tableaux de segments)
  // Date de publication triable, ISO aaaa-mm-jj (le format que le backend
  // enverra). C'est la source de vérité pour l'ordre du fil ; `date` en est la
  // forme d'affichage.
  isoDate: string;
  date: string; // chaîne d'affichage (Europe/Paris), dérivée de isoDate
  readMinutes: number;
  memberOnly: boolean;
  imageUrl?: string; // vraie image du CMS FFIE ; repli sur un placeholder si absente
  attachments?: ArticleAttachment[]; // documents vers lesquels l'article renvoie (NEWS-02)
};

// Format d'image standard des actualités (FFIE-15) — défini UNE seule fois et
// appliqué partout où un visuel d'article s'affiche : le fil (ArticleCard), le
// rail « Actualités récentes » de l'Accueil (RecentNews) et l'en-tête du lecteur
// (NewsArticleScreen). Recommandation client : 16:9. Comme RemoteImage rend à
// `width` × `aspectRatio`, l'image se met à l'échelle proportionnellement, sans
// recadrage ni déformation, quel que soit l'écran. `NEWS_IMAGE_PIXELS` ne fixe que
// la résolution demandée au placeholder/CMS (le même ratio à plus haute densité).
// Validation côté éditeurs (upload) : à documenter dans le design system.
export const NEWS_IMAGE_ASPECT_RATIO = 16 / 9;
export const NEWS_IMAGE_PIXELS = { width: 1280, height: 720 } as const;

// Le contenu reproduit les articles d'actualité FFIE en ligne, repris de la
// page détail de chaque article (titres/dates en français, corps tels que
// fournis par la FFIE — un mélange FR/EN). L'article n°1 est l'élément vedette /
// hero, les autres remplissent la grille à 2 colonnes. Le premier bloc de corps
// de chaque article est la ligne « chapeau », affichée plus grande dans le
// lecteur.
//
// Les catégories ne sont PAS exposées sur les pages détail FFIE, ce sont donc
// des correspondances au jugé vers notre taxonomie à 4 tags (Economical →
// Economical, Training → Training, actualités fédération/événement →
// Communication).
const ARTICLES_RAW: Article[] = [
  {
    id: 1,
    category: "Communication",
    title: "Rencontres régionales FFIE 2026, demandez le programme !",
    excerpt: "4 nouvelles rencontres régionales sont prévues...",
    body: [
      "4 nouvelles rencontres régionales sont prévues...",
      [
        { text: "Le 5 mai à Miribel", bold: true },
        { text: " - centre logistique REXEL" },
      ],
      [
        { text: "Le 4 juin à Toulouse", bold: true },
        { text: " - FFB 31 - rencontre régionale OCCITANIE | " },
        { text: "INSCRIPTION", link: true, url: "https://forms.office.com/e/M33WgFrPzK" },
      ],
      [
        { text: "Le 5 novembre à Besançon", bold: true },
        { text: " - FFB 25 - rencontre régionale BOURGOGNE FRANCHE-COMTÉ" },
      ],
      [
        { text: "Le 3 décembre à Port-Marly", bold: true },
        { text: " - FFB Île-de-France - rencontre régionale ÎLE-DE-FRANCE" },
      ],
    ],
    isoDate: "2026-01-01",
    date: "01.01.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/Design_sans_titre__8_.jpg",
  },
  {
    id: 2,
    category: "Communication",
    title: "Rencontre régionale FFIE à Toulouse, il est encore temps !",
    excerpt: "Inscrivez-vous à la rencontre régionale Occitanie...",
    body: [
      "Inscrivez-vous à la rencontre régionale Occitanie...",
      "Vous êtes en région Occitanie ? Ne manquez pas la prochaine Rencontre FFIE le 4 juin à partir de 9h30 !",
      "Un programme conçu pour les entreprises d'intégration électrique de la région :",
      "• Les courants faibles dans les bâtiments connectés\n• Présentations de Citel, Schneider Electric, Sonepar et Milwaukee\n• Une présentation des outils que la FFIE met à votre disposition",
      "Le tout en présence du président de la FFIE Pascal Toggenburger et du délégué régional Bertrand Desplats. Un cocktail déjeunatoire sera servi à l'issue de la rencontre.",
      [
        {
          text: "Voir le programme et s'inscrire",
          link: true,
          url: "https://forms.office.com/pages/responsepage.aspx?id=ssnTPbZKGE6zJoaE4m80eR4ATBmRs3xAlpV89FTqU6lUMUEyTUM2NE9NOTlVWEZKRFlNTVFSN1hJMi4u&route=shorturl",
        },
      ],
    ],
    isoDate: "2026-05-29",
    date: "29.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/RR_OCCITANIE_WEB.jpg",
  },
  {
    id: 3,
    category: "Communication",
    title: "La FFIE retenue pour l'Équipe de France de l'Électrification",
    excerpt: "Une équipe de France pour l'électrification...",
    body: [
      "Une équipe de France pour l'électrification...",
      "La FIEEC a pris l'initiative de réunir l'ensemble des acteurs de la filière électrique sous la bannière de l'Équipe de France de l'Électrification. Dans ce cadre, tous les acteurs de la filière électrique — producteurs de tous types d'énergie, gestionnaires de réseaux, fournisseurs d'électricité, opérateurs de stockage et de flexibilité de la demande, fabricants, distributeurs professionnels, intégrateurs électriciens, plombiers-chauffagistes, et plus largement toutes les entreprises du bâtiment et les petites entreprises artisanales et installateurs de technologies électriques — sont unis et mobilisés pour former une Équipe de France de l'Électrification déterminée à agir vite sur tous les territoires afin d'atteindre les objectifs fixés par les pouvoirs publics.",
      "C'est grâce à ce collectif — composé des fleurons de l'industrie et des PME de la fabrication, de l'installation et de la distribution professionnelle, ainsi que du réseau des centaines de milliers d'entreprises du bâtiment et d'artisans qualifiés présents dans toute la France — que la bataille de l'électrification sera gagnée.",
      "Une tribune a été rédigée et signée au palais de l'Élysée en présence d'Emmanuel Macron, président de la République. La FFIE a souhaité que la FFB se tienne à ses côtés dans cette démarche, et c'est donc tout naturellement que la FFB a représenté la FFIE pour la signature de la tribune.",
      "La prochaine étape pour la filière électrique est de travailler à des propositions concrètes et efficaces en vue de l'élection présidentielle de 2027.",
      [
        {
          text: "Télécharger la tribune du 26 mai",
          link: true,
          url: "https://www.ffie.fr/fileadmin/DOCUMENTATION/PACTE_Equipe_de_France_Electrification.pdf",
        },
      ],
    ],
    isoDate: "2026-05-29",
    date: "29.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/ELECTRIFICATION_WEB.png",
    // La tribune référencée plus haut dans le texte, mise en avant comme document joint.
    attachments: [
      {
        label: "Tribune — Équipe de France de l'Électrification (26 mai)",
        url: "https://www.ffie.fr/fileadmin/DOCUMENTATION/PACTE_Equipe_de_France_Electrification.pdf",
        kind: "pdf",
      },
    ],
  },
  {
    id: 4,
    category: "Communication",
    title: "Participez au Printemps de l'IA des PME en Île-de-France",
    excerpt: "Testez l'IA pour votre entreprise...",
    body: [
      "Testez l'IA pour votre entreprise...",
      "La FFIE vous invite à participer au Printemps de l'IA des PME organisé par OMNES Education en partenariat avec BFM Business et Onepoint : le 16 juin de 10h à 16h30, à Paris 15e.",
      "L'occasion de tester des outils d'IA adaptés à votre métier : en une seule journée, expérimentez des automatisations simples et repartez avec 2 à 3 cas d'usage immédiatement actionnables.",
      "Conçus comme des ateliers de mentorat inversé, animés par des étudiants augmentés par l'IA, c'est aussi l'occasion de repérer de jeunes talents prêts à renforcer vos équipes (stages, alternance).",
      "Ces ateliers seront animés par des étudiants des écoles ECE, Sup de Pub et INSEEC.",
      [
        { text: "Places limitées – réservez votre place dès maintenant via ce lien " },
        {
          text: "Outils d'IA & PME : Quoi ? Pourquoi ? Comment ?",
          link: true,
          url: "https://mibc-fr-05.mailinblack.com/securelink/?url=https://docs.google.com&key=eyJsYW5nIjoiRlIiLCJ1cmwiOiJodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kL2UvMUZBSXBRTFNjTUlaejNDbzdaekRjRGZSOVA2TTJMa0ZwXzh2WjNtbmRfY3dNbWZBZVpTeFZhc1Evdmlld2Zvcm0iLCJ0b2tlbiI6ImdBQUFBQUJwLUdnVDBUblhKN2pPQl9JcmhPd0ZtZ21YdXJOSkl5TUMxSlpnQVVXNi03YXdfNzlyUGVDSGh3UWJPWHZ2NEkzRDFCY3M0RkxxSHF1eTRTZGUwd0xTRnBhUnA0U21DUTdzTElJXzRUNm5DX3hjRjllUU5FWVVwemhpWW1wQ3dnSEZxZmg1RUVsQ1l4aGxpX0lXWDFKY29waFhmX2tQN3diWkNlanJkaU1GWVM5WGxJSVhEdGU1Y2RqN3oxMFdqU0h1SkZ4b01RQUFmMnhNNWtMdVBkanhpUGtxTEZCOE9RYkVhSVlSc1ZuVUhPc2hCNF9jSnNnWGk5R1J4TU9jcVZHa2hpTUlFb04xR3BtazRIOU9jMmV2czFnc0dGNlpfVld0Q0ZWZkNjc3ZqVlJYdWVSQzRiYU03UW9iNk1zeV9tZlZPdnhSIn0=",
        },
      ],
    ],
    isoDate: "2026-05-29",
    date: "29.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl:
      "https://www.ffie.fr/fileadmin/user_upload/Printemps_IA_PME_IDF_-_16_juin_2026_WEB.jpg",
  },
  {
    id: 5,
    category: "Communication",
    title: "La FFIE présente à l'assemblée générale de Promotelec",
    excerpt: "La FFIE engagée aux côtés de Promotelec...",
    body: [
      "La FFIE engagée aux côtés de Promotelec...",
      "Représentée par Jean-Claude Guillot et Philippe Rifaux, la FFIE a assisté à l'Assemblée Générale de Promotelec qui s'est tenue le 27 mai.",
      [
        {
          text: "Cette AG s'inscrit dans une dynamique inédite à l'échelle de toute la filière : le Plan pour l'Électrification des Usages, présenté en avril et pour lequel la FFIE a porté 8 propositions (",
        },
        {
          text: "télécharger le plan d'électrification",
          link: true,
          url: "https://www.ffie.fr/les-documents-de-la-ffie/detail?tx_ffiedoc_document%5Baction%5D=show&tx_ffiedoc_document%5Bcontroller%5D=Document&tx_ffiedoc_document%5Bdocument%5D=1484&cHash=597a013aa0fd74421cbbc0d4543c3359",
        },
        { text: ")." },
      ],
      [
        {
          text: "Par ailleurs, et aux côtés de Promotelec, la FFIE est également engagée dans la promotion de l'électricité et de la sécurité électrique (",
        },
        {
          text: "télécharger la fiche sur la sécurité électrique",
          link: true,
          url: "https://www.ffie.fr/les-documents-de-la-ffie/detail?tx_ffiedoc_document%5Baction%5D=show&tx_ffiedoc_document%5Bcontroller%5D=Document&tx_ffiedoc_document%5Bdocument%5D=1471&cHash=3eea20b0f9b6af15a86243538583bd7e",
        },
        { text: ")." },
      ],
    ],
    isoDate: "2026-05-29",
    date: "29.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/ELECTRIFICATION_WEB.png",
    // Les deux documents FFIE référencés plus haut dans le texte, comme documents joints.
    attachments: [
      {
        label: "Plan pour l'Électrification des Usages",
        url: "https://www.ffie.fr/les-documents-de-la-ffie/detail?tx_ffiedoc_document%5Baction%5D=show&tx_ffiedoc_document%5Bcontroller%5D=Document&tx_ffiedoc_document%5Bdocument%5D=1484&cHash=597a013aa0fd74421cbbc0d4543c3359",
        kind: "doc",
      },
      {
        label: "Fiche — sécurité électrique",
        url: "https://www.ffie.fr/les-documents-de-la-ffie/detail?tx_ffiedoc_document%5Baction%5D=show&tx_ffiedoc_document%5Bcontroller%5D=Document&tx_ffiedoc_document%5Bdocument%5D=1471&cHash=3eea20b0f9b6af15a86243538583bd7e",
        kind: "doc",
      },
    ],
  },
  {
    id: 6,
    category: "Economical",
    title: "Enquête économique FFIE",
    excerpt: "Prenez 5 minutes pour répondre au questionnaire !",
    body: [
      "Prenez 5 minutes pour répondre au questionnaire !",
      "Nous avons besoin de vous pour alimenter le baromètre économique de la FFIE, en place depuis janvier 2026.",
      "Nous préparons la mise à jour des données collectées pour le 2e trimestre, et l'enquête auprès des adhérents est essentielle pour saisir les tendances du marché.",
      "Sans votre forte participation à ce questionnaire, le baromètre ne reflétera pas la réalité du terrain.",
      "Nous comptons sur vous !",
      "Répondez via le lien ci-dessous",
      [
        {
          text: "GRANDE ENQUÊTE FFIE 2026 Participez au baromètre économique ! (2) – Remplir le formulaire",
          link: true,
          url: "https://forms.office.com/e/zpy1zNx3HF",
        },
      ],
    ],
    isoDate: "2026-05-22",
    date: "22.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/BAROMETRE.web.jpg",
  },
  {
    id: 7,
    category: "Economical",
    title: "Indices BT47 et cuivre : nouvelles tendances",
    excerpt: "Suivi des indicateurs : indice BT 47 et indice cuivre",
    body: [
      "Suivi des indicateurs : indice BT 47 et indice cuivre",
      "L'indice BT 47 de mars vient de paraître au Journal officiel. Il s'établit à 132,5, en hausse de 0,4 point par rapport au mois dernier (132,1). Sur les 12 derniers mois, la hausse se confirme à +3,75 %.",
      "L'indice cuivre confirme sa stabilisation après une très forte hausse ces derniers mois. Pour le mois de mars, il s'établit à 190,4 et enregistre une 2e baisse consécutive depuis février. Toutefois, sur les 12 derniers mois, il progresse fortement de plus de 20 %.",
      "Les tendances de ces 2 indices seront détaillées dans le baromètre économique de la FFIE du 2e trimestre.",
      "Suivez l'évolution des indicateurs BT47 et cuivre :",
      [
        {
          text: "https://www.insee.fr/fr/statistiques/serie/001710979",
          link: true,
          url: "https://www.insee.fr/fr/statistiques/serie/001710979",
        },
      ],
      [
        {
          text: "https://www.insee.fr/fr/statistiques/serie/010002094",
          link: true,
          url: "https://www.insee.fr/fr/statistiques/serie/010002094",
        },
      ],
    ],
    isoDate: "2026-05-22",
    date: "22.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/BT47_web.jpg",
  },
  {
    id: 8,
    category: "Communication",
    title: "Direction Toulouse avec la FFIE !",
    excerpt: "Rencontre régionale, inscrivez-vous dès maintenant !",
    body: [
      "Rencontre régionale, inscrivez-vous dès maintenant !",
      "La prochaine rencontre régionale FFIE aura lieu à Toulouse le 4 juin.",
      "Au programme, à partir de 9h30 :",
      "• Accueil par le président de la FFIE Pascal Toggenburger et le délégué régional Bertrand Desplats\n• Présentations de nos partenaires Citel et Schneider Electric\n• Les courants faibles dans les bâtiments connectés par Adel Guediri, ingénieur FFIE\n• Présentations de nos partenaires Milwaukee et Sonepar\n• Actualités, services et outils de la FFIE.",
      "À l'issue de la matinée, les participants se retrouveront autour d'un cocktail déjeunatoire pour poursuivre les échanges.",
      "Voir le programme :",
      [
        { text: "Pour vous inscrire à cette matinée gratuite : " },
        {
          text: "Rencontre régionale FFIE OCCITANIE – Remplir le formulaire",
          link: true,
          url: "https://forms.office.com/e/M33WgFrPzK",
        },
      ],
    ],
    isoDate: "2026-05-22",
    date: "22.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/RR_OCCITANIE_WEB.jpg",
  },
  {
    id: 9,
    category: "Training",
    title: "Participez au prochain webinaire Formapelec !",
    excerpt: "Travaux sous tension basse tension (TST BT) : les dernières nouveautés !",
    body: [
      "Travaux sous tension basse tension (TST BT) : les dernières nouveautés !",
      "Formapelec vous invite à participer à son webinaire dédié aux mises à jour 2026 et au nouveau cursus de formation TST BT",
      "Formapelec tient son dernier webinaire avant l'été le mardi 9 juin de 10h00 à 11h30.",
      "Au programme :",
      "✔ Mises à jour de la formation\n✔ Le nouveau cursus de formation TST BT\n✔ Échanges avec nos experts",
      [
        { text: "Pour vous inscrire : " },
        {
          text: "WEBINAIRE le 9 juin de 10h00 à 11h30",
          link: true,
          url: "https://mibc-fr-05.mailinblack.com/securelink/?url=https://docs.google.com&key=eyJsYW5nIjoiRlIiLCJ1cmwiOiJodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kL2UvMUZBSXBRTFNlQms0eGp5andjU0h5WklJWi0wWFJ1eEIyVUppYm9zZENWZlI1LXNudmstZmdkd1Evdmlld2Zvcm0_cGxpPTEiLCJ0b2tlbiI6ImdBQUFBQUJxREFlSmQwaGE5anJQWVVfYVBqbkFlUTFkbFRVRzZjbjhUbEx4b0R5cEhLd1pZU1I5WlNPY3Z3UVBSVjhMY3BmN1NRYUdadVJvWG9VZ0NBSU1PcF9sWk5VLUZ1bHRaeldCX3ZUXzNES204TTJKUDlXYnRPYklUcWYtWEhuQm54QVRZbVhTRlkyanNrWWNoOGZHU0JxaV9pb3p5OHByZzJMNmpLVEZvdllkNlV2MWxyN1pWMl9JMlYzS1ZBNm1ZSnhkNXdEdTVwVlhaVW9uV3VveC1lM2pDYnBuSlJzYkxqMVlyWXhQalZyWTVHWVZQNUhjaWVaMjQ3VmNaRTVxbDZIU1Y3WFo5dU90SnVtZG5lSGFwelpWcTZkZlpRTkdPdmFCVjVVUFl2LTlURDU1UmpidWxqcU5xVU5sT213Y0xQMlJqZ0EzIn0=",
        },
      ],
    ],
    isoDate: "2026-05-22",
    date: "22.05.2026",
    readMinutes: 3,
    memberOnly: false,
    imageUrl: "https://www.ffie.fr/fileadmin/user_upload/Nouveau_Cursus_TST_BT_WEB.png",
  },
];

// L'ordre du fil est strictement anté-chronologique — le « contenu est affiché
// de façon chronologique » de NEWS-01. Trier sur isoDate (aaaa-mm-jj se trie
// lexicographiquement = chronologiquement) signifie que le hero est toujours
// l'article le plus récent, jamais une entrée choisie à la main. Le tri est
// stable dans Hermes/V8, donc les articles d'un même jour conservent leur ordre
// source. Les consommateurs (hero = ARTICLES[0], grille = slice(1), et les
// voisins précédent/suivant du lecteur) héritent tous automatiquement de cet ordre.
export const ARTICLES: Article[] = [...ARTICLES_RAW].sort((a, b) =>
  b.isoDate.localeCompare(a.isoDate),
);
