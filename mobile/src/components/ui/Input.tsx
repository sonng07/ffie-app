// FFIE Input — slim React Native port for onboarding.
// Mirrors the contract of project/design-system/components/Input.md at v0.1:
//   - Real <label> via accessibilityLabel + visible Text above the field
//   - 48pt height (P1 floor), 16pt body font (P4 — prevents iOS focus-zoom)
//   - Focus ring: 2pt border in theme.border.focus (no offset on RN —
//     RN doesn't have outline-offset; the focused border is the indicator)
//   - error + helperText support, aria-invalid via accessibilityState
//   - secureTextEntry for password
//
// Deferred until needed: trailing icon (clear / eye toggle), search variant,
// multiline, prefix slot. Add when a screen demands them.

import React, { useState } from "react";
import {
  TextInput,
  type TextInputProps,
  View,
  Text,
  Platform,
} from "react-native";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily } from "@/theme/fonts";

export type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "decimal";
  themeName?: ThemeName;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  testID?: string;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  error,
  required,
  type = "text",
  themeName = "light",
  autoFocus,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  testID,
}: InputProps) {
  const t = themes[themeName];
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);

  // Type → keyboard + behavior mapping. "decimal" surfaces the number pad with
  // the locale separator (FR users type "0,85") — the consumer parses it.
  const keyboardType: TextInputProps["keyboardType"] =
    type === "email" ? "email-address" : type === "decimal" ? "decimal-pad" : "default";
  const secureTextEntry = type === "password";

  // Border color precedence: error > focus > strong default.
  const borderColor = invalid
    ? t.feedback.danger
    : focused
      ? t.border.focus
      : t.border.strong;
  const borderWidth = focused || invalid ? 2 : 1;

  return (
    <View style={{ width: "100%" }}>
      {/* Label */}
      <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: primitives.space[1] }}>
        <Text
          style={{
            color: t.text.body,
            fontSize: 13,
            fontFamily: ralewayFamily("600"), fontWeight: "600",
            letterSpacing: -0.05,
          }}
        >
          {label}
        </Text>
        {required ? (
          <Text style={{ color: t.feedback.danger, marginLeft: 4, fontSize: 13, fontFamily: ralewayFamily("600"), fontWeight: "600" }}>*</Text>
        ) : null}
      </View>

      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.text.placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? (type === "text" ? "sentences" : "none")}
        autoCorrect={type === "text"}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        accessibilityHint={helperText}
        accessibilityState={{ disabled: false }}
        // RN doesn't have aria-invalid — accessibilityValue closest analogue.
        aria-invalid={invalid}
        style={{
          height: 48, // P1 floor
          borderRadius: primitives.radii.md,
          borderWidth,
          borderColor,
          backgroundColor: themeName === "dark" ? t.surface.raised : t.surface.default,
          color: t.text.body,
          fontSize: 16, // P4 floor; also prevents iOS focus-zoom
          paddingHorizontal: primitives.space[3],
          ...Platform.select({
            ios: { paddingVertical: 0 }, // iOS adds intrinsic padding; we own height
            android: { paddingVertical: 8 },
          }),
        }}
      />

      {error ? (
        <Text
          accessibilityRole="alert"
          style={{
            color: t.feedback.danger,
            fontSize: 12,
            marginTop: primitives.space[1],
            fontFamily: ralewayFamily("500"), fontWeight: "500",
          }}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={{
            color: t.text.muted,
            fontSize: 12,
            marginTop: primitives.space[1],
          }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
