import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
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
});
