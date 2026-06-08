// Mock news content — mirrors the structure the FFIE backend will serve
// (Epic 2, News feed). In production these come from the CMS / back-office.
//
// `memberOnly` articles appear in the public feed as locked teasers: a guest
// who taps one is sent to the membership upsell rather than the reader. This
// is the only place the public/member boundary shows up inside News, and it
// doubles as a conversion surface (DESIGN_PRINCIPLES: news is "the bait").
//
// Copy is realistic but deliberately free of fabricated precise statistics —
// real figures come from FFIE.

export type NewsCategory = "Technical" | "Training" | "Communication" | "Economical";

// A body block is either a plain paragraph (string) or a "rich line" — an
// array of segments that can be bold or styled as a link. This lets a few
// articles mirror the FFIE site's formatting (bold date lead-ins, link words)
// while the rest stay simple strings.
export type RichSegment = { text: string; bold?: boolean; link?: boolean; url?: string };
export type BodyBlock = string | RichSegment[];

// A document attached to an article (NEWS-02: "the detailed view can display
// text, images, AND associated documents"). These are the real FFIE files an
// article references — surfaced as a first-class "Documents associés" list in
// the reader, not just buried as inline body links. `kind` only drives the row
// icon; everything opens in the in-app browser for now (download lands with
// FFIE-DOC-03).
export type ArticleAttachment = { label: string; url: string; kind?: "pdf" | "doc" };

export type Article = {
  id: number;
  category: NewsCategory;
  title: string;
  excerpt: string;
  body: BodyBlock[]; // paragraphs (string) or rich lines (segment arrays)
  // Sortable publish date, ISO yyyy-mm-dd (the shape the backend will send).
  // This is the source of truth for feed order; `date` is its display form.
  isoDate: string;
  date: string; // display string (Europe/Paris), derived from isoDate
  readMinutes: number;
  memberOnly: boolean;
  imageUrl?: string; // real FFIE CMS image; falls back to a placeholder if absent
  attachments?: ArticleAttachment[]; // documents the article links to (NEWS-02)
};

// Content mirrors the live FFIE actualités articles, pulled from each
// article's detail page (titles/dates in French, bodies as supplied by FFIE —
// a mix of FR/EN). Article #1 is the featured/hero item, the rest fill the
// 2-column grid. The first body block of each article is the "lead" line,
// rendered larger in the reader.
//
// Categories are NOT exposed on the FFIE detail pages, so they're best-guess
// mappings to our 4-tag taxonomy (Économique → Economical, Formation →
// Training, federation/event news → Communication).
const ARTICLES_RAW: Article[] = [
  {
    id: 1,
    category: "Communication",
    title: "Rencontres régionales FFIE 2026, demandez le programme !",
    excerpt: "4 nouvelles Rencontres régionales sont prévues...",
    body: [
      "4 nouvelles Rencontres régionales sont prévues...",
      [
        { text: "Le 05 mai à Miribel", bold: true },
        { text: " - Centre logistique REXEL" },
      ],
      [
        { text: "Le 04 juin à Toulouse", bold: true },
        { text: " - FFB 31 - Rencontre régionale OCCITANIE | " },
        { text: "INSCRIPTION", link: true, url: "https://forms.office.com/e/M33WgFrPzK" },
      ],
      [
        { text: "Le 05 novembre à Besançon", bold: true },
        { text: " - FFB 25 - Rencontre régionale BOURGOGNE FRANCHE-COMTÉ" },
      ],
      [
        { text: "Le 03 décembre à Port-Marly", bold: true },
        { text: " - FFB Île-de-France - Rencontre régionale ÎLE-DE-FRANCE" },
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
      "Vous êtes en région Occitanie ? Ne manquez pas la prochaine Rencontre FFIE le 04 juin à partir de 09h30 !",
      "Un programme conçu pour les entreprises d'intégration électrique de la région :",
      "• Les courants faibles dans les bâtiments connectés\n• Les interventions de Citel, Schneider Electric, Sonepar et Milwaukee\n• La présentation des outils mis à votre disposition par la FFIE",
      "Le tout en présence du Président de la FFIE, Pascal Toggenburger, et du délégué régional, Bertrand Desplats. Un cocktail déjeunatoire sera servi à l'issue de la rencontre.",
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
    title: "La FFIE retenue dans l'Équipe de France de l'Électrification",
    excerpt: "Une Équipe de France pour l'électrification...",
    body: [
      "Une Équipe de France pour l'électrification...",
      "La FIEEC a pris l'initiative de réunir tous les acteurs de la filière électrique sous l'égide de l'équipe de France de l'Electrification. Dans ce cadre, l'ensemble des acteurs de la filière électrique : producteurs de tous types d'énergies, gestionnaires de réseaux, fournisseurs d'électricité, opérateurs de stockage et de flexibilité des consommations, industriels, distributeurs professionnels, intégrateurs-électriciens, plombiers-chauffagistes, et plus généralement toutes entreprises et TPE artisanales du bâtiment et installateurs des technologies électriques, sont unis et mobilisés pour constituer une Équipe de France de l'Électrification déterminée à agir rapidement dans les territoires pour parvenir aux objectifs fixés par les pouvoirs publics.",
      "Ce collectif, constitué de fleurons et de PME de l'industrie, de l'installation et de la distribution professionnelle, ainsi que du tissu de centaines de milliers d'entreprises et d'artisans du bâtiment qualifiés maillant l'ensemble du territoire français, que la bataille de l'électrification sera gagnée.",
      "Une tribune a été rédigée et a été signée à l'Elysée en présence d'Emmanuel Macron, Président de la République. La FFIE a souhaité que la FFB s'engage à ses côtés dans cette aventure et c'est donc tout naturellement qu'il est revenu à la FFB de représenter la FFIE en signant la tribune.",
      "Prochaine étape pour la filière électrique, travailler sur des propositions concrètes et efficaces pour la présidentielle de 2027.",
      [
        {
          text: "Téléchargez la tribune du 26 mai",
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
    // The tribune referenced inline above, surfaced as an attached document.
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
    title: "Participez au Printemps de l'IA des PME Île-de-France",
    excerpt: "Testez l'IA pour votre activité...",
    body: [
      "Testez l'IA pour votre activité...",
      "La FFIE vous propose de participer au Printemps de l'IA des PME organisé par OMNES Education en partenariat avec BFM Business et Onepoint : le 16 juin 10h à 16h30, à Paris 15ème.",
      "L'opportunité de tester des outils IA adaptés à votre business, en une journée, expérimentez des automatisations simples et repartez avec 2–3 cas d'usage immédiatement actionnables.",
      "Conçus sur la forme d'ateliers de mentorat inversé, animés par des étudiants amplifiés par l'IA, c'est également une occasion d'identifier de jeunes talents prêts à renforcer vos équipes (stages, alternance).",
      "Ces ateliers seront animés par les étudiants des écoles ECE, Sub de Pub et INSEEC.",
      [
        { text: "Places limitées – réservez votre participation dès maintenant via ce lien " },
        {
          text: "Outils IA & PME : Quoi ? Pourquoi ? Comment ?",
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
      "Représentée par Jean-Claude Guillot et Philippe Rifaux, la FFIE était présente à l'Assemblée générale de Promotelec qui s'est tenue le 27 mai.",
      [
        {
          text: "Cette AG s'inscrit dans une dynamique sectorielle inédite : le Plan d'électrification des usages, présenté en avril et pour lequel la FFIE a formulé 8 propositions (",
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
          text: "En complément et aux côtés de Promotelec, la FFIE est également engagée dans la promotion de l'électricité et de la sécurité électrique (",
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
    // The two FFIE documents referenced inline above, as attached documents.
    attachments: [
      {
        label: "Plan d'électrification des usages",
        url: "https://www.ffie.fr/les-documents-de-la-ffie/detail?tx_ffiedoc_document%5Baction%5D=show&tx_ffiedoc_document%5Bcontroller%5D=Document&tx_ffiedoc_document%5Bdocument%5D=1484&cHash=597a013aa0fd74421cbbc0d4543c3359",
        kind: "doc",
      },
      {
        label: "Fiche — la sécurité électrique",
        url: "https://www.ffie.fr/les-documents-de-la-ffie/detail?tx_ffiedoc_document%5Baction%5D=show&tx_ffiedoc_document%5Bcontroller%5D=Document&tx_ffiedoc_document%5Bdocument%5D=1471&cHash=3eea20b0f9b6af15a86243538583bd7e",
        kind: "doc",
      },
    ],
  },
  {
    id: 6,
    category: "Economical",
    title: "Enquête économique de la FFIE",
    excerpt: "Prenez 5 minutes pour répondre au questionnaire !",
    body: [
      "Prenez 5 minutes pour répondre au questionnaire !",
      "Nous avons besoin de vous pour alimenter le baromètre économique de la FFIE, mis en place depuis janvier 2026.",
      "Nous préparons la mise à jour des données collectées pour le 2e trimestre et l'enquête auprès des adhérents est essentielle pour disposer des tendances du marché.",
      "Sans votre participation massive à ce questionnaire, le baromètre ne reflétera pas la réalité du terrain.",
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
      "L'indice BT 47 de mars vient d'être publié au Journal officiel. Il s'établit à 132,5, en hausse de 0,4 point par rapport au mois dernier (132,1). Sur 12 mois glissants, la hausse se confirme avec + 3,75 %.",
      "L'indice cuivre confirme sa stabilisation après une très forte hausse ces derniers mois. Pour le mois de mars, il s'établit à 190,4 et enregistre une 2e baisse consécutive depuis février. Toutefois, sur 12 mois glissants, il progresse fortement de plus de 20 %.",
      "Les évolutions de ces 2 indices seront précisées dans le baromètre économique de la FFIE pour le 2e trimestre.",
      "Retrouvez l'évolution des indicateurs BT47 et cuivre :",
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
    excerpt: "Rencontre régionale, inscrivez-vous !",
    body: [
      "Rencontre régionale, inscrivez-vous !",
      "La prochaine rencontre régionale FFIE aura lieu à Toulouse le 04 juin.",
      "Au programme, à partir de 09h30 :",
      "• Accueil par le Président de la FFIE, Pascal Toggenburger, et le délégué régional, Bertrand Desplats\n• Interventions de nos partenaires Citel et Schneider Electric\n• Les courants faibles dans les bâtiments connectés par Adel Guediri, ingénieur FFIE\n• Interventions de nos partenaires Milwaukee et Sonepar\n• Actualités, services et outils de la FFIE.",
      "À l'issue de cette matinée, les participants se retrouveront autour d'un cocktail déjeunatoire pour poursuivre les échanges.",
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
    excerpt: "TST BT : l'actualité en direct !",
    body: [
      "TST BT : l'actualité en direct !",
      "Formapelec vous invite à participer à son webinaire consacré aux nouveautés 2026 et au nouveau cursus TST BT",
      "Formapelec organise son dernier webinaire avant l'été le mardi 9 juin de 10h00 à 11h30.",
      "Au programme :",
      "✔ Les évolutions de la formation\n✔ Le nouveau cursus TST BT\n✔ Des échanges avec nos experts",
      [
        { text: "Pour vous inscrire : " },
        {
          text: "WEBINAIRE du 09 juin de 10H00 à 11H30",
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

// Feed order is strictly reverse-chronological — NEWS-01's "content is displayed
// chronologically". Sorting on isoDate (yyyy-mm-dd sorts lexicographically =
// chronologically) means the hero is always the most recent article, never a
// hand-picked entry. The sort is stable in Hermes/V8, so same-day articles keep
// their source order. Consumers (hero = ARTICLES[0], grid = slice(1), and the
// reader's prev/next neighbours) all inherit this order automatically.
export const ARTICLES: Article[] = [...ARTICLES_RAW].sort((a, b) =>
  b.isoDate.localeCompare(a.isoDate),
);
