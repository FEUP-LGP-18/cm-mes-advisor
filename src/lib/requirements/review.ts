import type { ParsedRequirement } from "./parser";

export type RequirementReviewStatus = "pending" | "review" | "approved";

export type RequirementReviewFilter =
  | "all"
  | "demo"
  | "mvp"
  | "pending"
  | "review"
  | "approved";

export interface ReviewRequirement extends ParsedRequirement {
  reviewStatus: RequirementReviewStatus;
}

export interface RequirementsReviewSummary {
  allCount: number;
  demoCount: number;
  mvpCount: number;
  pendingCount: number;
  reviewCount: number;
  approvedCount: number;
}

export const requirementReviewFilters: RequirementReviewFilter[] = [
  "all",
  "demo",
  "mvp",
  "pending",
  "review",
  "approved",
];

export function buildReviewRequirements(
  requirements: ParsedRequirement[],
): ReviewRequirement[] {
  return requirements.map((requirement) => ({
    ...requirement,
    reviewStatus: "pending",
  }));
}

export function filterReviewRequirements(
  requirements: ReviewRequirement[],
  filter: RequirementReviewFilter,
): ReviewRequirement[] {
  switch (filter) {
    case "all":
      return requirements;
    case "demo":
      return requirements.filter((requirement) => requirement.demo);
    case "mvp":
      return requirements.filter((requirement) => requirement.mvp);
    case "pending":
    case "review":
    case "approved":
      return requirements.filter(
        (requirement) => requirement.reviewStatus === filter,
      );
  }
}

export function summarizeReviewRequirements(
  requirements: ReviewRequirement[],
): RequirementsReviewSummary {
  return {
    allCount: requirements.length,
    demoCount: filterReviewRequirements(requirements, "demo").length,
    mvpCount: filterReviewRequirements(requirements, "mvp").length,
    pendingCount: filterReviewRequirements(requirements, "pending").length,
    reviewCount: filterReviewRequirements(requirements, "review").length,
    approvedCount: filterReviewRequirements(requirements, "approved").length,
  };
}
