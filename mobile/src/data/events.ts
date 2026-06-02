// Events feed data (Événements tab). Mirrors the FFIE web "Événements" page:
// FFIE's regional meetings ("rencontres régionales"), each a date + a region.
//
// Data-driven per the repo convention — to change what the Events tab shows,
// edit this file, not the screen. Dates are ISO (yyyy-mm-dd, local) so the
// weekly calendar can match them by day without timezone drift; the UI formats
// them for display.
//
// No fabricated detail: the per-event fields (city, schedule, registration)
// come straight from FFIE's published event pages. Only the Occitanie event has
// a live page so far — the other two carry just what the list shows (date +
// title) and their detail screen renders a "details coming" placeholder until
// FFIE publishes them.

export type FfieEvent = {
  id: number;
  /** ISO date, yyyy-mm-dd (local civil date — no time component). */
  date: string;
  title: string;
  /** Host city — shown as the location tag on the detail screen. */
  city?: string;
  /** Time / agenda line, verbatim from FFIE (e.g. opening hours + cocktail). */
  schedule?: string;
  /** External registration form (opened in the in-app browser). */
  registrationUrl?: string;
  /** The full event page on ffie.fr (opened in the in-app browser). */
  detailsUrl?: string;
  /**
   * Reserved for members only. Guests see the row greyed out with a lock and
   * are sent to the membership upsell on tap (mirrors member-only News
   * articles); members see it unlocked. All current events are member-only.
   */
  memberOnly?: boolean;
};

// Listed chronologically (soonest first) — the natural order for upcoming
// events. Source: FFIE événements page (rencontres régionales).
export const EVENTS: FfieEvent[] = [
  {
    id: 1,
    date: "2026-06-04",
    title: "Rencontre régionale Occitanie",
    city: "Toulouse",
    schedule: "De 09h30 à 12h30, suivie d'un cocktail déjeunatoire.",
    registrationUrl: "https://forms.office.com/e/M33WgFrPzK",
    detailsUrl:
      "https://www.ffie.fr/actualites-et-evenements/evenements/detail/actualite/rencontre-regionale-occitanie",
    memberOnly: true,
  },
  { id: 2, date: "2026-11-05", title: "Rencontre régionale Bourgogne-Franche-Comté", memberOnly: true },
  { id: 3, date: "2026-12-03", title: "Rencontre régionale Île-de-France", memberOnly: true },
];
