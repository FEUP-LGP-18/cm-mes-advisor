import type { ReviewProjectMetadata } from "./review";
import { assertRequirementsWorkbookFilename } from "./workbook-file";
import {
  normalizeIndustryTemplateId,
  type IndustryTemplateId,
} from "@/lib/settings";

export type RequirementsSourceKind = "fixture" | "upload";

export interface RequirementsSourceMetadata {
  sourceId: string;
  sourceKind: RequirementsSourceKind;
  sourceLabel: string;
  sourceFilename: string;
  projectName: string;
  customerName: string;
  industryTemplateId: IndustryTemplateId | null;
  uploadedAt: string | null;
}

export function createFixtureSourceMetadata(
  project: ReviewProjectMetadata,
): RequirementsSourceMetadata {
  return {
    sourceId: project.projectId,
    sourceKind: "fixture",
    sourceLabel: "Fixture sample",
    sourceFilename: project.sourceFilename,
    projectName: project.projectName,
    customerName: project.customerName,
    industryTemplateId: null,
    uploadedAt: null,
  };
}

export function createUploadSourceMetadata(
  fileName: string,
  workbookBytes: ArrayBuffer | Uint8Array,
  options: {
    customerName?: string | null;
    industryTemplateId?: string | null;
    projectName?: string | null;
    sourceId?: string;
    uploadedAt?: string;
  } = {},
): RequirementsSourceMetadata {
  assertRequirementsWorkbookFilename(fileName);

  const sourceId =
    options.sourceId ?? createWorkbookSourceIdentity(fileName, workbookBytes);
  const baseName = createDisplayNameFromFilename(fileName);
  const projectName = cleanOptionalText(options.projectName) ?? baseName;
  const customerName = cleanOptionalText(options.customerName) ?? baseName;

  return {
    sourceId,
    sourceKind: "upload",
    sourceLabel: `Uploaded workbook: ${fileName}`,
    sourceFilename: fileName,
    projectName,
    customerName,
    industryTemplateId: normalizeIndustryTemplateId(options.industryTemplateId),
    uploadedAt: options.uploadedAt ?? new Date().toISOString(),
  };
}

export function createWorkbookSourceIdentity(
  fileName: string,
  workbookBytes: ArrayBuffer | Uint8Array,
): string {
  const normalizedFileName = fileName.trim().toLowerCase();
  const bytes =
    workbookBytes instanceof Uint8Array
      ? workbookBytes
      : new Uint8Array(workbookBytes);
  let hash = 0x811c9dc5;

  for (const character of normalizedFileName) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return `upload:${toUnsignedHex(hash)}:${sanitizeFilenamePart(fileName)}`;
}

export function createDisplayNameFromFilename(fileName: string): string {
  const baseName = sanitizeFilenamePart(fileName.replace(/\.xlsx$/i, ""));
  if (!baseName) {
    return "Uploaded workbook";
  }

  return baseName
    .split("-")
    .map((segment) =>
      segment.length > 0
        ? `${segment[0].toUpperCase()}${segment.slice(1)}`
        : segment,
    )
    .join(" ");
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toUnsignedHex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function cleanOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
