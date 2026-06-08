import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createEmptyMasterDataObjectMap,
  createInitialMasterDataPhase2State,
  type MasterDataDraftObject,
  type MasterDataObjectType,
} from "@/lib/master-data/types";
import MasterDataReviewStudio from "./master-data-review-studio";

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

function createObject(
  objectType: MasterDataObjectType,
  objectId: string,
  name: string,
  reviewStatus: MasterDataDraftObject["reviewStatus"] = "pending",
): MasterDataDraftObject {
  return {
    confidence: {
      level: "medium",
      rationale: "Generated from the approved Phase 1 slice.",
    },
    fields: [
      {
        key: "name",
        label: "Name",
        modified: false,
        required: true,
        source: "requirement",
        value: name,
        warning: null,
      },
    ],
    modified: false,
    name,
    objectId,
    objectType,
    reviewStatus,
    sheetName: `<DM>${objectType}`,
    sourceRequirementIds: ["03.01"],
    sourceRequirementKeys: ["28:03.01"],
    sourceRowNumbers: [28],
    warnings: [],
  };
}

describe("MasterDataReviewStudio", () => {
  it("separates object navigation from review decisions and shows object progress", () => {
    const generatedObjects = createEmptyMasterDataObjectMap();
    generatedObjects.enterprise = [
      createObject("enterprise", "enterprise-1", "Customer X"),
    ];
    generatedObjects.site = [
      createObject("site", "site-1", "Lisbon Site", "approved"),
      createObject("site", "site-2", "Porto Site"),
    ];
    const phase2 = {
      ...createInitialMasterDataPhase2State(),
      active: true,
      currentStep: "review" as const,
      generatedObjects,
    };
    const html = render(
      <MasterDataReviewStudio
        onOpenExport={vi.fn()}
        onReturnToProcess={vi.fn()}
        onUpdateField={vi.fn()}
        onUpdateReviewStatus={vi.fn()}
        phase2={phase2}
      />,
    );

    expect(html).toContain("1 of 3");
    expect(html).toContain("Approve");
    expect(html).toContain("Lisbon Site");
    expect(html).toContain("Porto Site");
  });

  it("opens the first object that still needs a decision after a partial review", () => {
    const generatedObjects = createEmptyMasterDataObjectMap();
    generatedObjects.enterprise = [
      createObject("enterprise", "enterprise-1", "Customer X", "approved"),
    ];
    generatedObjects.site = [
      createObject("site", "site-1", "Lisbon Site", "pending"),
    ];
    const phase2 = {
      ...createInitialMasterDataPhase2State(),
      active: true,
      currentStep: "review" as const,
      generatedObjects,
    };
    const html = render(
      <MasterDataReviewStudio
        onOpenExport={vi.fn()}
        onReturnToProcess={vi.fn()}
        onUpdateField={vi.fn()}
        onUpdateReviewStatus={vi.fn()}
        phase2={phase2}
      />,
    );

    expect(html).toContain("Lisbon Site");
    expect(html).toContain("2 of 2");
  });

  it("renders duplicate visible requirement IDs without using them as identity", () => {
    const generatedObjects = createEmptyMasterDataObjectMap();
    const object = createObject("enterprise", "enterprise-1", "Customer X");
    object.sourceRequirementIds = ["05.03", "05.03"];
    object.sourceRequirementKeys = ["22:05.03", "23:05.03"];
    object.sourceRowNumbers = [22, 23];
    generatedObjects.enterprise = [object];
    const phase2 = {
      ...createInitialMasterDataPhase2State(),
      active: true,
      currentStep: "review" as const,
      generatedObjects,
    };
    const html = render(
      <MasterDataReviewStudio
        onOpenExport={vi.fn()}
        onReturnToProcess={vi.fn()}
        onUpdateField={vi.fn()}
        onUpdateReviewStatus={vi.fn()}
        phase2={phase2}
      />,
    );

    expect(html.match(/05\.03/g)).toHaveLength(2);
    expect(html).toContain("Source Requirements (2)");
  });
});
