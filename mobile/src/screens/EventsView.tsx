// EventsView — body of the Événements tab: a swipeable weekly calendar up top,
// then the list of FFIE events below it. Rendered inside the News tab's feed
// scroll (it brings its own gutter, not its own ScrollView).
//
// Rows mirror the FFIE web events list: an accent date block + a vertical
// accent rule, the event title, and the FFIE mark. Tapping a row opens its
// detail screen via onOpenEvent.
//
// Member-only events (event.memberOnly) are gated exactly like member-only News
// articles: a guest sees the row greyed out with a lock, and tapping it routes
// to the membership upsell (onOpenLocked) instead of the detail. No event is
// flagged member-only yet — the capability is wired and ready.

import React, { useMemo } from "react";
import { Lock } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { WeekCalendar } from "@/components/ui/WeekCalendar";
import { FFIELogo } from "@/components/ui/FFIELogo";
import { canAccess, useRole } from "@/auth/roleContext";
import { EVENTS, type FfieEvent } from "@/data/events";

// Short French month labels for the date block (matches the web list's compact
// date treatment).
const MONTHS_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function parseIso(iso: string): { day: number; month: number } {
  const [, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return { day: d, month: m - 1 };
}

export function EventsView({
  themeName = "light",
  onOpenEvent,
  onOpenLocked,
}: {
  themeName?: ThemeName;
  onOpenEvent: (id: number) => void;
  /** A guest tapping a member-only event lands here (the membership upsell). */
  onOpenLocked: (id: number) => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const { role } = useRole();
  const canReadMemberContent = canAccess(role, "member-only");

  // Dates that should show a dot on the calendar.
  const eventDates = useMemo(() => new Set(EVENTS.map((e) => e.date)), []);

  return (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
      <WeekCalendar themeName={themeName} eventDates={eventDates} />

      {/* Divider between the calendar and the list. */}
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: t.border.default,
          marginTop: 18,
          marginBottom: 4,
        }}
      />

      {EVENTS.map((event, i) => {
        // Member-only event + a guest → greyed out, tap goes to the upsell.
        const locked = !!event.memberOnly && !canReadMemberContent;
        return (
          <EventRow
            key={event.id}
            event={event}
            themeName={themeName}
            locked={locked}
            showSeparator={i < EVENTS.length - 1}
            separatorColor={c.separator}
            onPress={() => (locked ? onOpenLocked(event.id) : onOpenEvent(event.id))}
          />
        );
      })}
    </View>
  );
}

function EventRow({
  event,
  themeName,
  locked,
  showSeparator,
  separatorColor,
  onPress,
}: {
  event: FfieEvent;
  themeName: ThemeName;
  locked: boolean;
  showSeparator: boolean;
  separatorColor: string;
  onPress: () => void;
}) {
  const t = themes[themeName];
  const { day, month } = parseIso(event.date);

  // Locked = greyed out: the accent (date block + rule) drops to muted, the
  // title dims, and a lock tag appears. Colour is never the only signal — the
  // lock icon + "Adhérents" label carry it too (P4).
  const accentColor = locked ? t.text.muted : t.brand.accent;
  const ruleColor = locked ? t.border.default : t.brand.accent;
  const titleColor = locked ? t.text.muted : t.text.body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, le ${day} ${MONTHS_SHORT[month]}.${
        locked ? " Réservé aux adhérents." : ""
      }`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 18,
        borderBottomWidth: showSeparator ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: separatorColor,
        backgroundColor: pressed ? t.surface.subtle : "transparent",
        opacity: locked ? 0.6 : 1,
      })}
    >
      {/* Date block — day over short month. */}
      <View style={{ width: 52, alignItems: "flex-end" }}>
        <Text
          style={{
            color: accentColor,
            fontSize: 22,
            lineHeight: 24,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.5,
          }}
        >
          {String(day).padStart(2, "0")}
        </Text>
        <Text
          style={{
            color: accentColor,
            fontSize: 11,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
            letterSpacing: 0.3,
            textTransform: "uppercase",
            marginTop: 1,
          }}
        >
          {MONTHS_SHORT[month]}
        </Text>
      </View>

      {/* Vertical rule. */}
      <View
        style={{
          width: 3,
          alignSelf: "stretch",
          minHeight: 40,
          borderRadius: 1.5,
          backgroundColor: ruleColor,
          marginHorizontal: 14,
        }}
      />

      {/* Title + (when locked) a members-only tag. */}
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={{
            color: titleColor,
            fontSize: 16.5,
            lineHeight: 22,
            fontFamily: ralewayFamily("600"),
            fontWeight: "600",
            letterSpacing: -0.2,
          }}
        >
          {event.title}
        </Text>
        {locked ? (
          <View style={{ flexDirection: "row", alignItems: "center", columnGap: 4, marginTop: 5 }}>
            <Lock size={12} color={t.text.muted} />
            <Text
              style={{
                fontSize: 11,
                color: t.text.muted,
                fontFamily: ralewayFamily("500"),
                fontWeight: "500",
              }}
            >
              Adhérents
            </Text>
          </View>
        ) : null}
      </View>

      {/* FFIE mark. */}
      <View style={{ marginLeft: 12 }}>
        <FFIELogo size={42} themeName={themeName} />
      </View>
    </Pressable>
  );
}
