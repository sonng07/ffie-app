// Content for the Trades tab — "Discover the professions" (WBS Epic 4 /
// FFIE-TRADES-01). A PUBLIC, no-login section (P6). Scoped STRICTLY to the WBS
// acceptance criteria:
//   1. a section for discovering careers in the electrical industry exists;
//   2. it features CAREER PROFILES  ← the required core (below);
//   3. it MAY ALSO include educational content + presentation videos
//      ← the training paths and the real FFIE testimonial films below.
//
// Deliberately NOT included (beyond the WBS / would be fabricated real-world
// data per CLAUDE.md): salary figures, invented named testimonials. Authentic
// practitioner voices come from FFIE's own presentation videos instead.
//
// Job descriptions are MOCK editorial writing about real electrical trades.
// Imagery is PLACEHOLDER — electrical-field photos via LoremFlickr keywords
// (the `tradeImage` helper below), so the stand-ins look like the trade rather
// than random stock. Production swaps them for real FFIE photos, and each
// `imageAlt` is the contract the real photo must meet (P7 representation:
// women, people of colour, a range of ages and contexts).

export type Profession = {
  id: string;
  /** The job title — the "career profile" the WBS requires. */
  role: string;
  /** Specialization area, shown as a chip. */
  domain: string;
  /** One-line hook. */
  tagline: string;
  /** Electrical-field placeholder keywords (LoremFlickr) + a stable lock so the
   *  image doesn't change on reload. */
  imageKeywords: string;
  imageLock: number;
  imageAlt: string;
  /** 2–3 sentence intro to the job. */
  summary: string;
  /** "What you'd do" — concrete day-to-day activities. */
  dayInLife: string[];
  /** Skill chips. */
  skills: string[];
  /** How you'd train into it (real French qualifications). */
  pathIn: string;
};

export const PROFESSIONS_INTRO =
  "Electricity isn't one job — it's a whole field. From wiring a home to installing the chargers a city runs on, here are the people who make it work, what their days actually look like, and how you'd get there. No account needed.";

// The film that leads the section (the WBS's "presentation videos"; a real FFIE
// video — see data/videos.ts).
export const HERO_VIDEO_ID = "4jQJT9gOluo";

// Electrical-field placeholder imagery. LoremFlickr returns a real Flickr photo
// matching the keywords (so placeholders look like the trade, not random
// stock); `lock` keeps each image stable across reloads. PLACEHOLDER only —
// production swaps these for real FFIE photography.
export const tradeImage = (keywords: string, lock: number, w = 640, h = 480) =>
  `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}?lock=${lock}`;

// The hero image above the role list.
export const HERO_IMAGE_KEYWORDS = "electrician,electrical";
export const HERO_IMAGE_LOCK = 7;

export const PROFESSIONS: Profession[] = [
  {
    id: "building-electrician",
    role: "Building electrician",
    domain: "Buildings & housing",
    tagline: "Bring power and light to the places people live and work.",
    imageKeywords: "electrician,wiring",
    imageLock: 11,
    imageAlt: "A young woman electrician fitting a consumer unit on a building site",
    summary:
      "The trade most people picture — and the foundation of every other one here. You take a building from bare walls to a working, certified installation, then hand it over to the people who'll rely on it every day.",
    dayInLife: [
      "Read the plans and mark out where cables, points and panels go",
      "Run and connect the circuits — lighting, sockets, heating, the consumer unit",
      "Test the installation and bring it up to NF C 15-100",
      "Walk the client through it and sign off the handover",
    ],
    skills: ["Wiring & circuits", "NF C 15-100", "Reading plans", "Electrical safety", "Client handover"],
    pathIn:
      "A CAP Électricien (2 yrs) puts you on site fast; a Bac Pro MELEC (3 yrs) opens more responsibility sooner.",
  },
  {
    id: "integrator",
    role: "Electrical integrator",
    domain: "Systems integration",
    tagline: "Tie lighting, heating, security and networks into one system that simply works.",
    imageKeywords: "electrical,panel",
    imageLock: 12,
    imageAlt: "An integrator configuring a building-automation control panel",
    summary:
      "The signature trade of FFIE's members. You don't just install — you make a building's systems talk to each other, so one rule or one tap controls light, climate, access and energy together.",
    dayInLife: [
      "Survey a building's systems and scope how they should work as one",
      "Design the integration — the buses, controllers and logic behind the scenes",
      "Coordinate with the other trades on site",
      "Commission, test and fine-tune until the building runs itself",
    ],
    skills: ["Systems design", "KNX / automation", "Coordination", "Commissioning", "Standards & safety"],
    pathIn:
      "Bac Pro MELEC then a BTS Électrotechnique is the classic route — integration rewards people who keep learning.",
  },
  {
    id: "smart-building",
    role: "Smart-building technician",
    domain: "Connected buildings",
    tagline: "Make buildings think — light, climate and security that respond on their own.",
    imageKeywords: "electrician,installation",
    imageLock: 13,
    imageAlt: "A technician programming a smart-building controller from a tablet",
    summary:
      "You turn ordinary rooms into spaces that sense and react: lights that follow people, heating that learns the week, alerts that reach a phone. Part electrician, part programmer.",
    dayInLife: [
      "Fit sensors, controllers and connected devices",
      "Program the scenarios — 'away', 'evening', 'alarm'",
      "Connect it all to the building's network and the owner's phone",
      "Test every path and teach the client how to use it",
    ],
    skills: ["KNX / automation", "Sensors & actuators", "Scenario logic", "Networking", "Troubleshooting"],
    pathIn:
      "Bac Pro MELEC with a taste for IT, or a BTS — automation is where electrics meets code.",
  },
  {
    id: "ev-charging",
    role: "EV-charging installer",
    domain: "Energy transition",
    tagline: "Build the charging network the country's electric cars run on.",
    imageKeywords: "electric,charging,station",
    imageLock: 14,
    imageAlt: "A technician installing an EV charge point in a car park",
    summary:
      "Every electric car needs somewhere to charge — homes, car parks, motorways. You install and connect the points, and make sure the building's power can actually handle them.",
    dayInLife: [
      "Assess a site's power and where the chargers can go",
      "Install the charge points and their protection",
      "Set up load management so the grid connection copes",
      "Test, certify and commission each point",
    ],
    skills: ["IRVE qualification", "Load management", "Power & protection", "Testing", "Energy metering"],
    pathIn:
      "Start as an electrician, then add the IRVE qualification — demand is outrunning the people trained for it.",
  },
  {
    id: "solar-pv",
    role: "Photovoltaic technician",
    domain: "Energy transition",
    tagline: "Turn rooftops into power stations.",
    imageKeywords: "solar,panel",
    imageLock: 15,
    imageAlt: "A young woman installing solar panels on a roof",
    summary:
      "You put the panels up, wire them in, and connect them to the building or the grid — so a roof that used to do nothing now generates real power.",
    dayInLife: [
      "Size the array for the roof and the demand",
      "Mount the panels safely and run the DC wiring",
      "Fit the inverters and protection",
      "Connect to the grid and verify the output",
    ],
    skills: ["PV sizing", "Inverters", "Work-at-height safety", "Grid connection", "Metering"],
    pathIn:
      "An electrical CAP or Bac Pro plus PV-specific training — the energy transition is the fastest-growing corner of the trade.",
  },
  {
    id: "networks",
    role: "Networks & low-voltage technician",
    domain: "Communication networks",
    tagline: "Wire the data, fibre and security a modern site depends on.",
    imageKeywords: "cable,network",
    imageLock: 16,
    imageAlt: "A technician terminating fibre-optic cabling in a comms cabinet",
    summary:
      "Beyond power, every building runs on low-voltage systems — data, fibre, cameras, access control. You install the nervous system the rest of the building talks over.",
    dayInLife: [
      "Pull the structured cabling and fibre runs",
      "Fit and connect cameras, access control and intercoms",
      "Label, test and certify every link",
      "Document the network for whoever maintains it",
    ],
    skills: ["Structured cabling", "Fibre optics", "CCTV & access control", "Certification", "Documentation"],
    pathIn:
      "Bac Pro MELEC or a low-current specialisation — precise, methodical people thrive here.",
  },
];

// Optional educational content (WBS AC #3 "may also include"): the routes in.
// All real French qualifications (the same ones the existing trades data uses).
export type TrainingPath = { id: string; label: string; level: string; note: string };

export const TRAINING_PATHS: TrainingPath[] = [
  { id: "cap", label: "CAP Électricien", level: "2 yrs · from age 15", note: "The fastest route onto a site." },
  { id: "bac", label: "Bac Pro MELEC", level: "3 yrs", note: "The backbone qualification of the trade." },
  { id: "bts", label: "BTS Électrotechnique", level: "+2 yrs", note: "Toward design, supervision and team lead." },
  { id: "but", label: "BUT Génie Électrique", level: "+3 yrs", note: "Engineering-track integration roles." },
];

// Optional presentation videos (WBS AC #3): real FFIE field testimonials — the
// same youtube IDs and names the Videos section uses (see data/videos.ts), so
// the voices are authentic, not invented.
export type ProfessionVideo = { youtubeId: string; name: string; role: string };

export const PROFESSION_VIDEOS: ProfessionVideo[] = [
  { youtubeId: "zKP5j27P1Ng", name: "Florian Saliou", role: "Calasys employee" },
  { youtubeId: "hyo0hi0OWbc", name: "Youssef Bendouche", role: "CESI apprentice" },
  { youtubeId: "Hk0Ah__hoig", name: "Bamba Losseny", role: "CFA Delépine apprentice" },
  { youtubeId: "D3bFUpwXo4U", name: "Travis Lombert", role: "Young Calasys employee" },
];
