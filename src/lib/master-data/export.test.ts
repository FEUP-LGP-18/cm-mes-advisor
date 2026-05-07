import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createMasterDataExportPackage } from "./export";
import { createEmptyMasterDataObjectMap, type MasterDataDraftObject } from "./types";

const execFileAsync = promisify(execFile);

function createObject(
  objectType: MasterDataDraftObject["objectType"],
  name: string,
): MasterDataDraftObject {
  return {
    objectId: `${objectType}:${name.toLowerCase()}`,
    objectType,
    sheetName: `<DM>${name}`,
    name,
    reviewStatus: "approved",
    modified: false,
    confidence: {
      level: "high",
      rationale: "Test object.",
    },
    warnings: [],
    sourceRequirementKeys: ["28:03.01"],
    sourceRequirementIds: ["03.01"],
    sourceRowNumbers: [28],
    fields: [
      {
        key: "Name",
        label: "Name",
        modified: false,
        required: true,
        source: "generated",
        value: name,
        warning: null,
      },
      {
        key: "Description",
        label: "Description",
        modified: false,
        required: true,
        source: "generated",
        value: `${name} description`,
        warning: null,
      },
    ],
  };
}

describe("createMasterDataExportPackage", () => {
  it("creates a zip package with workbook and manifest", async () => {
    const generatedObjects = createEmptyMasterDataObjectMap();
    generatedObjects.enterprise = [createObject("enterprise", "Enterprise")];
    generatedObjects.site = [createObject("site", "Site")];

    const result = await createMasterDataExportPackage({
      generatedAt: "2026-04-29T12:00:00.000Z",
      generatedObjects,
      project: {
        customerName: "Customer X",
        projectId: "customer-x-demo",
        projectName: "Customer X Demo",
      },
      traceability: [],
    });
    const tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), "cm-mes-master-data-export-"),
    );

    try {
      const packagePath = path.join(tempDirectory, result.fileName);

      await writeFile(packagePath, result.packageBuffer);

      const listing = await execFileAsync("unzip", ["-l", packagePath]);

      expect(result.fileName).toContain("master-data-package.zip");
      expect(listing.stdout).toContain("customer-x-demo-master-data.xlsx");
      expect(listing.stdout).toContain("manifest.json");
    } finally {
      await rm(tempDirectory, { force: true, recursive: true });
    }
  });
});
