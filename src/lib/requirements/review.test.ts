import { describe, expect, it } from "vitest";
import {
  buildReviewRequirements,
  filterReviewRequirements,
  summarizeReviewRequirements,
  type ParsedRequirement,
  type ReviewRequirement,
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

function requirement(overrides: Partial<ReviewRequirement>): ReviewRequirement {
  return {
    ...baseRequirement,
    reviewStatus: "pending",
    ...overrides,
  };
}

describe("requirements review view model", () => {
  it("defaults every parsed requirement to pending without generated output", () => {
    const reviewRequirements = buildReviewRequirements([
      baseRequirement,
      requirement({
        sourceRowNumber: 4,
        requirementId: "01.02",
        sourceComment: "Another source comment.",
      }),
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
    expect(
      Object.prototype.hasOwnProperty.call(
        reviewRequirements[0] as unknown as Record<string, unknown>,
        "generatedComment",
      ),
    ).toBe(false);
  });

  it("filters all, demo, MVP, pending, review, and approved rows", () => {
    const requirements: ReviewRequirement[] = [
      requirement({ requirementId: "01.01", demo: true, demoRaw: "x" }),
      requirement({ requirementId: "01.02", mvp: true, mvpRaw: "X" }),
      requirement({ requirementId: "01.03", reviewStatus: "review" }),
      requirement({ requirementId: "01.04", reviewStatus: "approved" }),
    ];

    expect(filterReviewRequirements(requirements, "all")).toHaveLength(4);
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
  });

  it("summarizes review filter counts", () => {
    const requirements: ReviewRequirement[] = [
      requirement({ demo: true, demoRaw: "x", mvp: true, mvpRaw: "x" }),
      requirement({ mvp: true, mvpRaw: "X" }),
      requirement({ reviewStatus: "review" }),
      requirement({ reviewStatus: "approved" }),
    ];

    expect(summarizeReviewRequirements(requirements)).toEqual({
      allCount: 4,
      demoCount: 1,
      mvpCount: 2,
      pendingCount: 2,
      reviewCount: 1,
      approvedCount: 1,
    });
  });
});
