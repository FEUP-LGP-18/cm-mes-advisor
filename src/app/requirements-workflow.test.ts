import { describe, expect, it } from "vitest";
import {
  getAllowedWorkflowStep,
  getNextAction,
  getLegacyPhase1StepRedirectPath,
  getRecommendedWorkflowStep,
  getWorkflowProgress,
  type GuidedWorkflowSnapshot,
} from "./requirements-workflow";

const baseSnapshot: GuidedWorkflowSnapshot = {
  sourceRowCount: 167,
  demoCount: 29,
  mvpCount: 54,
  generatedCount: 0,
  generatedReviewableCount: 0,
  approvedCount: 0,
  approvedStepCount: 0,
  selectedCount: 0,
  scriptVisited: false,
  exportReady: false,
};

describe("guided requirements workflow", () => {
  it("starts in source when no source rows exist", () => {
    const snapshot = { ...baseSnapshot, sourceRowCount: 0, demoCount: 0 };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("source");
    expect(getNextAction(snapshot).label).toBe("Confirm the workbook");
  });

  it("moves to generate once the workbook exists but no drafts are available", () => {
    expect(getRecommendedWorkflowStep(baseSnapshot)).toBe("generate");
    expect(getNextAction(baseSnapshot)).toMatchObject({
      step: "generate",
      label: "Generate the recommended draft",
    });
  });

  it("recommends review while generated rows still need decisions", () => {
    const snapshot = {
      ...baseSnapshot,
      generatedCount: 12,
      generatedReviewableCount: 12,
    };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("review");
    expect(getNextAction(snapshot).helper).toContain("12 generated rows");
  });

  it("moves to script once approvals exist but the narrative has not been reviewed yet", () => {
    const snapshot = {
      ...baseSnapshot,
      generatedCount: 4,
      generatedReviewableCount: 0,
      approvedCount: 4,
      approvedStepCount: 10,
      scriptVisited: false,
      exportReady: false,
    };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("script");
    expect(getNextAction(snapshot)).toMatchObject({
      step: "script",
      label: "Shape the narrative",
    });
    expect(getWorkflowProgress(snapshot)).toContainEqual({
      step: "review",
      label: "Review",
      subtitle: "Consultant decisions",
      status: "complete",
      statusLabel: "Review complete",
    });
    expect(getAllowedWorkflowStep(snapshot, "export")).toBe("script");
  });

  it("allows export once the handoff is ready even before script is visited", () => {
    const snapshot = {
      ...baseSnapshot,
      generatedCount: 4,
      generatedReviewableCount: 0,
      approvedCount: 4,
      approvedStepCount: 10,
      scriptVisited: false,
      exportReady: true,
    };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("script");
    expect(getAllowedWorkflowStep(snapshot, "export")).toBe("export");
    expect(getWorkflowProgress(snapshot)).toContainEqual({
      step: "export",
      label: "Export",
      subtitle: "Download handoff",
      status: "ready",
      statusLabel: "Export ready",
    });
  });

  it("opens export once script work is visited and the handoff is ready", () => {
    const snapshot = {
      ...baseSnapshot,
      generatedCount: 4,
      generatedReviewableCount: 0,
      approvedCount: 4,
      approvedStepCount: 10,
      scriptVisited: true,
      exportReady: true,
    };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("export");
    expect(getNextAction(snapshot)).toMatchObject({
      step: "export",
      label: "Download Markdown handoff",
    });
    expect(getWorkflowProgress(snapshot)).toContainEqual({
      step: "export",
      label: "Export",
      subtitle: "Download handoff",
      status: "ready",
      statusLabel: "Export ready",
    });
  });

  it("keeps the five primary routes stable and resolves setup/handoff compatibility paths", () => {
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "source"),
    ).toBe("/projects/customer-x-fixture/source");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "generate"),
    ).toBe("/projects/customer-x-fixture/generate");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "script"),
    ).toBe("/projects/customer-x-fixture/script");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "export"),
    ).toBe("/projects/customer-x-fixture/export");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "setup", {
        ...baseSnapshot,
        sourceRowCount: 0,
      }),
    ).toBe("/projects/customer-x-fixture/source");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "setup", baseSnapshot),
    ).toBe("/projects/customer-x-fixture/generate");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "handoff", {
        ...baseSnapshot,
        generatedCount: 4,
        generatedReviewableCount: 0,
        approvedCount: 2,
        approvedStepCount: 6,
        scriptVisited: true,
        exportReady: false,
      }),
    ).toBe("/projects/customer-x-fixture/script");
    expect(
      getLegacyPhase1StepRedirectPath("customer-x-fixture", "handoff", {
        ...baseSnapshot,
        generatedCount: 4,
        generatedReviewableCount: 0,
        approvedCount: 2,
        approvedStepCount: 6,
        scriptVisited: true,
        exportReady: true,
      }),
    ).toBe("/projects/customer-x-fixture/export");
  });
});
