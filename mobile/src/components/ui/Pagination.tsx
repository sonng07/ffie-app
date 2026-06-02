// Pagination — bottom-of-list page indicator with prev/next arrows, a centred
// window of page numbers, and dotted gaps where pages are skipped. Extracted
// from the News feed so every paged list (News, Library) shares one look and
// one behaviour — the same reason FilterControls was extracted from Library.
//
// Tapping a number or an arrow calls back with the target page; the component
// is controlled (the caller owns `page` and re-renders the list).

import React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";
import { GUTTER } from "@/components/ui/ios";

// Build the page-indicator tokens: always the first and last page, a 3-wide
// window centred on the current page (shifted inward at the edges so it stays
// 3 numbers), and "gap" markers (unique strings, for React keys) wherever a
// run of pages is skipped. Returns e.g. [1,"gap-1",6,7,8,"gap-8",130] for page 7.
export function buildPageTokens(page: number, total: number): (number | string)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  let start = page - 1;
  let end = page + 1;
  if (start < 1) {
    start = 1;
    end = 3;
  }
  if (end > total) {
    end = total;
    start = total - 2;
  }

  const set = new Set<number>([1, total]);
  for (let p = start; p <= end; p++) set.add(p);

  const sorted = [...set].sort((a, b) => a - b);
  const tokens: (number | string)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) tokens.push(`gap-${prev}`);
    tokens.push(p);
    prev = p;
  }
  return tokens;
}

export function Pagination({
  themeName,
  page,
  totalPages,
  onPrev,
  onNext,
  onJump,
}: {
  themeName: ThemeName;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (p: number) => void;
}) {
  const t = themes[themeName];
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  // Tokens to render: the first page, a 3-wide window centred on the current
  // page (shifted inward at the edges), the last page, and dotted gaps where
  // numbers are skipped. e.g. page 7 → 1 … 6 7 8 … 130; page 1 → 1 2 3 … 130.
  // String tokens are gap markers (kept unique per position for React keys).
  const tokens = buildPageTokens(page, totalPages);

  const Arrow = ({
    dir,
    disabled,
    onPress,
  }: {
    dir: "left" | "right";
    disabled: boolean;
    onPress: () => void;
  }) => {
    const Icon = dir === "left" ? ChevronLeft : ChevronRight;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir === "left" ? "Page précédente" : "Page suivante"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={6}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: t.border.default,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed && !disabled ? t.border.subtle : "transparent",
          opacity: disabled ? 0.35 : 1,
        })}
      >
        <Icon size={20} color={disabled ? t.text.muted : t.brand.accent} />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        columnGap: 14,
        marginTop: 28,
        paddingHorizontal: GUTTER,
      }}
    >
      <Arrow dir="left" disabled={atStart} onPress={onPrev} />

      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
        {tokens.map((tok) => {
          if (typeof tok === "string") {
            // Dotted gap (ellipsis) where a run of pages is skipped.
            return (
              <Text
                key={tok}
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{
                  color: t.text.muted,
                  fontSize: 16,
                  paddingHorizontal: 2,
                  letterSpacing: 1,
                }}
              >
                …
              </Text>
            );
          }
          const active = tok === page;
          return (
            <Pressable
              key={tok}
              accessibilityRole="button"
              accessibilityLabel={`Page ${tok}`}
              accessibilityState={{ selected: active }}
              onPress={() => onJump(tok)}
              hitSlop={4}
              style={({ pressed }) => ({
                minWidth: 30,
                height: 30,
                borderRadius: 15,
                paddingHorizontal: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active
                  ? t.brand.accent
                  : pressed
                    ? t.border.subtle
                    : "transparent",
              })}
            >
              <Text
                style={{
                  color: active ? "#FFFFFF" : t.text.muted,
                  fontSize: 14,
                  fontFamily: ralewayFamily("600"),
                  fontWeight: "600",
                }}
              >
                {tok}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Arrow dir="right" disabled={atEnd} onPress={onNext} />
    </View>
  );
}
