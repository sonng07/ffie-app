// LockTag — member-only indicator: a lock glyph + "Adhérents" label. Mirrors
// the FFIE site's "Contenu réservé aux adhérents" badge. Shown only to viewers
// who can't access member content (guests), per the News/Library convention.
//
// Icon + word (never colour alone, P4) so the lock reads for everyone. Shared
// by News cards and the Library list so both look identical.

import React from "react";
import { Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";

export function LockTag({
  themeName,
  small = false,
  label = "Adhérents",
}: {
  themeName: ThemeName;
  small?: boolean;
  label?: string;
}) {
  const t = themes[themeName];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
      <Lock size={small ? 11 : 12} color={t.text.muted} />
      <Text
        style={{
          fontSize: small ? 10 : 11,
          color: t.text.muted,
          fontFamily: ralewayFamily("500"),
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
