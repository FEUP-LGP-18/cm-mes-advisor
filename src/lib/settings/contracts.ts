import {
  normalizeIndustryTemplateId,
  type IndustryTemplateId,
} from "./industry-templates";

export const safeAiModelAliases = [
  "default",
  "grounded-draft",
  "review-focused",
] as const;

export const aiVerbosityLevels = ["low", "medium", "high"] as const;

export const outputLanguageOptions = [
  { id: "en", label: "English" },
  { id: "pt", label: "Portuguese" },
  { id: "es", label: "Spanish" },
] as const;

export const mesVersionOptions = [
  { id: "cm-v8", label: "CM V8" },
  { id: "cm-v9", label: "CM V9" },
  { id: "cm-v10", label: "CM V10" },
] as const;

export type SafeAiModelAlias = (typeof safeAiModelAliases)[number];
export type SafeAiVerbosity = (typeof aiVerbosityLevels)[number];
export type OutputLanguage = (typeof outputLanguageOptions)[number]["id"];
export type MesVersion = (typeof mesVersionOptions)[number]["id"];

export interface SafeAiPreferences {
  confidenceThreshold: number;
  includeExplanations: boolean;
  modelAlias: SafeAiModelAlias;
  verbosity: SafeAiVerbosity;
}

export interface GeneralOutputPreferences {
  consultantName: string | null;
  mesVersion: MesVersion | null;
  outputLanguage: OutputLanguage | null;
  outputLanguageStatus: "saved-for-future-outputs";
}

export interface SettingsBehaviorSnapshot {
  aiPreferences: SafeAiPreferences;
  generalOutputPreferences: GeneralOutputPreferences;
  industryTemplateId: IndustryTemplateId | null;
}

export interface OutputMetadataEntry {
  label: string;
  value: string;
}

export const defaultSafeAiPreferences: SafeAiPreferences = {
  confidenceThreshold: 75,
  includeExplanations: true,
  modelAlias: "default",
  verbosity: "medium",
};

export const defaultGeneralOutputPreferences: GeneralOutputPreferences = {
  consultantName: null,
  mesVersion: null,
  outputLanguage: null,
  outputLanguageStatus: "saved-for-future-outputs",
};

export const defaultSettingsBehaviorSnapshot: SettingsBehaviorSnapshot = {
  aiPreferences: defaultSafeAiPreferences,
  generalOutputPreferences: defaultGeneralOutputPreferences,
  industryTemplateId: null,
};

export function normalizeSafeAiPreferences(
  value: unknown,
): SafeAiPreferences {
  if (!isRecord(value)) {
    return { ...defaultSafeAiPreferences };
  }

  return {
    confidenceThreshold: normalizeConfidenceThreshold(
      value.confidenceThreshold,
    ),
    includeExplanations: readBoolean(
      value.includeExplanations,
      defaultSafeAiPreferences.includeExplanations,
    ),
    modelAlias: normalizeEnumValue(
      value.modelAlias,
      safeAiModelAliases,
      defaultSafeAiPreferences.modelAlias,
    ),
    verbosity: normalizeEnumValue(
      value.verbosity,
      aiVerbosityLevels,
      defaultSafeAiPreferences.verbosity,
    ),
  };
}

export function normalizeGeneralOutputPreferences(
  value: unknown,
): GeneralOutputPreferences {
  if (!isRecord(value)) {
    return { ...defaultGeneralOutputPreferences };
  }

  return {
    consultantName: normalizeOptionalText(value.consultantName, 120),
    mesVersion: normalizeMesVersion(value.mesVersion),
    outputLanguage: normalizeOutputLanguage(value.outputLanguage),
    outputLanguageStatus: "saved-for-future-outputs",
  };
}

export function normalizeSettingsBehaviorSnapshot(
  value: unknown,
): SettingsBehaviorSnapshot {
  if (!isRecord(value)) {
    return {
      aiPreferences: { ...defaultSafeAiPreferences },
      generalOutputPreferences: { ...defaultGeneralOutputPreferences },
      industryTemplateId: null,
    };
  }

  return {
    aiPreferences: normalizeSafeAiPreferences(value.aiPreferences),
    generalOutputPreferences: normalizeGeneralOutputPreferences(
      value.generalOutputPreferences ?? value.outputPreferences,
    ),
    industryTemplateId: normalizeIndustryTemplateId(
      value.industryTemplateId ?? value.templateId,
    ),
  };
}

export function getOutputLanguageLabel(language: OutputLanguage): string {
  return (
    outputLanguageOptions.find((option) => option.id === language)?.label ??
    language
  );
}

export function getMesVersionLabel(version: MesVersion): string {
  return (
    mesVersionOptions.find((option) => option.id === version)?.label ?? version
  );
}

export function formatGeneralOutputMetadata(
  preferences: GeneralOutputPreferences,
): OutputMetadataEntry[] {
  const entries: OutputMetadataEntry[] = [];

  if (preferences.consultantName) {
    entries.push({
      label: "Consultant",
      value: preferences.consultantName,
    });
  }

  if (preferences.mesVersion) {
    entries.push({
      label: "MES version",
      value: getMesVersionLabel(preferences.mesVersion),
    });
  }

  if (preferences.outputLanguage) {
    entries.push({
      label: "Output language preference",
      value: `${getOutputLanguageLabel(
        preferences.outputLanguage,
      )} (saved for future outputs; existing generated content is not translated)`,
    });
  }

  return entries;
}

function normalizeConfidenceThreshold(value: unknown): number {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return defaultSafeAiPreferences.confidenceThreshold;
  }

  return Math.min(95, Math.max(50, Math.round(numericValue)));
}

function normalizeMesVersion(value: unknown): MesVersion | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  const byLabel = mesVersionOptions.find(
    (option) =>
      option.id === normalized ||
      option.label.toLowerCase().replace(/\s+/g, "-") === normalized,
  );

  return byLabel?.id ?? null;
}

function normalizeOutputLanguage(value: unknown): OutputLanguage | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const byLabel = outputLanguageOptions.find(
    (option) =>
      option.id === normalized || option.label.toLowerCase() === normalized,
  );

  return byLabel?.id ?? null;
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && isEnumValue(value, allowedValues)
    ? value
    : fallback;
}

function isEnumValue<const T extends readonly string[]>(
  value: string,
  allowedValues: T,
): value is T[number] {
  return allowedValues.includes(value as T[number]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
