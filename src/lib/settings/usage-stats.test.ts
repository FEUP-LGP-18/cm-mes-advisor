import { describe, expect, it } from "vitest";
import { computeSettingsUsageStats } from "./usage-stats";

describe("settings usage stats contract", () => {
  it("computes only metrics backed by provided project and requirement data", () => {
    expect(
      computeSettingsUsageStats({
        projects: [
          {
            phase1CurrentStep: "export",
            status: "active",
            updatedAt: "2026-01-02T10:00:00.000Z",
          },
          {
            phase1CurrentStep: "review",
            status: "archived",
            updatedAt: "2026-01-03T10:00:00.000Z",
          },
          {
            phase1CurrentStep: "source",
            status: "deleted",
            updatedAt: "2026-01-04T10:00:00.000Z",
          },
        ],
        requirements: [
          {
            generatedOutput: { hasGeneratedOutput: true },
            reviewStatus: "approved",
            updatedAt: "2026-01-05T10:00:00.000Z",
          },
          {
            generatedOutput: { hasGeneratedOutput: false },
            reviewStatus: "review",
            updatedAt: "invalid",
          },
        ],
      }),
    ).toEqual({
      activeProjectCount: 1,
      approvedRows: 1,
      archivedProjectCount: 1,
      completedProjectCount: 1,
      generatedRows: 1,
      lastUpdatedAt: "2026-01-05T10:00:00.000Z",
      projectCount: 2,
      requirementsProcessed: 2,
      unsupportedMetrics: {
        aiAccuracy: "unsupported-without-evaluation-data",
        exportCount: "unsupported-without-durable-export-tracking",
        hoursSaved: "unsupported-without-time-tracking",
      },
    });
  });

  it("does not invent unavailable about-page metrics", () => {
    expect(computeSettingsUsageStats({})).toEqual({
      activeProjectCount: null,
      approvedRows: null,
      archivedProjectCount: null,
      completedProjectCount: null,
      generatedRows: null,
      lastUpdatedAt: null,
      projectCount: null,
      requirementsProcessed: null,
      unsupportedMetrics: {
        aiAccuracy: "unsupported-without-evaluation-data",
        exportCount: "unsupported-without-durable-export-tracking",
        hoursSaved: "unsupported-without-time-tracking",
      },
    });
  });
});
