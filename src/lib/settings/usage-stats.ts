import type { RequirementReviewStatus } from "@/lib/requirements/review";

export interface UsageStatsProjectLike {
  phase1CurrentStep?: string | null;
  status?: "active" | "archived" | "deleted" | null;
  updatedAt?: string | null;
}

export interface UsageStatsRequirementLike {
  generatedOutput?: {
    hasGeneratedOutput?: boolean;
  } | null;
  reviewStatus?: RequirementReviewStatus | null;
  updatedAt?: string | null;
}

export interface SettingsUsageStatsInput {
  projects?: readonly UsageStatsProjectLike[] | null;
  requirements?: readonly UsageStatsRequirementLike[] | null;
}

export interface SettingsUsageStats {
  activeProjectCount: number | null;
  approvedRows: number | null;
  archivedProjectCount: number | null;
  completedProjectCount: number | null;
  generatedRows: number | null;
  lastUpdatedAt: string | null;
  projectCount: number | null;
  requirementsProcessed: number | null;
  unsupportedMetrics: {
    aiAccuracy: "unsupported-without-evaluation-data";
    exportCount: "unsupported-without-durable-export-tracking";
    hoursSaved: "unsupported-without-time-tracking";
  };
}

export function computeSettingsUsageStats(
  input: SettingsUsageStatsInput,
): SettingsUsageStats {
  const projects = input.projects ?? null;
  const requirements = input.requirements ?? null;
  const nonDeletedProjects = projects?.filter(
    (project) => project.status !== "deleted",
  );

  return {
    activeProjectCount: nonDeletedProjects
      ? nonDeletedProjects.filter((project) => project.status !== "archived")
          .length
      : null,
    approvedRows: requirements
      ? requirements.filter((requirement) => requirement.reviewStatus === "approved")
          .length
      : null,
    archivedProjectCount: nonDeletedProjects
      ? nonDeletedProjects.filter((project) => project.status === "archived")
          .length
      : null,
    completedProjectCount: nonDeletedProjects
      ? nonDeletedProjects.filter(
          (project) => project.phase1CurrentStep === "export",
        ).length
      : null,
    generatedRows: requirements
      ? requirements.filter(
          (requirement) =>
            requirement.generatedOutput?.hasGeneratedOutput === true,
        ).length
      : null,
    lastUpdatedAt: findLatestTimestamp([
      ...(projects ?? []).map((project) => project.updatedAt),
      ...(requirements ?? []).map((requirement) => requirement.updatedAt),
    ]),
    projectCount: nonDeletedProjects ? nonDeletedProjects.length : null,
    requirementsProcessed: requirements ? requirements.length : null,
    unsupportedMetrics: {
      aiAccuracy: "unsupported-without-evaluation-data",
      exportCount: "unsupported-without-durable-export-tracking",
      hoursSaved: "unsupported-without-time-tracking",
    },
  };
}

function findLatestTimestamp(values: Array<string | null | undefined>) {
  const latest = values
    .flatMap((value) => {
      if (typeof value !== "string") {
        return [];
      }

      const time = Date.parse(value);
      return Number.isFinite(time) ? [{ time, value }] : [];
    })
    .sort((left, right) => right.time - left.time)[0];

  return latest?.value ?? null;
}
