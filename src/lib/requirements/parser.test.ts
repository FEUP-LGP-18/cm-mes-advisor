import { Workbook } from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertRequirementsWorkbookFilename,
  parseRequirementsWorkbook,
  parseRequirementsWorkbookFile,
  REQUIREMENTS_DATA_START_ROW_NUMBER,
  REQUIREMENTS_HEADER_ROW_NUMBER,
  summarizeRequirements,
  type ParsedRequirement,
} from ".";

const fixturePath = path.join(
  process.cwd(),
  "fixtures/customer-x-functional-requirements.xlsx",
);

describe("requirements parser", () => {
  let requirements: ParsedRequirement[];

  beforeAll(async () => {
    requirements = await parseRequirementsWorkbookFile(fixturePath);
  });

  it("detects the Requirements sheet in the real fixture", () => {
    expect(requirements).toHaveLength(167);
    expect(requirements[0]?.requirementId).toBe("01.01");
  });

  it("parses workbook bytes from an uploaded workbook path", async () => {
    const uploadedWorkbookBuffer = await readFile(fixturePath);
    const uploadedRequirements = await parseRequirementsWorkbook(
      uploadedWorkbookBuffer.buffer.slice(
        uploadedWorkbookBuffer.byteOffset,
        uploadedWorkbookBuffer.byteOffset + uploadedWorkbookBuffer.byteLength,
      ),
    );

    expect(uploadedRequirements).toHaveLength(167);
    expect(uploadedRequirements[0]?.requirementId).toBe("01.01");
  });

  it("uses row 2 as the header row and starts data at row 3", () => {
    expect(REQUIREMENTS_HEADER_ROW_NUMBER).toBe(2);
    expect(REQUIREMENTS_DATA_START_ROW_NUMBER).toBe(3);
    expect(requirements[0]?.sourceRowNumber).toBe(3);
    expect(requirements[0]?.requirementDescription).toBe(
      "UI supporting local language(ENG, BE, CZ, SP, RO, CN)",
    );
  });

  it("preserves original source row numbers through the fixture", () => {
    expect(requirements[0]?.sourceRowNumber).toBe(3);
    expect(requirements.at(-1)?.sourceRowNumber).toBe(169);
  });

  it("maps the Excel Comment column to sourceComment without generated output", () => {
    const firstRequirement = requirements[0];

    expect(firstRequirement?.sourceComment).toContain(
      "Critical Manufacturing provides the capability",
    );
    expect(
      Object.prototype.hasOwnProperty.call(
        firstRequirement as unknown as Record<string, unknown>,
        "generatedComment",
      ),
    ).toBe(false);
  });

  it("normalizes demo and MVP flags case-insensitively while preserving raw values", () => {
    const lowerCaseDemo = requirements.find(
      (requirement) => requirement.demoRaw === "x",
    );
    const upperCaseDemo = requirements.find(
      (requirement) => requirement.demoRaw === "X",
    );
    const lowerCaseMvp = requirements.find(
      (requirement) => requirement.mvpRaw === "x",
    );
    const upperCaseMvp = requirements.find(
      (requirement) => requirement.mvpRaw === "X",
    );

    expect(lowerCaseDemo?.demo).toBe(true);
    expect(upperCaseDemo?.demo).toBe(true);
    expect(lowerCaseMvp?.mvp).toBe(true);
    expect(upperCaseMvp?.mvp).toBe(true);
  });

  it("summarizes expected fixture row and flag counts", () => {
    expect(summarizeRequirements(requirements)).toEqual({
      rowCount: 167,
      demoCount: 29,
      mvpCount: 54,
      demoAndMvpCount: 13,
    });
  });

  it("rejects non-xlsx workbook filenames before parsing", () => {
    expect(() =>
      assertRequirementsWorkbookFilename("requirements.csv"),
    ).toThrow("Only .xlsx workbooks are supported for requirements upload.");
  });

  it("rejects workbooks that do not contain a Requirements sheet", async () => {
    const workbook = new Workbook();
    workbook.addWorksheet("Other Sheet").addRow(["irrelevant"]);
    const buffer = await workbook.xlsx.writeBuffer();

    await expect(parseRequirementsWorkbook(buffer)).rejects.toThrow(
      "Workbook is missing Requirements sheet.",
    );
  });

  it("rejects workbooks whose row 2 headers are incomplete", async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Requirements");
    worksheet.getRow(2).getCell(1).value = "#";
    worksheet.getRow(2).getCell(2).value = "Requirement description";
    const buffer = await workbook.xlsx.writeBuffer();

    await expect(parseRequirementsWorkbook(buffer)).rejects.toThrow(
      "Requirements sheet is missing expected row 2 header(s):",
    );
  });
});
