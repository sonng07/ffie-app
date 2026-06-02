// Content for the Vidéos segment of the Trades tab — a clone of the FFIE
// "Vidéos" page (ffie.fr/les-metiers-de-lelectricite/videos): an intro, four
// themed video categories, and the federation's YouTube channel.
//
// Each category links to its FFIE video page, where the YouTube films play; we
// open it in the native in-app browser (page sheet), like the Partners links.
// The known YouTube IDs are recorded too — they're the hook for a future
// native in-app player (FFIE-VIDEO-01, captions required) without re-scraping.
//
// IMAGES are FFIE's real page assets (full ffie.fr URLs). `alt` is the contract
// each image must meet; the seed is a placeholder fallback if a URL 404s.

// One film within a category. `title`/`description` come from the FFIE video
// page; they're filled in per-film as we build each category's screen. A film
// without them still plays — it just shows no caption text.
export type VideoItem = {
  youtubeId: string;
  title?: string;
  description?: string;
};

export type VideoCategory = {
  id: string;
  title: string;
  /** Real FFIE thumbnail (full URL); falls back to the seeded placeholder. */
  imageUrl: string;
  seed: string;
  /** The FFIE video page for this theme (used for Share + as a fallback). */
  url: string;
  /** The films in this category, in page order. */
  videos: VideoItem[];
  alt: string;
};

// A film's YouTube watch URL (opened in the in-app browser to play) and its
// thumbnail (hqdefault always exists for a valid id).
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

export const VIDEOS_INTRO =
  "Découvrez les métiers de l'électricité ! Les métiers de la filière en images ; consultez aussi notre chaîne YouTube pour tout voir.";

export const YOUTUBE_CHANNEL_URL =
  "https://www.youtube.com/channel/UCtGdYMwterw35bjXRXm2zXw";

const VIDEO_BASE = "https://www.ffie.fr/les-metiers-de-lelectricite/videos";
const IMG_BASE = "https://www.ffie.fr/fileadmin/user_upload";

export const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    id: "ai",
    title: "L'intelligence artificielle",
    imageUrl: `${IMG_BASE}/csm_Ai2310_c9c4d19e56.png`,
    seed: "ffie-video-ai",
    url: `${VIDEO_BASE}/lintelligence-artificielle`,
    alt: "Visuel abstrait évoquant l'intelligence artificielle dans l'électricité",
    videos: [
      {
        youtubeId: "4jQJT9gOluo",
        title: "L'intelligence artificielle au service des professionnels de l'électricité",
        description:
          "Un motion design réalisé à l'occasion des Rencontres FFIE 2020 : une introduction à l'IA pour signifier l'importance de sa présence au quotidien et l'évolution inéluctable des métiers de la filière électricité.",
      },
    ],
  },
  {
    id: "smart-city",
    title: "La smart city",
    imageUrl: `${IMG_BASE}/AdobeStock_181088041.jpeg`,
    seed: "ffie-video-smartcity",
    url: `${VIDEO_BASE}/la-smart-city`,
    alt: "Vue d'une ville connectée la nuit, parcourue de lignes lumineuses",
    videos: [
      {
        youtubeId: "0AD84IGyGaM",
        title: "La Smart City, une réalité à portée des installateurs électriciens.",
      },
    ],
  },
  {
    id: "poe",
    title: "Le PoE (Power over Ethernet)",
    imageUrl: `${IMG_BASE}/AdobeStock_73920809.jpeg`,
    seed: "ffie-video-poe",
    url: `${VIDEO_BASE}/poe-power-over-ethernet`,
    alt: "Câbles et connecteurs réseau Ethernet alimentant des équipements",
    videos: [
      {
        youtubeId: "cU5UACxCd5o",
        title: "Power over Ethernet, et si ça changeait votre quotidien ?",
      },
    ],
  },
  {
    id: "temoignages",
    title: "Les témoignages",
    imageUrl: `${IMG_BASE}/AdobeStock_372453660_Preview.jpeg`,
    seed: "ffie-video-temoignages",
    url: `${VIDEO_BASE}/les-temoignages`,
    alt: "Portraits de professionnels de l'électricité partageant leur parcours",
    videos: [
      { youtubeId: "zKP5j27P1Ng", title: "Témoignage salarié Calasys — Florian Saliou" },
      { youtubeId: "hyo0hi0OWbc", title: "Témoignage apprenti CESI — Youssef Bendouche" },
      { youtubeId: "Hk0Ah__hoig", title: "Témoignage apprenti CFA Delépine — Bamba Losseny" },
      { youtubeId: "kaURqyLrpno", title: "Témoignage chef d'entreprise — Pascal Texereau" },
      { youtubeId: "D3bFUpwXo4U", title: "Témoignage jeune salarié Calasys — Travis Lombert" },
      { youtubeId: "R63mJWdWAv0", title: "Témoignage apprentie CESI — Naurine Crevel" },
      { youtubeId: "LSCm4FSDPk0", title: "Témoignage chef d'entreprise — Alexis Delepoulle" },
      {
        youtubeId: "u3vNh911ExM",
        title:
          "Micro-trottoir : que pensent les étudiants de leur avenir dans les métiers de l'électricité ?",
      },
    ],
  },
];
