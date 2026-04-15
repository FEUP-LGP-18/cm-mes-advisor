import { describe, expect, it } from "vitest";
import {
  assessRequirementSupport,
  evaluateRequirementValidation,
  type ParsedRequirement,
} from ".";

const baseRequirement: ParsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch record review",
  l2Process: "Manufacturing Execution",
  l3Process: "Review by Exception",
  operation: "Batch review",
  demo: true,
  demoRaw: "x",
  detailDescriptionAndMotivation: "Consultants need a clear demo flow.",
  prioEms: "1",
  prioCws: "1",
  mvp: true,
  mvpRaw: "x",
  availability: "Available",
  availabilityCm: "Standard configuration",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel Comment feedback.",
};

const partialRequirement: ParsedRequirement = {
  ...baseRequirement,
  sourceRowNumber: 4,
  requirementId: "01.02",
  requirementDescription: "Support specialized customer approval workflow",
  availability: "Partially available",
  availabilityCm: "Custom workflow required",
  descriptionAvailability: "Can be supported with a workaround.",
  supportedPercent: "60%",
};

const unclearRequirement: ParsedRequirement = {
  ...baseRequirement,
  sourceRowNumber: 5,
  requirementId: "01.03",
  requirementDescription: "Support an uncertain future MES flow",
  availability: "To be confirmed",
  availabilityCm: "Needs documentation lookup",
  descriptionAvailability: "Awaiting consultant review.",
  supportedPercent: "",
};

const missingDescriptionRequirement: ParsedRequirement = {
  ...baseRequirement,
  sourceRowNumber: 6,
  requirementId: "01.04",
  requirementDescription: "",
  availability: "Needs review",
  availabilityCm: "Consultant review required",
  descriptionAvailability: "Description not provided.",
  supportedPercent: "",
};

describe("requirement validation", () => {
  it("treats standard rows as safe to approve", () => {
    const assessment = assessRequirementSupport(baseRequirement);
    const validation = evaluateRequirementValidation(
      baseRequirement,
      assessment,
    );

    expect(validation.signals).toEqual([]);
    expect(validation.isSafeToApprove).toBe(true);
    expect(validation.shouldConsultantReview).toBe(false);
    expect(validation.headline).toContain("No validation flags");
    expect(validation.guidance).toContain("safe to approve");
  });

  it("flags partial support rows with workaround-first and consultant-review signals", () => {
    const assessment = assessRequirementSupport(partialRequirement);
    const validation = evaluateRequirementValidation(
      partialRequirement,
      assessment,
    );

    expect(assessment.supportType).toBe("partial-or-custom");
    expect(validation.signals).toEqual([
      "partial-or-custom-support",
      "workaround-first",
      "consultant-review-needed",
      "do-not-blindly-approve",
    ]);
    expect(validation.isSafeToApprove).toBe(false);
    expect(validation.shouldConsultantReview).toBe(true);
    expect(validation.guidance).toContain("workaround-first");
    expect(validation.guidance).toContain("consultant review");
  });

  it("flags unclear rows as consultant-review rows without calling them unsupported", () => {
    const assessment = assessRequirementSupport(unclearRequirement);
    const validation = evaluateRequirementValidation(
      unclearRequirement,
      assessment,
    );

    expect(assessment.supportType).toBe("unclear");
    expect(validation.signals).toEqual([
      "low-or-unclear-support",
      "consultant-review-needed",
      "do-not-blindly-approve",
    ]);
    expect(validation.isSafeToApprove).toBe(false);
    expect(validation.headline).toContain("Consultant review needed");
    expect(validation.guidance).not.toMatch(/not supported/i);
  });

  it("flags missing descriptions with a do-not-approve signal", () => {
    const assessment = assessRequirementSupport(missingDescriptionRequirement);
    const validation = evaluateRequirementValidation(
      missingDescriptionRequirement,
      assessment,
    );

    expect(assessment.supportType).toBe("unclear");
    expect(validation.signals).toEqual([
      "missing-description",
      "low-or-unclear-support",
      "consultant-review-needed",
      "do-not-blindly-approve",
    ]);
    expect(validation.shouldConsultantReview).toBe(true);
    expect(validation.shouldNotBlindlyApprove).toBe(true);
    expect(validation.guidance).toContain("Fill in the requirement text");
  });
});
