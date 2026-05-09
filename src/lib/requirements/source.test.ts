import { describe, expect, it } from "vitest";
import {
  createDisplayNameFromFilename,
  createUploadSourceMetadata,
  createWorkbookSourceIdentity,
} from ".";

describe("requirements source metadata", () => {
  it("derives stable identities from the uploaded workbook bytes", () => {
    const firstBytes = new Uint8Array([1, 2, 3, 4]);
    const secondBytes = new Uint8Array([1, 2, 3, 5]);

    expect(
      createWorkbookSourceIdentity("Customer X Requirements.xlsx", firstBytes),
    ).toBe(
      createWorkbookSourceIdentity("Customer X Requirements.xlsx", firstBytes),
    );
    expect(
      createWorkbookSourceIdentity("Customer X Requirements.xlsx", firstBytes),
    ).not.toBe(
      createWorkbookSourceIdentity("Customer X Requirements.xlsx", secondBytes),
    );
  });

  it("creates upload metadata without exposing raw workbook bytes", () => {
    const metadata = createUploadSourceMetadata(
      "Customer X Requirements.xlsx",
      new Uint8Array([9, 8, 7, 6]),
    );

    expect(metadata).toMatchObject({
      sourceKind: "upload",
      sourceFilename: "Customer X Requirements.xlsx",
      projectName: "Customer X Requirements",
      customerName: "Customer X Requirements",
    });
    expect(metadata.sourceLabel).toContain("Customer X Requirements.xlsx");
    expect(metadata.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("can bind uploaded source metadata to a server project identity", () => {
    const metadata = createUploadSourceMetadata(
      "Customer X Requirements.xlsx",
      new Uint8Array([9, 8, 7, 6]),
      {
        customerName: "Customer X",
        projectName: "Customer X MES demo",
        sourceId:
          "db-backed://projects/22222222-2222-4222-8222-222222222222/source/source.xlsx",
        uploadedAt: "2026-05-10T12:00:00.000Z",
      },
    );

    expect(metadata).toMatchObject({
      customerName: "Customer X",
      projectName: "Customer X MES demo",
      sourceId:
        "db-backed://projects/22222222-2222-4222-8222-222222222222/source/source.xlsx",
      uploadedAt: "2026-05-10T12:00:00.000Z",
    });
  });

  it("creates a readable display name from the filename", () => {
    expect(
      createDisplayNameFromFilename("customer-x-functional-requirements.xlsx"),
    ).toBe("Customer X Functional Requirements");
    expect(createDisplayNameFromFilename(".xlsx")).toBe("Uploaded workbook");
  });
});
