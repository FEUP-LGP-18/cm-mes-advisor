import type { ParsedRequirement } from "./parser";
import type { RequirementSupportAssessment } from "./generation";

export type RequirementValidationSignal =
  | "missing-description"
  | "partial-or-custom-support"
  | "low-or-unclear-support"
  | "consultant-review-needed"
  | "do-not-blindly-approve"
  | "workaround-first";

export type RequirementValidationSeverity = "safe" | "attention" | "review";

export interface RequirementValidationSummary {
  signals: RequirementValidationSignal[];
  severity: RequirementValidationSeverity;
  headline: string;
  guidance: string;
  shouldConsultantReview: boolean;
  shouldNotBlindlyApprove: boolean;
  isSafeToApprove: boolean;
}

export const requirementValidationSignalLabels: Record<
  RequirementValidationSignal,
  string
> = {
  "missing-description": "Missing description",
  "partial-or-custom-support": "Partial/custom support",
  "low-or-unclear-support": "Low or unclear support",
  "consultant-review-needed": "Consultant review needed",
  "do-not-blindly-approve": "Do not blindly approve",
  "workaround-first": "Workaround first",
};

export function evaluateRequirementValidation(
  requirement: Pick<ParsedRequirement, "requirementDescription">,
  assessment: RequirementSupportAssessment,
): RequirementValidationSummary {
  const hasDescription = requirement.requirementDescription.trim().length > 0;

  if (!hasDescription) {
    return {
      signals: [
        "missing-description",
        "low-or-unclear-support",
        "consultant-review-needed",
        "do-not-blindly-approve",
      ],
      severity: "review",
      headline: "Missing requirement description",
      guidance:
        "Fill in the requirement text, keep the row in consultant review, and avoid approving it blindly until the description is clarified.",
      shouldConsultantReview: true,
      shouldNotBlindlyApprove: true,
      isSafeToApprove: false,
    };
  }

  if (assessment.supportType === "partial-or-custom") {
    return {
      signals: [
        "partial-or-custom-support",
        "workaround-first",
        "consultant-review-needed",
        "do-not-blindly-approve",
      ],
      severity: "attention",
      headline: "Workaround-first path available",
      guidance:
        "Lead with the closest standard MES flow, keep the explanation workaround-first, and leave the row in consultant review until the exact demo path is confirmed.",
      shouldConsultantReview: true,
      shouldNotBlindlyApprove: true,
      isSafeToApprove: false,
    };
  }

  if (assessment.supportType === "unclear") {
    return {
      signals: [
        "low-or-unclear-support",
        "consultant-review-needed",
        "do-not-blindly-approve",
      ],
      severity: "review",
      headline: "Consultant review needed",
      guidance:
        "The mock heuristic cannot confirm a reliable MES path, so keep this row in consultant review until a consultant or documentation lookup confirms the demo flow.",
      shouldConsultantReview: true,
      shouldNotBlindlyApprove: true,
      isSafeToApprove: false,
    };
  }

  return {
    signals: [],
    severity: "safe",
    headline: "No validation flags",
    guidance:
      "The mock heuristic sees a standard or configuration path, so this row looks safe to approve for the current Phase 1 slice.",
    shouldConsultantReview: false,
    shouldNotBlindlyApprove: false,
    isSafeToApprove: true,
  };
}
