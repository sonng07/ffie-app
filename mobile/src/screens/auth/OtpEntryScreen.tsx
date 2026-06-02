// OTP / Enter-code entry — full-screen replacement for the v1 bottom sheet.
//
// Uses the iOS / Android system numeric keyboard rather than an in-app
// keypad: a 1×1 off-screen TextInput captures all input, the OtpDots
// component renders the current state, and tapping the dots refocuses
// the input so a user who dismisses the keyboard can bring it back.
//
// `textContentType="oneTimeCode"` opts in to iOS SMS autofill — when a
// verification SMS arrives the system suggests the code above the keyboard.
//
// Wrapping into a Modal (slide-up animation) is the caller's job.

import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { themes } from "@tokens";
import { OtpDots } from "@/components/ui/OtpDots";
import { auth } from "@/screens/auth/tokens";
import { ralewayFamily } from "@/theme/fonts";

const t = themes.light;
const CODE_LENGTH = 6;

export function OtpEntryScreen({
  email,
  onBack,
  onSubmit,
  onResend,
}: {
  email: string;
  onBack: () => void;
  onSubmit: (code: string) => void;
  onResend: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    if (code.length === CODE_LENGTH && !submittedRef.current) {
      submittedRef.current = true;
      onSubmit(code);
    }
  }, [code, onSubmit]);

  // Sanitize whatever the keyboard / autofill drops in: strip non-digits
  // (including the iOS auto-inserted space after autofill) and cap length.
  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length < CODE_LENGTH) submittedRef.current = false;
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
      {/* Tapping any empty space claims the touch and dismisses the keyboard.
          Inner controls (back chip, dots, resend) win the responder
          negotiation for taps on themselves, so they keep working — and
          tapping the dots re-focuses the hidden input, bringing it back. */}
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
          <Text style={styles.title}>Saisissez le code</Text>
          <Text style={styles.subtitle}>Code envoyé à {email}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Code de vérification, ${code.length} chiffres sur ${CODE_LENGTH} saisis. Appuyez deux fois pour modifier.`}
          onPress={focusInput}
          style={styles.dotsWrap}
        >
          <OtpDots value={code} length={CODE_LENGTH} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Renvoyer le code"
          onPress={onResend}
          hitSlop={8}
          style={({ pressed }) => [styles.resend, pressed && styles.resendPressed]}
        >
          <Text style={styles.resendLabel}>Renvoyer le code</Text>
        </Pressable>

        {/* Off-screen TextInput that owns the keyboard. Positioned far above
            the visible viewport so it stays focus-able and accessible but
            never renders pixels of its own. */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          inputMode="numeric"
          autoFocus
          maxLength={CODE_LENGTH}
          caretHidden
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          style={styles.hiddenInput}
          accessibilityLabel="Code de vérification"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  back: {
    height: 44,
    marginHorizontal: 24,
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
    marginBottom: 32,
    paddingHorizontal: 24,
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
  dotsWrap: {
    alignItems: "center",
  },
  resend: {
    marginTop: auth.otp.resendMarginTop,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resendPressed: { opacity: 0.6 },
  resendLabel: {
    fontSize: 14,
    color: "#5B6577",
    fontFamily: ralewayFamily("500"), fontWeight: "500",
  },
  hiddenInput: {
    position: "absolute",
    top: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
