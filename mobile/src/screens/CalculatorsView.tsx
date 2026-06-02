// CalculatorsView — the "Calculateurs" segment of the Trades tab (FFIE-CALC-01/
// 02, 🟢 Phase 2, réservé aux adhérents).
//
// Two states, decided by role (the access model — src/auth/roleContext):
//   • Guest  → a member-only locked state (Lock + "Réservé aux adhérents"),
//              matching how the rest of the app gates member content. Per the
//              tech requirement, gated surfaces inform & invite, never 403.
//   • Member → the calculators module: a grouped list of tools. The working
//              tool (Puissance & intensité) opens in a sheet; the planned tools
//              (dimensionnement, normes) read as "Bientôt", honestly, since
//              their reference data is still TBC with FFIE.
//
// The calculator itself (PowerCalculatorSheet) computes live as the user types,
// using the pure helpers in data/calculators.ts. It's framed as an aid: the
// footnote points back to NF C 15-100 for the actual sizing decision rather
// than inventing normative tables (CLAUDE.md: no fabricated real-world data).

import React, { useMemo, useState } from "react";
import { Lock, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { primitives, themes, type ThemeName } from "@tokens";
import { ralewayFamily, displayFamily } from "@/theme/fonts";
import { GUTTER, InsetGroup, InsetRow, useGroupedColors } from "@/components/ui/ios";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { canAccess, useRole } from "@/auth/roleContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  CALCULATORS,
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

export function CalculatorsView({ themeName = "light" }: { themeName?: ThemeName }) {
  const { role } = useRole();
  const isMember = canAccess(role, "member-only");

  // Which working calculator is open (null = list). Only "power" exists today,
  // but the union keeps the door open for the planned tools.
  const [openKind, setOpenKind] = useState<CalculatorKind | null>(null);

  if (!isMember) return <MemberLockedView themeName={themeName} />;

  return (
    <>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 2, paddingBottom: 18 }}>
        <Text style={{ color: themes[themeName].text.muted, fontSize: 15, lineHeight: 22 }}>
          Vos outils de calcul métier. D'autres calculateurs définis par la FFIE
          arriveront dans les prochaines versions.
        </Text>
      </View>

      <InsetGroup themeName={themeName} footer="Réservé aux adhérents FFIE.">
        {CALCULATORS.map((calc, i) => {
          const t = themes[themeName];
          const last = i === CALCULATORS.length - 1;
          return (
            <InsetRow
              key={calc.id}
              themeName={themeName}
              icon={calc.icon}
              // Available tools take the brand tile; planned ones are muted so
              // the row reads as informational, not a dead link.
              iconBg={calc.available ? t.brand.accent : t.border.strong}
              title={calc.title}
              subtitle={calc.subtitle}
              isLast={last}
              value={calc.available ? undefined : "Bientôt"}
              onPress={calc.available ? () => setOpenKind(calc.kind) : undefined}
              accessibilityLabel={`${calc.title}. ${calc.subtitle}.`}
              accessibilityHint={calc.available ? "Ouvre le calculateur" : "Bientôt disponible"}
            />
          );
        })}
      </InsetGroup>

      <PowerCalculatorSheet
        visible={openKind === "power"}
        themeName={themeName}
        onClose={() => setOpenKind(null)}
      />
      <VoltageDropSheet
        visible={openKind === "voltage-drop"}
        themeName={themeName}
        onClose={() => setOpenKind(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// MemberLockedView — what a guest sees on the Calculateurs segment. Lock glyph,
// an honest one-liner, and the phase badge. (Apply / sign-in CTAs live on the
// dedicated MemberOnlyPrompt screen reached from the avatar; inside a segment
// we keep it to a clear, calm gate.)
// ---------------------------------------------------------------------------
function MemberLockedView({ themeName }: { themeName: ThemeName }) {
  const t = themes[themeName];
  return (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: 72, alignItems: "center" }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: t.surface.subtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lock size={30} color={t.brand.accent} strokeWidth={1.75} />
      </View>

      <Text
        accessibilityRole="header"
        style={{
          color: t.text.body,
          fontSize: 21,
          lineHeight: 27,
          fontFamily: displayFamily("700"),
          fontWeight: "700",
          letterSpacing: -0.4,
          textAlign: "center",
          marginTop: 20,
        }}
      >
        Calculateurs techniques
      </Text>

      <Text
        style={{
          color: t.text.muted,
          fontSize: 14.5,
          lineHeight: 22,
          textAlign: "center",
          marginTop: 10,
          maxWidth: 320,
        }}
      >
        Les outils de calcul métier (puissance, dimensionnement, normes) sont
        réservés aux adhérents FFIE.
      </Text>

      <View
        style={{
          marginTop: 18,
          backgroundColor: t.surface.subtle,
          borderWidth: 1,
          borderColor: t.border.subtle,
          borderRadius: primitives.radii.full,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <Text
          style={{
            color: t.brand.accent,
            fontSize: 12,
            fontFamily: ralewayFamily("700"),
            fontWeight: "700",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Réservé aux adhérents
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PowerCalculatorSheet — puissance ↔ intensité. The result sits at the top so
// it stays visible while the number pad is up; the controls are below it.
// Computes live from the pure helpers; shows a placeholder until the inputs are
// physically valid.
//
// Reduced motion (P5): the sheet snaps in with no slide when the OS setting is
// on, like the other sheets in the app.
// ---------------------------------------------------------------------------
function PowerCalculatorSheet({
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

  // Switching régime re-seeds the voltage to that régime's standard LV value.
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
            accessibilityLabel="Fermer"
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
              Puissance & intensité
            </Text>
            <Text style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 22, marginTop: 8 }}>
              Courant de ligne et puissance apparente d'une charge à partir de sa
              puissance active.
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
                label="Intensité"
                value={result ? formatFr(result.currentA, 1) : "—"}
                unit="A"
                themeName={themeName}
                emphasis
              />
              <View style={{ width: 1, backgroundColor: t.border.subtle, marginHorizontal: 18 }} />
              <ResultCell
                label="Puissance apparente"
                value={result ? formatFr(result.apparentKva, 2) : "—"}
                unit="kVA"
                themeName={themeName}
              />
            </View>
            {!valid ? (
              <Text style={{ color: t.text.muted, fontSize: 12.5, lineHeight: 17, marginTop: 8, marginHorizontal: 4 }}>
                Renseignez une puissance, une tension et un facteur de puissance
                (entre 0 et 1) pour obtenir le résultat.
              </Text>
            ) : null}
          </View>

          {/* Régime — monophasé (230 V) vs triphasé (400 V). */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <FieldLabel label="Régime" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={phase}
              options={[
                { key: "single", label: "Monophasé" },
                { key: "three", label: "Triphasé" },
              ]}
              onChange={onPhaseChange}
            />
          </View>

          {/* Inputs. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20, rowGap: 16 }}>
            <Input
              themeName={themeName}
              type="decimal"
              label="Puissance active (kW)"
              value={powerKw}
              onChangeText={setPowerKw}
              placeholder="ex. 7,5"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Tension (V)"
              value={voltageV}
              onChangeText={setVoltageV}
              helperText={phase === "three" ? "Tension entre phases" : "Tension phase-neutre"}
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Facteur de puissance (cos φ)"
              value={powerFactor}
              onChangeText={setPowerFactor}
              placeholder="ex. 0,85"
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
                ? "Formule : I = P / (√3 × U × cos φ),  S = P / cos φ."
                : "Formule : I = P / (U × cos φ),  S = P / cos φ."}
              {"\n"}Aide au pré-dimensionnement uniquement : le choix final de la
              protection et de la section de câble relève de la NF C 15-100.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// VoltageDropSheet — chute de tension. Same shape as the power sheet: result on
// top (ΔU in volts + the relative %), then the controls. Adds a conformity pill
// comparing ΔU/U to the NF C 15-100 limit for the selected usage — the "normes"
// angle of the module.
// ---------------------------------------------------------------------------
function VoltageDropSheet({
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
            accessibilityLabel="Fermer"
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
              Chute de tension
            </Text>
            <Text style={{ color: t.text.muted, fontSize: 14.5, lineHeight: 22, marginTop: 8 }}>
              Chute de tension d'une canalisation et vérification de sa conformité
              à la NF C 15-100.
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
                  label="Chute ΔU"
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
                Renseignez la longueur, la section, le courant d'emploi et le
                facteur de puissance pour obtenir le résultat.
              </Text>
            ) : null}
          </View>

          {/* Régime. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <FieldLabel label="Régime" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={phase}
              options={[
                { key: "single", label: "Monophasé" },
                { key: "three", label: "Triphasé" },
              ]}
              onChange={onPhaseChange}
            />
          </View>

          {/* Matériau du conducteur. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
            <FieldLabel label="Conducteur" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={conductor}
              options={[
                { key: "copper", label: "Cuivre" },
                { key: "aluminium", label: "Aluminium" },
              ]}
              onChange={setConductor}
            />
          </View>

          {/* Usage — sets the conformity limit (3 % éclairage / 5 % autres). */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
            <FieldLabel label="Usage" themeName={themeName} />
            <SegmentedControl
              themeName={themeName}
              value={loadType}
              options={[
                { key: "other", label: "Autres usages" },
                { key: "lighting", label: "Éclairage" },
              ]}
              onChange={setLoadType}
            />
          </View>

          {/* Inputs. */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 20, rowGap: 16 }}>
            <Input
              themeName={themeName}
              type="decimal"
              label="Longueur de la ligne (m)"
              value={lengthM}
              onChangeText={setLengthM}
              placeholder="ex. 35"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Section du conducteur (mm²)"
              value={sectionMm2}
              onChangeText={setSectionMm2}
              placeholder="ex. 6"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Courant d'emploi I_B (A)"
              value={currentA}
              onChangeText={setCurrentA}
              placeholder="ex. 32"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Facteur de puissance (cos φ)"
              value={powerFactor}
              onChangeText={setPowerFactor}
              placeholder="ex. 0,85"
            />
            <Input
              themeName={themeName}
              type="decimal"
              label="Tension (V)"
              value={voltageV}
              onChangeText={setVoltageV}
              helperText={phase === "three" ? "Tension entre phases" : "Tension phase-neutre"}
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
              avec ρ et λ aux valeurs conventionnelles de la NF C 15-100.
              {"\n"}Limites pour une installation alimentée par le réseau public BT
              (§525) : 3 % en éclairage, 5 % pour les autres usages.
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
  const label = conforme ? `Conforme (limite ${limit} %)` : `Dépassement (limite ${limit} %)`;
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

// Format a number the French way (comma decimal separator), fixed precision.
function formatFr(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}
