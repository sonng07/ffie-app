// WeekCalendar — a one-week-tall calendar strip for the Events tab. Shows the
// seven days of a week (Mon–Sun, French) with the month/year above; the user
// swipes left/right or taps the chevrons to move to the previous/next week.
//
// Infinite weeks via the classic three-page trick: the horizontal pager always
// holds [prev, current, next] and stays parked on the middle page. A swipe
// settles on a side page, we shift the week by ±1 and snap back to centre
// (un-animated) — so the content under the finger is continuous and you can
// page forever without a giant list. Chevron taps just change the week in
// place (no scroll), which keeps them instant and reduced-motion-safe.
//
// Days that have an event get a dot; today gets an accent ring; the selected
// day gets a filled accent disc. Selection is internal (defaults to today) and
// surfaced via onSelectDate for callers that want to react to it.

import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { MonthYearPickerModal } from "@/components/ui/MonthYearPickerModal";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// French week + month names. Week starts Monday (ISO / France).
const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// --- date helpers (local civil dates, no timezone math) --------------------
function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date): Date {
  const x = midnight(d);
  const monIndex = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - monIndex);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WeekCalendar({
  themeName = "light",
  eventDates,
  onSelectDate,
}: {
  themeName?: ThemeName;
  /** Set of ISO dates (yyyy-mm-dd) that should show an event dot. */
  eventDates: Set<string>;
  onSelectDate?: (iso: string) => void;
}) {
  const t = themes[themeName];

  // "Today" and the initial selection, computed once so they stay stable.
  const [todayIso] = useState(() => isoDate(new Date()));
  const [selected, setSelected] = useState(todayIso);

  // Which week is centred, relative to the week containing today.
  const [weekOffset, setWeekOffset] = useState(0);

  // Pager geometry: we can only position the three pages once we know the
  // strip's width, so the pager renders after the first layout pass.
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const didCentre = useRef(false);

  useEffect(() => {
    if (width > 0 && !didCentre.current) {
      scrollRef.current?.scrollTo({ x: width, animated: false });
      didCentre.current = true;
    }
  }, [width]);

  const baseMonday = startOfWeek(new Date());

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  };

  // A swipe that settles on a side page shifts the week and re-centres so the
  // pager can keep going forever.
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== 1) {
      setWeekOffset((o) => o + (page - 1));
      scrollRef.current?.scrollTo({ x: width, animated: false });
    }
  };

  const select = (iso: string) => {
    setSelected(iso);
    onSelectDate?.(iso);
  };

  // System month/year picker (tapping the header label opens it).
  const [pickerOpen, setPickerOpen] = useState(false);

  // Jump to the week containing a picked date, and select that day. weekOffset
  // is measured in whole weeks from today's week; round() absorbs any DST hour.
  const jumpToDate = (date: Date) => {
    const target = startOfWeek(date);
    const offset = Math.round((target.getTime() - startOfWeek(new Date()).getTime()) / WEEK_MS);
    setWeekOffset(offset);
    select(isoDate(date));
    setPickerOpen(false);
  };

  // Header label: the dominant month of the centred week (its Thursday).
  const centreMonday = addDays(baseMonday, weekOffset * 7);
  const labelDate = addDays(centreMonday, 3);
  const headerLabel = `${capitalize(MONTHS[labelDate.getMonth()])} ${labelDate.getFullYear()}`;
  // The picker opens on the displayed month (first of it).
  const pickerValue = new Date(labelDate.getFullYear(), labelDate.getMonth(), 1);

  return (
    <View>
      {/* Month + week navigation */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <WeekArrow
          dir="left"
          color={t.brand.accent}
          onPress={() => setWeekOffset((o) => o - 1)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${headerLabel}. Choisir le mois et l'année`}
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            columnGap: 4,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text
            accessibilityRole="header"
            style={{
              color: t.text.body,
              fontSize: 16,
              fontFamily: ralewayFamily("700"),
              fontWeight: "700",
              letterSpacing: -0.2,
            }}
          >
            {headerLabel}
          </Text>
          <ChevronDown size={16} color={t.brand.accent} />
        </Pressable>
        <WeekArrow
          dir="right"
          color={t.brand.accent}
          onPress={() => setWeekOffset((o) => o + 1)}
        />
      </View>

      {/* Swipeable week pager — three pages parked on the middle one. */}
      <View onLayout={handleLayout}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
            contentOffset={{ x: width, y: 0 }}
            // The three pages are interchangeable; React keys by offset would
            // remount on every shift, so we key by relative slot instead.
          >
            {[-1, 0, 1].map((slot) => (
              <WeekRow
                key={slot}
                width={width}
                monday={addDays(baseMonday, (weekOffset + slot) * 7)}
                themeName={themeName}
                todayIso={todayIso}
                selected={selected}
                eventDates={eventDates}
                onSelect={select}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <MonthYearPickerModal
        visible={pickerOpen}
        value={pickerValue}
        themeName={themeName}
        onConfirm={jumpToDate}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

// One week of seven day cells, sized to exactly one pager page.
function WeekRow({
  width,
  monday,
  themeName,
  todayIso,
  selected,
  eventDates,
  onSelect,
}: {
  width: number;
  monday: Date;
  themeName: ThemeName;
  todayIso: string;
  selected: string;
  eventDates: Set<string>;
  onSelect: (iso: string) => void;
}) {
  const t = themes[themeName];

  return (
    <View style={{ width, flexDirection: "row" }}>
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i);
        const iso = isoDate(day);
        const isSelected = iso === selected;
        const isToday = iso === todayIso;
        const hasEvent = eventDates.has(iso);

        return (
          <Pressable
            key={iso}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${WEEKDAYS[i]} ${day.getDate()}${hasEvent ? ", événement" : ""}`}
            onPress={() => onSelect(iso)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 2 }}
          >
            <Text
              style={{
                color: t.text.muted,
                fontSize: 11,
                fontFamily: ralewayFamily("600"),
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              {WEEKDAYS[i]}
            </Text>

            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSelected ? t.brand.accent : "transparent",
                borderWidth: !isSelected && isToday ? 1.5 : 0,
                borderColor: t.brand.accent,
              }}
            >
              <Text
                style={{
                  color: isSelected
                    ? "#FFFFFF"
                    : isToday
                      ? t.brand.accent
                      : t.text.body,
                  fontSize: 15,
                  fontFamily: ralewayFamily(isSelected || isToday ? "700" : "500"),
                  fontWeight: isSelected || isToday ? "700" : "500",
                }}
              >
                {day.getDate()}
              </Text>
            </View>

            {/* Event indicator — colour + position (never colour alone, P4: it
                also sits below the number, paired with the row's logo list). */}
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                marginTop: 5,
                backgroundColor: hasEvent ? t.brand.accent : "transparent",
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function WeekArrow({
  dir,
  color,
  onPress,
}: {
  dir: "left" | "right";
  color: string;
  onPress: () => void;
}) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dir === "left" ? "Semaine précédente" : "Semaine suivante"}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon size={22} color={color} />
    </Pressable>
  );
}
