import { describe, expect, it } from "vitest";
import { analyzeMasterDataApplicability } from "./analysis";
import type { MasterDataAnalyzeRequestBody } from "./api";

const requirements: MasterDataAnalyzeRequestBody["requirements"] = [
  {
    availability: "Available",
    availabilityCm: "Standard",
    consultantComment: "Product setup must be demoable.",
    demo: true,
    demoRaw: "x",
    descriptionAvailability: "Supported",
    detailDescriptionAndMotivation: "Needs product creation and material setup.",
    l2Process: "Production",
    l3Process: "Product setup",
    mvp: true,
    mvpRaw: "x",
    operation: "Setup",
    prioCws: "1",
    prioEms: "1",
    requirementDescription: "Quick Product setup",
    requirementId: "03.01",
    requirementKey: "28:03.01",
    reviewNote: "",
    reviewStatus: "approved",
    sourceComment: "Product and material should exist for the demo.",
    sourceRowNumber: 28,
    supportedPercent: "100%",
  },
  {
    availability: "Available",
    availabilityCm: "Standard",
    consultantComment: "",
    demo: true,
    demoRaw: "x",
    descriptionAvailability: "Supported",
    detailDescriptionAndMotivation:
      "Traceability should show serial, batch, and packing relationships.",
    l2Process: "Execution",
    l3Process: "Traceability",
    mvp: false,
    mvpRaw: "",
    operation: "Packing",
    prioCws: "1",
    prioEms: "1",
    requirementDescription: "Operation tracing - SN - Batch - SN",
    requirementId: "06.04",
    requirementKey: "72:06.04",
    reviewNote: "",
    reviewStatus: "review",
    sourceComment: "",
    sourceRowNumber: 72,
    supportedPercent: "80%",
  },
];

describe("analyzeMasterDataApplicability", () => {
  it("suggests object types and preselects approved requirements", () => {
    const result = analyzeMasterDataApplicability({
      approvedRequirementKeys: ["28:03.01"],
      requirements,
    });

    expect(result.applicableRequirements).toHaveLength(1);
    expect(result.applicableRequirements[0]).toMatchObject({
      preselected: true,
      requirementKey: "28:03.01",
    });
    expect(result.suggestedObjectTypes).toEqual(
      expect.arrayContaining(["product", "material"]),
    );
  });

  it("returns a guidance warning when no Phase 1 rows are approved yet", () => {
    const result = analyzeMasterDataApplicability({
      approvedRequirementKeys: [],
      requirements,
    });

    expect(result.applicableRequirements).toEqual([]);
    expect(result.suggestedObjectTypes).toEqual([]);
    expect(result.warnings).toEqual([
      "Approve at least one Phase 1 row before starting Phase 2. Master Data setup only analyzes the approved consultant slice.",
    ]);
  });
});
