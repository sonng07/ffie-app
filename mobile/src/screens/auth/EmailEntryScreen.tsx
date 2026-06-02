// Email entry — full-screen replacement for the v1 bottom sheet.
//
// Rendered by OnboardingFlow inside a slide-up Modal so the surface looks
// like the Welcome card expanding to fill the screen. The screen itself
// does NOT mount its own Modal — that wrapping is the caller's job —
// which keeps stacking with the OTP screen flat.
//
// Layout (top → bottom):
//   - SafeArea top
//   - "Back" chip in top-left (chevron + label, muted gray)
//   - Title "Continue with email" (22pt / 700)
//   - Subtitle one line
//   - Email TextInput
//   - Flex spacer
//   - Continue button — disabled while the field is empty, FFIE teal
//     when active. Anchored above the bottom safe area, lifts with the
//     keyboard via KeyboardAvoidingView.

import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { themes } from "@tokens";
import { auth } from "@/screens/auth/tokens";
import { ralewayFamily } from "@/theme/fonts";

const t = themes.light;

export function EmailEntryScreen({
  initialEmail,
  onBack,
  onSubmit,
}: {
  initialEmail?: string;
  onBack: () => void;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const trimmed = email.trim();
  const canContinue = trimmed.length > 0;
  const hasValue = email.length > 0;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Tapping any empty space claims the touch and dismisses the
            keyboard. Inner controls (back chip, field, CTA) win the responder
            negotiation for taps on themselves, so they keep working — and
            tapping the field re-focuses it, bringing the keyboard back. */}
        <View
          style={styles.content}
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => Keyboard.dismiss()}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={onBack}
            hitSlop={16}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <ChevronLeft size={20} color={t.text.muted} />
            <Text style={styles.backLabel}>Retour</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Continuer avec votre adresse e-mail</Text>
            <Text style={styles.subtitle}>
              Inscrivez-vous ou connectez-vous avec votre adresse e-mail. Nous vous enverrons un code de vérification.
            </Text>
          </View>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Adresse e-mail"
            placeholderTextColor="#8B94A6"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="go"
            autoFocus
            onSubmitEditing={() => canContinue && onSubmit(trimmed)}
            accessibilityLabel="Adresse e-mail"
            style={[styles.field, hasValue && styles.fieldActive]}
          />

          <View style={styles.flex} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
            accessibilityLabel="Continuer"
            disabled={!canContinue}
            onPress={() => onSubmit(trimmed)}
            style={({ pressed }) => [
              styles.cta,
              canContinue ? styles.ctaActive : styles.ctaDisabled,
              canContinue && pressed && styles.ctaPressed,
            ]}
          >
            <Text
              style={[
                styles.ctaLabel,
                !canContinue && styles.ctaLabelDisabled,
              ]}
            >
              Continuer
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 32,
  },
  back: {
    height: 44,
    alignSelf: "flex-start",
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 4,
  },
  backPressed: { opacity: 0.6 },
  backLabel: {
    color: t.text.muted,
    fontSize: 15,
  },
  header: {
    marginTop: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontFamily: ralewayFamily("700"), fontWeight: "700",
    color: "#0A0E18",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#5B6577",
    lineHeight: 20,
  },
  field: {
    height: auth.field.height,
    borderRadius: auth.field.radius,
    paddingHorizontal: auth.field.paddingX,
    backgroundColor: "#F2F4F8",
    color: "#0A0E18",
    fontSize: auth.field.fontSize,
  },
  fieldActive: {
    backgroundColor: auth.field.selectedBgColor,
    borderWidth: 1.5,
    borderColor: auth.field.selectedBorderColor,
  },
  cta: {
    height: 56,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaActive: { backgroundColor: t.action.primary.bg },
  ctaPressed: { backgroundColor: t.action.primary.bgPressed },
  ctaDisabled: { backgroundColor: "#EEF1F6" },
  ctaLabel: {
    fontSize: 16,
    fontFamily: ralewayFamily("600"), fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
  ctaLabelDisabled: { color: "#8B94A6" },
});
