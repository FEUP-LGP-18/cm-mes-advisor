import JSZip from "jszip";
import { Buffer } from "node:buffer";
import {
  createBlankMasterDataWorkbook,
  loadMasterDataTemplateDefinition,
} from "./template";
import {
  flattenMasterDataObjects,
  masterDataObjectTypes,
  summarizeMasterDataObjects,
  type MasterDataDraftObject,
  type MasterDataExportSummary,
  type MasterDataObjectType,
  type MasterDataTraceabilityRecord,
} from "./types";

export async function createMasterDataExportPackage({
  generatedAt,
  generatedObjects,
  project,
  traceability,
}: {
  generatedAt: string | null;
  generatedObjects: Record<MasterDataObjectType, MasterDataDraftObject[]>;
  project: {
    customerName: string;
    projectId: string;
    projectName: string;
  };
  traceability: MasterDataTraceabilityRecord[];
}): Promise<{
  fileName: string;
  packageBuffer: Buffer;
  summary: MasterDataExportSummary;
}> {
  const template = await loadMasterDataTemplateDefinition();
  const workbook = await createBlankMasterDataWorkbook();

  masterDataObjectTypes.forEach((objectType) => {
    const worksheet = workbook.getWorksheet(template.sheets[objectType].sheetName);

    if (!worksheet) {
      return;
    }

    generatedObjects[objectType].forEach((objectDraft) => {
      const row = template.sheets[objectType].headers.map(
        (header) =>
          objectDraft.fields.find((field) => field.key === header)?.value ?? "",
      );
      worksheet.addRow(row);
    });
  });

  const workbookBytes = Buffer.from(await workbook.xlsx.writeBuffer());
  const flattenedObjects = flattenMasterDataObjects(generatedObjects);
  const counts = summarizeMasterDataObjects(generatedObjects);
  const workbookFileName = `${slugify(project.projectName)}-master-data.xlsx`;
  const packageFileName = `${slugify(project.projectName)}-master-data-package.zip`;
  const warnings = Array.from(
    new Set(flattenedObjects.flatMap((objectDraft) => objectDraft.warnings)),
  );
  const summary: MasterDataExportSummary = {
    generatedAt,
    packageFileName,
    workbookFileName,
    objectCount: counts.objectCount,
    approvedCount: counts.approvedCount,
    needsReviewCount: counts.needsReviewCount,
    warnings,
  };

  const zip = new JSZip();
  zip.file(workbookFileName, workbookBytes);
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        project,
        summary,
        objects: flattenedObjects.map((objectDraft) => ({
          objectId: objectDraft.objectId,
          objectType: objectDraft.objectType,
          name: objectDraft.name,
          reviewStatus: objectDraft.reviewStatus,
          warnings: objectDraft.warnings,
        })),
        traceability,
      },
      null,
      2,
    ),
  );

  const packageBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6,
    },
  });

  return {
    fileName: packageFileName,
    packageBuffer,
    summary,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
