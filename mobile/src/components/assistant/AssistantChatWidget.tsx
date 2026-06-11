// AssistantChatWidget — the floating "Assistant IA FFIE" chat box (Epic: AI
// help). A corner FAB expands into a Claude-branded chat panel: a coral header,
// three mode tabs (Technical / Docs / Writing), a greeting message, an input
// row, and the Anthropic attribution footer.
//
// MOCKUP ONLY (v1). Like SignInFlow and the membership flows, nothing here
// talks to a backend: the tabs toggle local state, the input is editable but
// the send button is a no-op, and the greeting is static copy. Wiring this to a
// real Claude endpoint is deliberately out of scope until instructed.
//
// COLOUR NOTE: this widget is intentionally OUTSIDE the FFIE design system. It
// carries Claude/Anthropic's own brand colours (the coral terracotta + paper
// cream below) because it represents a third-party assistant — the same reason
// partner/brand marks aren't recoloured to the app's navy+teal. Those external
// brand hex values live in the CLAUDE constant here rather than in tokens.ts
// (which is the single source of truth for *FFIE's* palette, not Anthropic's).
// Everything structural (radii, motion, safe-area, reduced-motion) still comes
// from the design system / shared hooks.

import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FileText,
  PenLine,
  Send,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { primitives } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER } from "@/components/ui/ios";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Claude / Anthropic brand palette (external — see COLOUR NOTE above).
// ---------------------------------------------------------------------------
const CLAUDE = {
  // The Claude "coral" terracotta, used for the header gradient, the FAB, and
  // the send button. Two stops give the header its diagonal sheen.
  coral: "#D97757",
  coralDeep: "#BD5D3A",
  coralPressed: "#A94E2F",
  // Anthropic "ivory" paper — the assistant bubble + panel canvas tint.
  paper: "#F4F1EA",
  paperBorder: "#E6E0D4",
  // Near-black ink used for the selected tab pill + primary text.
  ink: "#1F1E1D",
  inkMuted: "#6B6862",
  // Panel surface.
  surface: "#FFFFFF",
  hairline: "#ECE9E2",
  onCoral: "#FFFFFF",
  onCoralMuted: "rgba(255,255,255,0.82)",
} as const;

// Mode tabs across the top of the conversation. Mock-only: selecting one just
// swaps the local highlight (a real build would steer the system prompt).
type ModeKey = "technical" | "docs" | "writing";
const MODES: { key: ModeKey; label: string; icon: LucideIcon }[] = [
  { key: "technical", label: "Technical", icon: Zap },
  { key: "docs", label: "Docs", icon: FileText },
  { key: "writing", label: "Writing", icon: PenLine },
];

// The bottom tab bar's height above the safe-area inset (BottomTabBar:
// minHeight 50 + 12 top + 12 bottom padding ≈ 74). The widget is mounted as a
// full-bleed sibling of the tab bar, so its children are positioned in DEVICE
// coordinates — we add this + the inset by hand to clear the navigation row.
const TAB_BAR_HEIGHT = 74;
// Gap between the tab bar and the FAB.
export const ASSISTANT_FAB_GAP = 16;
// FAB diameter. Exported so the screens' "back to top" buttons match it exactly
// (they stack above this FAB and must read as the same control) — single source
// of truth so the two sizes can't drift apart.
export const ASSISTANT_FAB_SIZE = 50;

export function AssistantChatWidget() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModeKey>("technical");
  const [draft, setDraft] = useState("");

  // Panel enter/exit: fade + a small rise/scale anchored to the FAB corner.
  // Reduced motion collapses both to an instant cut (vestibular safety, P5).
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (reducedMotion) {
        anim.setValue(1);
        return;
      }
      Animated.timing(anim, {
        toValue: 1,
        duration: primitives.motion.duration.base,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      if (reducedMotion) {
        anim.setValue(0);
        setMounted(false);
        return;
      }
      Animated.timing(anim, {
        toValue: 0,
        duration: primitives.motion.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, reducedMotion, anim]);

  // Announce open/close for screen-reader users (the panel is a transient
  // surface, not a routed screen).
  const toggle = (next: boolean) => {
    setOpen(next);
    AccessibilityInfo.announceForAccessibility?.(
      next ? "FFIE assistant opened" : "FFIE assistant closed",
    );
  };

  // Vertical anchoring (device coordinates, measured from the screen bottom):
  //   - FAB sits one gap above the tab bar.
  //   - Panel floats just above the FAB so the corner launcher stays visible.
  const fabBottom = insets.bottom + TAB_BAR_HEIGHT + ASSISTANT_FAB_GAP;
  const panelBottom = fabBottom + ASSISTANT_FAB_SIZE + 10;

  // Panel geometry: full-width minus gutters, capped so it reads as a corner
  // box on tablets; height capped to the room above the FAB (never under the
  // status bar / notch).
  const panelWidth = Math.min(width - GUTTER * 2, 360);
  const panelHeight = Math.min(520, height - panelBottom - insets.top - 16);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    // Full-bleed, non-interactive layer so the FAB + panel float over whatever
    // tab is mounted. pointerEvents="box-none" lets touches pass through the
    // empty area to the screen beneath.
    <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
      {/* Chat panel (only mounted while open / animating out) */}
      {mounted ? (
        <Animated.View
          accessibilityViewIsModal
          style={{
            position: "absolute",
            right: GUTTER,
            bottom: panelBottom,
            width: panelWidth,
            height: panelHeight,
            borderRadius: 20,
            backgroundColor: CLAUDE.surface,
            overflow: "hidden",
            opacity: anim,
            transform: [{ translateY }, { scale }],
            // Elevated card — soft, large shadow to read as a floating sheet.
            shadowColor: "#000",
            shadowOpacity: 0.22,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 24,
            elevation: 12,
            borderWidth: 1,
            borderColor: CLAUDE.hairline,
          }}
        >
          <Header onClose={() => toggle(false)} />
          <ModeTabs mode={mode} onSelect={setMode} />

          {/* Conversation canvas — paper-tinted, with the static greeting. */}
          <View style={{ flex: 1, backgroundColor: CLAUDE.paper, padding: 14 }}>
            <AssistantBubble>
              Hello! Hello! I'm the FFIE's AI assistant. How can I help you? (NF C
              15-100, IRVE, construction site…)
            </AssistantBubble>
          </View>

          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={() => setDraft("")}
          />

          {/* Attribution footer — required while the assistant is Claude-backed. */}
          <View
            style={{
              paddingVertical: 8,
              alignItems: "center",
              backgroundColor: CLAUDE.surface,
              borderTopWidth: 1,
              borderTopColor: CLAUDE.hairline,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: CLAUDE.inkMuted,
                fontFamily: ralewayFamily("500"),
              }}
            >
              Claude · Anthropic — professional use FFIE
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* The corner FAB — toggles the panel. Hidden (behind the panel) visually
          while open, but kept mounted so its press target stays consistent. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Close FFIE assistant" : "Open FFIE assistant"}
        accessibilityState={{ expanded: open }}
        onPress={() => toggle(!open)}
        style={({ pressed }) => ({
          position: "absolute",
          right: GUTTER,
          bottom: fabBottom,
          width: ASSISTANT_FAB_SIZE,
          height: ASSISTANT_FAB_SIZE,
          borderRadius: ASSISTANT_FAB_SIZE / 2,
          backgroundColor: pressed ? CLAUDE.coralPressed : CLAUDE.coral,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: CLAUDE.coralDeep,
          shadowOpacity: 0.4,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
          elevation: 8,
        })}
      >
        {open ? (
          <X size={24} color={CLAUDE.onCoral} strokeWidth={2.4} />
        ) : (
          <Sparkles size={24} color={CLAUDE.onCoral} strokeWidth={2.2} />
        )}
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header — coral gradient bar: sparkle badge, title + Anthropic attribution,
// and the close affordance.
// ---------------------------------------------------------------------------
function Header({ onClose }: { onClose: () => void }) {
  return (
    <LinearGradient
      colors={[CLAUDE.coral, CLAUDE.coralDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 13,
        columnGap: 11,
      }}
    >
      {/* Sparkle badge in a translucent disc. */}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(255,255,255,0.22)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sparkles size={19} color={CLAUDE.onCoral} strokeWidth={2.2} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: CLAUDE.onCoral,
            fontSize: 16,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
        >
          Assistant IA FFIE
        </Text>
        <Text
          style={{
            color: CLAUDE.onCoralMuted,
            fontSize: 11.5,
            marginTop: 1,
            fontFamily: ralewayFamily("500"),
          }}
        >
          Powered by Claude · Anthropic
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close assistant"
        onPress={onClose}
        hitSlop={10}
        style={({ pressed }) => ({
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? "rgba(255,255,255,0.22)" : "transparent",
        })}
      >
        <X size={20} color={CLAUDE.onCoral} strokeWidth={2.2} />
      </Pressable>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// ModeTabs — the three assistant modes. Selected = solid ink pill (white icon +
// label); unselected = paper pill with a hairline. State is exposed to
// assistive tech, and the icon backs up the colour change (never colour alone).
// ---------------------------------------------------------------------------
function ModeTabs({
  mode,
  onSelect,
}: {
  mode: ModeKey;
  onSelect: (m: ModeKey) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        columnGap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: CLAUDE.surface,
        borderBottomWidth: 1,
        borderBottomColor: CLAUDE.hairline,
      }}
    >
      {MODES.map((m) => {
        const selected = m.key === mode;
        const Icon = m.icon;
        return (
          <Pressable
            key={m.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={m.label}
            onPress={() => onSelect(m.key)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              columnGap: 5,
              height: 32,
              paddingHorizontal: 11,
              borderRadius: primitives.radii.full,
              backgroundColor: selected
                ? CLAUDE.ink
                : pressed
                  ? CLAUDE.paperBorder
                  : CLAUDE.paper,
              borderWidth: 1,
              borderColor: selected ? CLAUDE.ink : CLAUDE.paperBorder,
            })}
          >
            <Icon
              size={14}
              color={selected ? CLAUDE.onCoral : CLAUDE.inkMuted}
              strokeWidth={2.2}
            />
            <Text
              style={{
                fontSize: 12.5,
                color: selected ? CLAUDE.onCoral : CLAUDE.ink,
                fontFamily: ralewayFamily(selected ? "600" : "500"),
                fontWeight: selected ? "600" : "500",
              }}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// AssistantBubble — a single message from the assistant: paper-on-paper card
// with a subtle border, left-aligned.
// ---------------------------------------------------------------------------
function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        maxWidth: "92%",
        backgroundColor: CLAUDE.surface,
        borderRadius: 14,
        borderTopLeftRadius: 4,
        borderWidth: 1,
        borderColor: CLAUDE.paperBorder,
        paddingHorizontal: 13,
        paddingVertical: 11,
      }}
    >
      <Text
        style={{
          color: CLAUDE.ink,
          fontSize: 14,
          lineHeight: 20,
          fontFamily: ralewayFamily("400"),
        }}
      >
        {children}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Composer — the input row: pill text field + coral send button. Editable for
// realism, but send is a no-op in the mockup (just clears the draft).
// ---------------------------------------------------------------------------
function Composer({
  value,
  onChangeText,
  onSend,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        columnGap: 9,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: CLAUDE.surface,
        borderTopWidth: 1,
        borderTopColor: CLAUDE.hairline,
      }}
    >
      <View
        style={{
          flex: 1,
          height: 42,
          borderRadius: primitives.radii.full,
          backgroundColor: CLAUDE.paper,
          borderWidth: 1,
          borderColor: CLAUDE.paperBorder,
          justifyContent: "center",
          paddingHorizontal: 15,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask your question…"
          placeholderTextColor={CLAUDE.inkMuted}
          returnKeyType="send"
          onSubmitEditing={onSend}
          style={{
            fontSize: 14,
            color: CLAUDE.ink,
            fontFamily: ralewayFamily("400"),
            padding: 0,
          }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        onPress={onSend}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: pressed ? CLAUDE.coralPressed : CLAUDE.coral,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <Send size={19} color={CLAUDE.onCoral} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
