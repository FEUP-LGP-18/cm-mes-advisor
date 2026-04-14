import { describe, expect, it } from "vitest";
import {
  buildReviewRequirements,
  createDefaultRequirementReviewEntry,
  createRequirementsReviewState,
  filterReviewRequirements,
  getRequirementReviewKey,
  summarizeReviewRequirements,
  updateRequirementsReviewState,
  type ParsedRequirement,
  type ReviewRequirement,
  type ReviewProjectMetadata,
} from ".";

const baseRequirement: ParsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "UI supporting local language",
  l2Process: "General",
  l3Process: "Localization",
  operation: "",
  demo: false,
  demoRaw: "",
  detailDescriptionAndMotivation: "Consultants need traceable source data.",
  prioEms: "1",
  prioCws: "2",
  mvp: false,
  mvpRaw: "",
  availability: "Available",
  availabilityCm: "Standard",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel Comment feedback.",
};

const projectMetadata: ReviewProjectMetadata = {
  projectId: "customer-x-fixture",
  projectName: "Customer X Demo",
  customerName: "Customer X",
  sourceFilename: "fixtures/customer-x-functional-requirements.xlsx",
  sourceRowCount: 167,
};

function requirement(overrides: Partial<ReviewRequirement>): ReviewRequirement {
  return {
    ...baseRequirement,
    requirementKey: getRequirementReviewKey(baseRequirement),
    reviewStatus: "pending",
    consultantComment: "",
    reviewNote: "",
    generatedOutput: {
      hasGeneratedOutput: false,
      generatedCommentDraft: null,
      demoStepsDraft: [],
    },
    ...overrides,
  };
}

describe("requirements review view model", () => {
  it("defaults every parsed requirement to pending with local review placeholders", () => {
    const reviewRequirements = buildReviewRequirements([
      baseRequirement,
      {
        ...baseRequirement,
        sourceRowNumber: 4,
        requirementId: "01.02",
        sourceComment: "Another source comment.",
      },
    ]);

    expect(reviewRequirements).toHaveLength(2);
    expect(
      reviewRequirements.every(
        (reviewRequirement) => reviewRequirement.reviewStatus === "pending",
      ),
    ).toBe(true);
    expect(reviewRequirements[0]?.sourceComment).toBe(
      "Existing Excel Comment feedback.",
    );
    expect(reviewRequirements[0]).toMatchObject({
      requirementKey: "3:01.01",
      consultantComment: "",
      reviewNote: "",
      generatedOutput: {
        hasGeneratedOutput: false,
        generatedCommentDraft: null,
        demoStepsDraft: [],
      },
    });
  });

  it("merges local review state without overwriting source comments", () => {
    const reviewRequirements = buildReviewRequirements([baseRequirement], {
      [getRequirementReviewKey(baseRequirement)]: {
        ...createDefaultRequirementReviewEntry(baseRequirement),
        reviewStatus: "approved",
        consultantComment: "Manual consultant note.",
        reviewNote: "Validated during review.",
      },
    });

    expect(reviewRequirements[0]).toMatchObject({
      reviewStatus: "approved",
      consultantComment: "Manual consultant note.",
      reviewNote: "Validated during review.",
      sourceComment: "Existing Excel Comment feedback.",
    });
  });

  it("filters all, demo, MVP, pending, review, approved, and skipped rows", () => {
    const requirements: ReviewRequirement[] = [
      requirement({ requirementId: "01.01", demo: true, demoRaw: "x" }),
      requirement({ requirementId: "01.02", mvp: true, mvpRaw: "X" }),
      requirement({ requirementId: "01.03", reviewStatus: "review" }),
      requirement({ requirementId: "01.04", reviewStatus: "approved" }),
      requirement({ requirementId: "01.05", reviewStatus: "skipped" }),
    ];

    expect(filterReviewRequirements(requirements, "all")).toHaveLength(5);
    expect(filterReviewRequirements(requirements, "demo")).toEqual([
      requirements[0],
    ]);
    expect(filterReviewRequirements(requirements, "mvp")).toEqual([
      requirements[1],
    ]);
    expect(filterReviewRequirements(requirements, "pending")).toEqual([
      requirements[0],
      requirements[1],
    ]);
    expect(filterReviewRequirements(requirements, "review")).toEqual([
      requirements[2],
    ]);
    expect(filterReviewRequirements(requirements, "approved")).toEqual([
      requirements[3],
    ]);
    expect(filterReviewRequirements(requirements, "skipped")).toEqual([
      requirements[4],
    ]);
  });

  it("summarizes review filter counts", () => {
    const requirements: ReviewRequirement[] = [
      requirement({ demo: true, demoRaw: "x", mvp: true, mvpRaw: "x" }),
      requirement({ mvp: true, mvpRaw: "X" }),
      requirement({ reviewStatus: "review" }),
      requirement({ reviewStatus: "approved" }),
      requirement({ reviewStatus: "skipped" }),
    ];

    expect(summarizeReviewRequirements(requirements)).toEqual({
      allCount: 5,
      demoCount: 1,
      mvpCount: 2,
      pendingCount: 2,
      reviewCount: 1,
      approvedCount: 1,
      skippedCount: 1,
    });
  });

  it("updates local review state with approve, flag, skip, edit, and reset actions", () => {
    const editedState = updateRequirementsReviewState(
      createRequirementsReviewState(projectMetadata),
      baseRequirement,
      {
        type: "edit",
        consultantComment: "Use Rui's workaround guidance here.",
        reviewNote: "Needs a consultant to confirm the exact MES screen.",
      },
    );
    const flaggedState = updateRequirementsReviewState(
      editedState,
      baseRequirement,
      { type: "flag" },
    );
    const approvedState = updateRequirementsReviewState(
      flaggedState,
      baseRequirement,
      { type: "approve" },
    );
    const skippedState = updateRequirementsReviewState(
      approvedState,
      baseRequirement,
      { type: "skip" },
    );
    const resetState = updateRequirementsReviewState(
      skippedState,
      baseRequirement,
      { type: "resetToDraft" },
    );
    const requirementKey = getRequirementReviewKey(baseRequirement);

    expect(editedState.requirements[requirementKey]).toMatchObject({
      reviewStatus: "pending",
      consultantComment: "Use Rui's workaround guidance here.",
      reviewNote: "Needs a consultant to confirm the exact MES screen.",
    });
    expect(flaggedState.requirements[requirementKey]?.reviewStatus).toBe(
      "review",
    );
    expect(approvedState.requirements[requirementKey]?.reviewStatus).toBe(
      "approved",
    );
    expect(skippedState.requirements[requirementKey]?.reviewStatus).toBe(
      "skipped",
    );
    expect(resetState.requirements[requirementKey]).toMatchObject({
      reviewStatus: "pending",
      consultantComment: "",
      reviewNote: "",
      generatedOutput: {
        hasGeneratedOutput: false,
        generatedCommentDraft: null,
        demoStepsDraft: [],
      },
    });
  });
});
