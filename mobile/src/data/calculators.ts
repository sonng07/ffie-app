// Technical calculators — the module behind FFIE-CALC-01/02 (🟢 Phase 2,
// réservé aux adhérents). FFIE-CALC-01: "a module integrates industry-specific
// calculation tools"; FFIE-CALC-02: "each calculator accepts the necessary
// inputs and displays a result". The PRD names three domains — puissance,
// dimensionnement, normes — but the exact calculator list is still TBC with
// FFIE (see project/STATE.md). So this registry ships ONE fully-working,
// physics-correct calculator (puissance ↔ intensité) and lists the other
// domains honestly as "à venir", exactly like the rest of the app handles
// not-yet-built content (no fabricated data — see CLAUDE.md conventions).
//
// The compute functions here are pure (no React, no I/O) so the screen can call
// them live as the user types, and so they're trivial to check in isolation.
// They implement standard electrical formulas — NOT FFIE-specific normative
// tables. Cable/breaker sizing per NF C 15-100 needs the federation's reference
// data, which we don't invent; the puissance tool is framed as an aid, with a
// footnote pointing back to the standard for the actual sizing decision.

import { Activity, Cable, Gauge, type LucideIcon } from "lucide-react-native";

// ---------------------------------------------------------------------------
// Registry — what the calculators module offers. The `available` tools each
// have a `kind` the screen switches on; the "soon" entries advertise the
// planned domains so the module reads as a roadmap, not a dead end.
// ---------------------------------------------------------------------------
export type CalculatorKind = "power" | "voltage-drop";

export type CalculatorEntry = {
  id: string;
  title: string;
  /** One-line description of what the tool computes (the row subtitle). */
  subtitle: string;
  icon: LucideIcon;
  /** Domain tag from the PRD (puissance / dimensionnement / normes). */
  domain: "Puissance" | "Dimensionnement" | "Normes";
} & ({ available: true; kind: CalculatorKind } | { available: false });

export const CALCULATORS: ReadonlyArray<CalculatorEntry> = [
  {
    id: "power-current",
    title: "Puissance & intensité",
    subtitle: "Courant et puissance apparente d'une charge mono/triphasée",
    icon: Activity,
    domain: "Puissance",
    available: true,
    kind: "power",
  },
  {
    id: "voltage-drop",
    title: "Chute de tension",
    subtitle: "ΔU en ligne et conformité NF C 15-100",
    icon: Gauge,
    domain: "Normes",
    available: true,
    kind: "voltage-drop",
  },
  {
    id: "cable-sizing",
    title: "Section de câble",
    subtitle: "Dimensionnement selon la NF C 15-100",
    icon: Cable,
    domain: "Dimensionnement",
    available: false,
  },
];

// ---------------------------------------------------------------------------
// Puissance ↔ intensité — the working calculator.
//
// Given an active power P (kW), a line voltage U (V) and a power factor cos φ,
// compute the line current I (A) and the apparent power S (kVA):
//
//   S = P / cos φ
//   monophasé : I = (P × 1000) / (U × cos φ)
//   triphasé  : I = (P × 1000) / (√3 × U × cos φ)
//
// These are exact, universal electrical relations — no normative assumptions.
// ---------------------------------------------------------------------------
export type Phase = "single" | "three";

/** Default line voltage per régime in France (LV distribution). Editable by
 *  the user — these are just the sensible pre-fills. */
export const DEFAULT_VOLTAGE: Record<Phase, number> = {
  single: 230,
  three: 400,
};

/** Typical inductive load power factor — a safe starting point the user adjusts
 *  to their installation. */
export const DEFAULT_POWER_FACTOR = 0.85;

const SQRT_3 = Math.sqrt(3);

export type PowerInput = {
  phase: Phase;
  /** Active power in kilowatts. */
  powerKw: number;
  /** Line voltage in volts. */
  voltageV: number;
  /** Power factor cos φ, in (0, 1]. */
  powerFactor: number;
};

export type PowerResult = {
  /** Line current in amperes. */
  currentA: number;
  /** Apparent power in kilovolt-amperes. */
  apparentKva: number;
};

/** Parse a user-entered number, accepting the French decimal comma. Returns
 *  NaN for blank / malformed input so callers can show a placeholder state. */
export function parseNumber(raw: string): number {
  const normalised = raw.trim().replace(",", ".");
  if (normalised === "") return NaN;
  return Number(normalised);
}

/** True when every field is present and physically usable. Guards the divide
 *  (U·cos φ > 0) and rejects negative power before we compute. */
export function isValidPowerInput(input: PowerInput): boolean {
  const { powerKw, voltageV, powerFactor } = input;
  return (
    Number.isFinite(powerKw) &&
    Number.isFinite(voltageV) &&
    Number.isFinite(powerFactor) &&
    powerKw >= 0 &&
    voltageV > 0 &&
    powerFactor > 0 &&
    powerFactor <= 1
  );
}

export function computePower(input: PowerInput): PowerResult {
  const { phase, powerKw, voltageV, powerFactor } = input;
  const apparentKva = powerKw / powerFactor;
  const denominator = (phase === "three" ? SQRT_3 * voltageV : voltageV) * powerFactor;
  const currentA = (powerKw * 1000) / denominator;
  return { currentA, apparentKva };
}

// ---------------------------------------------------------------------------
// Chute de tension — voltage drop along a feeder. The NF C 15-100 formula:
//
//   ΔU = b × ( ρ × (L / S) × cos φ  +  λ × L × sin φ ) × I_B
//
//   b   = 2 en monophasé (aller-retour), 1 en triphasé
//   ρ   = résistivité du conducteur à sa température de service (Ω·mm²/m)
//   L   = longueur de la canalisation (m)
//   S   = section du conducteur (mm²)
//   λ   = réactance linéique (Ω/m) — valeur conventionnelle 0,08 mΩ/m
//   I_B = courant d'emploi (A)
//
// ρ and λ here are the conventional values used by NF C 15-100 (ρ at the
// operating temperature, i.e. 1,25 × ρ₂₀), not invented figures. The relative
// drop ΔU/U is compared to the standard's limits for a public-LV-fed
// installation (§525): 3 % éclairage, 5 % autres usages.
// ---------------------------------------------------------------------------
export type Conductor = "copper" | "aluminium";
export type LoadType = "lighting" | "other";

/** Conventional resistivity at service temperature, Ω·mm²/m (NF C 15-100). */
export const RESISTIVITY: Record<Conductor, number> = {
  copper: 0.0225,
  aluminium: 0.036,
};

/** Conventional linear reactance of a conductor, Ω/m (0,08 mΩ/m). */
const REACTANCE_PER_M = 0.00008;

/** Max relative voltage drop for an installation fed from the public LV
 *  network, in % (NF C 15-100 §525). */
export const VOLTAGE_DROP_LIMIT: Record<LoadType, number> = {
  lighting: 3,
  other: 5,
};

export type VoltageDropInput = {
  phase: Phase;
  conductor: Conductor;
  /** Feeder length in metres. */
  lengthM: number;
  /** Conductor cross-section in mm². */
  sectionMm2: number;
  /** Operating current I_B in amperes. */
  currentA: number;
  /** Power factor cos φ, in (0, 1]. */
  powerFactor: number;
  /** Line voltage in volts (for the relative drop). */
  voltageV: number;
};

export type VoltageDropResult = {
  /** Voltage drop ΔU in volts. */
  dropV: number;
  /** Relative drop ΔU / U as a percentage. */
  dropPercent: number;
};

export function isValidVoltageDropInput(i: VoltageDropInput): boolean {
  return (
    Number.isFinite(i.lengthM) &&
    Number.isFinite(i.sectionMm2) &&
    Number.isFinite(i.currentA) &&
    Number.isFinite(i.powerFactor) &&
    Number.isFinite(i.voltageV) &&
    i.lengthM > 0 &&
    i.sectionMm2 > 0 &&
    i.currentA >= 0 &&
    i.powerFactor > 0 &&
    i.powerFactor <= 1 &&
    i.voltageV > 0
  );
}

export function computeVoltageDrop(i: VoltageDropInput): VoltageDropResult {
  const b = i.phase === "single" ? 2 : 1;
  const rho = RESISTIVITY[i.conductor];
  const cosPhi = i.powerFactor;
  // sin φ from cos φ (φ in the first quadrant for a typical inductive load).
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  const dropV =
    b *
    (rho * (i.lengthM / i.sectionMm2) * cosPhi + REACTANCE_PER_M * i.lengthM * sinPhi) *
    i.currentA;
  const dropPercent = (dropV / i.voltageV) * 100;
  return { dropV, dropPercent };
}
