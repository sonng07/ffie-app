// Calculator sheets (FFIE-CALC-01/02, 🟢 Phase 2, members only) — the working
// tools launched from the Tools hub (ToolsHubView) tiles. The standalone
// "Calculators" segment was removed when calculators merged into the Tools hub;
// this module now provides just the sheets (the file keeps its name for import
// stability).
//
// PowerCalculatorSheet (power ↔ current) and VoltageDropSheet compute live as
// the user types, using the pure helpers in data/calculators.ts. They're framed
// as aids: the footnotes point back to NF C 15-100 for the actual sizing
// decision rather than inventing normative tables (CLAUDE.md: no fabricated
// real-world data). Guests are gated upstream by the Tools hub before a
// calculator opens.

import React, { useMemo, useState } from "react";
import { X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, useGroupedColors } from "@/components/ui/ios";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  DEFAULT_POWER_FACTOR,
  DEFAULT_VOLTAGE,
  VOLTAGE_DROP_LIMIT,
  computePower,
  computeVoltageDrop,
  isValidPowerInput,
  isValidVoltageDropInput,
  parseNumber,
  type CalculatorKind,
  type Conductor,
  type LoadType,
  type Phase,
} from "@/data/calculators";

// ---------------------------------------------------------------------------
// PowerCalculatorSheet — power ↔ current. The result sits at the top so
// it stays visible while the number pad is up; the controls are below it.
// Computes live from the pure helpers; shows a placeholder until the inputs are
// physically valid.
//
// Reduced motion (P5): the sheet snaps in with no slide when the OS setting is
// on, like the other sheets in the app.
//
// Exported so the Tools hub (ToolsHubView) can reuse the same sheet from its
// "Power calculation" tile — one calculator, two entry points.
// ---------------------------------------------------------------------------
export function PowerCalculatorSheet({
  visible,
  themeName,
  onClose,
}: {
  visible: boolean;
  themeName: ThemeName;
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("single");
  const [powerKw, setPowerKw] = useState("");
  const [voltageV, setVoltageV] = useState(String(DEFAULT_VOLTAGE.single));
  const [powerFactor, setPowerFactor] = useState(String(DEFAULT_POWER_FACTOR));

  // Switching phase re-seeds the voltage to that phase's standard LV value.
  const onPhaseChange = (next: Phase) => {
    setPhase(next);
    setVoltageV(String(DEFAULT_VOLTAGE[next]));
  };

  const input = useMemo(
    () => ({
      phase,
      powerKw: parseNumber(powerKw),
      voltageV: parseNumber(voltageV),
      powerFactor: parseNumber(powerFactor),
    }),
    [phase, powerKw, voltageV, powerFactor],
  );

  const valid = isValidPowerInput(input);
  const result = valid ? computePower(input) : null;

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
        {/* Close affordance — top-trailing X (≥44pt touch target). */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={26} color={t.text.body} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: GUTTER }}>
            <Text
              accessibilityRole="header"
              style={{
                color: t.text.body,
                fontSize: 28,
                lineHeight: 34,
                fontFamily: displayFamily("700"),
                fontWeight: "700",
                letterSpacing: -0.6,
              }}
            >
              Power & current
            </Text>
            <Text style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 22, marginTop: 8 }}>
              Line current and apparent power of a load from its
              active power.
            </Text>
          </View>

          {/* Result — kept at the top so it stays visible above the keyboard. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: c.cardBorder ? 1 : 0,
                borderColor: c.cardBorder,
                padding: 18,
              }}
            >
              <ResultCell
                label="Current"
                value={result ? formatFr(result.currentA, 1) : "—"}
                unit="A"
                themeName={themeName}
                emphasis
              />
              <View style={{ width: 1, backgroundColor: t.border.subtle, marginHorizontal: 18 }} />
              <ResultCell
                label="Apparent power"
                value={result ? formatFr(result.apparentKva, 2) : "—"}
                unit="kVA"
                themeName={themeName}
              />
            </View>
            {!valid ? (
              <Text style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 17, marginTop: 8, marginHorizontal: 4 }}>
                Enter a power, a voltage and a power factor
                (between 0 and 1) to get the result.
              </Text>
            ) : null}
          </View>

          {/* Phase — single-phase (230 V) vs three-phase (400 V). */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <FieldLabel label="Phase" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={phase}
              options={[
                { key: "single", label: "Single-phase" },
                { key: "three", label: "Three-phase" },
              ]}
              onChange={onPhaseChange}
            />
          </View>

          {/* Inputs. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20, rowGap: 16 }}>
            <Input
              themeName={themeName}
              type="decimal"
              label="Active power (kW)"
              value={powerKw}
              onChangeText={setPowerKw}
              placeholder="e.g. 7.5"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Voltage (V)"
              value={voltageV}
              onChangeText={setVoltageV}
              helperText={phase === "three" ? "Phase-to-phase voltage" : "Phase-to-neutral voltage"}
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Power factor (cos φ)"
              value={powerFactor}
              onChangeText={setPowerFactor}
              placeholder="e.g. 0.85"
            />
          </View>

          {/* Footnote — the formula in use + the honest scope limit. */}
          <View
            style={{
              marginHorizontal: GUTTER,
              marginTop: 24,
              backgroundColor: c.cardBg,
              borderWidth: c.cardBorder ? 1 : 0,
              borderColor: c.cardBorder,
              borderRadius: primitives.radii.lg,
              padding: 16,
            }}
          >
            <Text style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 19 }}>
              {phase === "three"
                ? "Formula: I = P / (√3 × U × cos φ),  S = P / cos φ."
                : "Formula: I = P / (U × cos φ),  S = P / cos φ."}
              {"\n"}Pre-sizing aid only: the final choice of protection
              and cable cross-section is governed by NF C 15-100.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// VoltageDropSheet — voltage drop. Same shape as the power sheet: result on
// top (ΔU in volts + the relative %), then the controls. Adds a conformity pill
// comparing ΔU/U to the NF C 15-100 limit for the selected usage — the "standards"
// angle of the module.
//
// Exported so the Tools hub (ToolsHubView) can reuse it from its "Falling
// tension" tile (the client's label for chute de tension / voltage drop).
// ---------------------------------------------------------------------------
export function VoltageDropSheet({
  visible,
  themeName,
  onClose,
}: {
  visible: boolean;
  themeName: ThemeName;
  onClose: () => void;
}) {
  const t = themes[themeName];
  const c = useGroupedColors(themeName);
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("single");
  const [conductor, setConductor] = useState<Conductor>("copper");
  const [loadType, setLoadType] = useState<LoadType>("other");
  const [lengthM, setLengthM] = useState("");
  const [sectionMm2, setSectionMm2] = useState("");
  const [currentA, setCurrentA] = useState("");
  const [powerFactor, setPowerFactor] = useState(String(DEFAULT_POWER_FACTOR));
  const [voltageV, setVoltageV] = useState(String(DEFAULT_VOLTAGE.single));

  const onPhaseChange = (next: Phase) => {
    setPhase(next);
    setVoltageV(String(DEFAULT_VOLTAGE[next]));
  };

  const input = useMemo(
    () => ({
      phase,
      conductor,
      lengthM: parseNumber(lengthM),
      sectionMm2: parseNumber(sectionMm2),
      currentA: parseNumber(currentA),
      powerFactor: parseNumber(powerFactor),
      voltageV: parseNumber(voltageV),
    }),
    [phase, conductor, lengthM, sectionMm2, currentA, powerFactor, voltageV],
  );

  const valid = isValidVoltageDropInput(input);
  const result = valid ? computeVoltageDrop(input) : null;
  const limit = VOLTAGE_DROP_LIMIT[loadType];
  const conforme = result ? result.dropPercent <= limit : false;

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.pageBg }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={26} color={t.text.body} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: GUTTER }}>
            <Text
              accessibilityRole="header"
              style={{
                color: t.text.body,
                fontSize: 28,
                lineHeight: 34,
                fontFamily: displayFamily("700"),
                fontWeight: "700",
                letterSpacing: -0.6,
              }}
            >
              Voltage drop
            </Text>
            <Text style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 22, marginTop: 8 }}>
              Voltage drop of a cable run and check of its compliance
              with NF C 15-100.
            </Text>
          </View>

          {/* Result — ΔU and the relative %, with a conformity pill. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
            <View
              style={{
                backgroundColor: c.cardBg,
                borderRadius: primitives.radii.lg,
                borderWidth: c.cardBorder ? 1 : 0,
                borderColor: c.cardBorder,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: "row" }}>
                <ResultCell
                  label="Drop ΔU"
                  value={result ? formatFr(result.dropV, 2) : "—"}
                  unit="V"
                  themeName={themeName}
                />
                <View style={{ width: 1, backgroundColor: t.border.subtle, marginHorizontal: 18 }} />
                <ResultCell
                  label="Relative ΔU/U"
                  value={result ? formatFr(result.dropPercent, 2) : "—"}
                  unit="%"
                  themeName={themeName}
                  emphasis
                />
              </View>

              {result ? (
                <ConformityPill conforme={conforme} limit={limit} themeName={themeName} />
              ) : null}
            </View>
            {!valid ? (
              <Text style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 17, marginTop: 8, marginHorizontal: 4 }}>
                Enter the length, cross-section, operating current and
                power factor to get the result.
              </Text>
            ) : null}
          </View>

          {/* Phase. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <FieldLabel label="Phase" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={phase}
              options={[
                { key: "single", label: "Single-phase" },
                { key: "three", label: "Three-phase" },
              ]}
              onChange={onPhaseChange}
            />
          </View>

          {/* Conductor material. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
            <FieldLabel label="Conductor" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={conductor}
              options={[
                { key: "copper", label: "Copper" },
                { key: "aluminium", label: "Aluminium" },
              ]}
              onChange={setConductor}
            />
          </View>

          {/* Usage — sets the conformity limit (3% lighting / 5% other). */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
            <FieldLabel label="Usage" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={loadType}
              options={[
                { key: "other", label: "Other usage" },
                { key: "lighting", label: "Lighting" },
              ]}
              onChange={setLoadType}
            />
          </View>

          {/* Inputs. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20, rowGap: 16 }}>
            <Input
              themeName={themeName}
              type="decimal"
              label="Line length (m)"
              value={lengthM}
              onChangeText={setLengthM}
              placeholder="e.g. 35"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Conductor cross-section (mm²)"
              value={sectionMm2}
              onChangeText={setSectionMm2}
              placeholder="e.g. 6"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Operating current I_B (A)"
              value={currentA}
              onChangeText={setCurrentA}
              placeholder="e.g. 32"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Power factor (cos φ)"
              value={powerFactor}
              onChangeText={setPowerFactor}
              placeholder="e.g. 0.85"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Voltage (V)"
              value={voltageV}
              onChangeText={setVoltageV}
              helperText={phase === "three" ? "Phase-to-phase voltage" : "Phase-to-neutral voltage"}
            />
          </View>

          {/* Footnote — formula + the limit basis. */}
          <View
            style={{
              marginHorizontal: GUTTER,
              marginTop: 24,
              backgroundColor: c.cardBg,
              borderWidth: c.cardBorder ? 1 : 0,
              borderColor: c.cardBorder,
              borderRadius: primitives.radii.lg,
              padding: 16,
            }}
          >
            <Text style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 19 }}>
              ΔU = {phase === "single" ? "2" : "√3"} × (ρ × L/S × cos φ + λ × L × sin φ) × I_B,
              with ρ and λ at the conventional NF C 15-100 values.
              {"\n"}Limits for an installation supplied by the public LV network
              (§525): 3% for lighting, 5% for other usage.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ConformityPill — the NF C 15-100 verdict under the voltage-drop result.
// Colour AND text both carry the meaning (P-colour-independence): never colour
// alone. Uses the feedback "subtle" token set for an AA-legible tinted pill.
function ConformityPill({
  conforme,
  limit,
  themeName,
}: {
  conforme: boolean;
  limit: number;
  themeName: ThemeName;
}) {
  const t = themes[themeName];
  const tone = conforme ? t.feedback.subtle.success : t.feedback.subtle.danger;
  const label = conforme ? `Compliant (limit ${limit}%)` : `Exceeds limit (${limit}%)`;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        alignSelf: "flex-start",
        marginTop: 16,
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border,
        borderRadius: primitives.radii.full,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: tone.fg,
          fontSize: 12.5,
          fontFamily: ralewayFamily("700"),
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ResultCell — one labelled figure in the result card (value + unit + caption).
function ResultCell({
  label,
  value,
  unit,
  themeName,
  emphasis = false,
}: {
  label: string;
  value: string;
  unit: string;
  themeName: ThemeName;
  emphasis?: boolean;
}) {
  const t = themes[themeName];
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: t.text.muted,
          fontSize: 11,
          fontFamily: ralewayFamily("600"),
          fontWeight: "600",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 8, columnGap: 4 }}>
        <Text
          style={{
            color: emphasis ? t.brand.accent : t.text.body,
            fontSize: 28,
            lineHeight: 32,
            fontFamily: displayFamily("700"),
            fontWeight: "700",
            letterSpacing: -0.6,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        <Text style={{ color: t.text.muted, fontSize: 14, fontFamily: ralewayFamily("600"), fontWeight: "600" }}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

// FieldLabel — matches the Input component's label so the segmented control
// reads as part of the same form.
function FieldLabel({ label, themeName }: { label: string; themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <Text
      style={{
        color: t.text.body,
        fontSize: 13,
        fontFamily: ralewayFamily("600"),
        fontWeight: "600",
        letterSpacing: -0.05,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  );
}

// Format a number with a fixed precision (period decimal separator).
function formatFr(value: number, decimals: number): string {
  return value.toFixed(decimals);
}
