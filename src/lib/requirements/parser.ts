import type { Cell, CellValue, Row, Worksheet } from "exceljs";
import type { ParsedRequirement, RequirementsSummary } from "./types";

export const REQUIREMENTS_SHEET_NAME = "Requirements";
export const REQUIREMENTS_HEADER_ROW_NUMBER = 2;
export const REQUIREMENTS_DATA_START_ROW_NUMBER =
  REQUIREMENTS_HEADER_ROW_NUMBER + 1;

const TRUE_FLAG_VALUES = new Set(["x", "yes", "y", "true", "1"]);

const requirementColumnHeaders = {
  requirementId: "#",
  requirementDescription: "Requirement description",
  l2Process: "L2 process",
  l3Process: "L3 process",
  operation: "Operation",
  demoRaw: "Demo",
  detailDescriptionAndMotivation: "Detail  description & motivation",
  prioEms: "Prio EMS",
  prioCws: "Prio CWS",
  mvpRaw: "MVP",
  availability: "Availability",
  availabilityCm: "Availability CM",
  descriptionAvailability: "Description availability",
  supportedPercent: "Supported %",
  sourceComment: "Comment",
} as const;

type RequirementColumnKey = keyof typeof requirementColumnHeaders;
type RequirementColumnMap = Record<RequirementColumnKey, number>;

export type { ParsedRequirement, RequirementsSummary } from "./types";

export async function parseRequirementsWorkbook(
  workbookData: ArrayBuffer | Uint8Array,
): Promise<ParsedRequirement[]> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(
    workbookData as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );

  const worksheet = workbook.getWorksheet(REQUIREMENTS_SHEET_NAME);
  if (!worksheet) {
    throw new Error(`Workbook is missing ${REQUIREMENTS_SHEET_NAME} sheet.`);
  }

  const columns = readHeaderColumns(worksheet);
  const requirements: ParsedRequirement[] = [];

  for (
    let rowNumber = REQUIREMENTS_DATA_START_ROW_NUMBER;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);
    const rowText = readMappedRowText(row, columns);

    if (!hasRequirementData(rowText)) {
      continue;
    }

    requirements.push({
      sourceRowNumber: rowNumber,
      requirementId: rowText.requirementId,
      requirementDescription: rowText.requirementDescription,
      l2Process: rowText.l2Process,
      l3Process: rowText.l3Process,
      operation: rowText.operation,
      demo: normalizeRequirementFlag(rowText.demoRaw),
      demoRaw: rowText.demoRaw,
      detailDescriptionAndMotivation: rowText.detailDescriptionAndMotivation,
      prioEms: rowText.prioEms,
      prioCws: rowText.prioCws,
      mvp: normalizeRequirementFlag(rowText.mvpRaw),
      mvpRaw: rowText.mvpRaw,
      availability: rowText.availability,
      availabilityCm: rowText.availabilityCm,
      descriptionAvailability: rowText.descriptionAvailability,
      supportedPercent: rowText.supportedPercent,
      sourceComment: rowText.sourceComment,
    });
  }

  return requirements;
}

export function summarizeRequirements(
  requirements: ParsedRequirement[],
): RequirementsSummary {
  return requirements.reduce<RequirementsSummary>(
    (summary, requirement) => ({
      rowCount: summary.rowCount + 1,
      demoCount: summary.demoCount + (requirement.demo ? 1 : 0),
      mvpCount: summary.mvpCount + (requirement.mvp ? 1 : 0),
      demoAndMvpCount:
        summary.demoAndMvpCount + (requirement.demo && requirement.mvp ? 1 : 0),
    }),
    {
      rowCount: 0,
      demoCount: 0,
      mvpCount: 0,
      demoAndMvpCount: 0,
    },
  );
}

export function normalizeRequirementFlag(rawValue: string): boolean {
  return TRUE_FLAG_VALUES.has(rawValue.trim().toLowerCase());
}

function readHeaderColumns(worksheet: Worksheet): RequirementColumnMap {
  const headerRow = worksheet.getRow(REQUIREMENTS_HEADER_ROW_NUMBER);
  const headers = new Map<string, number>();

  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = readCellText(cell);
    if (header) {
      headers.set(header, columnNumber);
    }
  });

  const missingHeaders = Object.values(requirementColumnHeaders).filter(
    (header) => !headers.has(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Requirements sheet is missing expected row ${REQUIREMENTS_HEADER_ROW_NUMBER} header(s): ${missingHeaders.join(
        ", ",
      )}.`,
    );
  }

  return Object.fromEntries(
    Object.entries(requirementColumnHeaders).map(([field, header]) => [
      field,
      headers.get(header),
    ]),
  ) as RequirementColumnMap;
}

function readMappedRowText(
  row: Row | undefined,
  columns: RequirementColumnMap,
): Record<RequirementColumnKey, string> {
  if (!row) {
    return emptyMappedRowText();
  }

  return Object.fromEntries(
    Object.keys(requirementColumnHeaders).map((field) => {
      const columnKey = field as RequirementColumnKey;
      return [columnKey, readCellText(row.getCell(columns[columnKey]))];
    }),
  ) as Record<RequirementColumnKey, string>;
}

function emptyMappedRowText(): Record<RequirementColumnKey, string> {
  return Object.fromEntries(
    Object.keys(requirementColumnHeaders).map((field) => [field, ""]),
  ) as Record<RequirementColumnKey, string>;
}

function hasRequirementData(
  rowText: Record<RequirementColumnKey, string>,
): boolean {
  return Object.values(rowText).some((value) => value.length > 0);
}

function readCellText(cell: Cell): string {
  return cellValueToText(cell.value, cell.text).trim();
}

function cellValueToText(value: CellValue, renderedText: string): string {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }

    if ("text" in value) {
      return value.text;
    }

    if ("result" in value && value.result != null) {
      return cellValueToText(value.result, String(value.result));
    }

    if ("error" in value) {
      return value.error;
    }
  }

  return renderedText;
}
