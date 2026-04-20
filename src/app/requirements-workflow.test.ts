import { describe, expect, it } from "vitest";
import {
  getNextAction,
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
  it("starts by confirming the source when no rows exist", () => {
    const snapshot = { ...baseSnapshot, sourceRowCount: 0, demoCount: 0 };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("source");
    expect(getNextAction(snapshot).label).toBe("Confirm the workbook");
  });

  it("recommends generation after a source is loaded", () => {
    expect(getRecommendedWorkflowStep(baseSnapshot)).toBe("generate");
    expect(getNextAction(baseSnapshot)).toMatchObject({
      step: "generate",
      label: "Generate drafts for demo rows",
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

  it("recommends script before export once approved script steps exist", () => {
    const snapshot = {
      ...baseSnapshot,
      generatedCount: 4,
      generatedReviewableCount: 0,
      approvedCount: 4,
      approvedStepCount: 10,
      exportReady: true,
    };

    expect(getRecommendedWorkflowStep(snapshot)).toBe("script");
    expect(getNextAction(snapshot)).toMatchObject({
      step: "script",
      label: "Shape the assembled demo script",
    });
    expect(getWorkflowProgress(snapshot)).toContainEqual({
      step: "script",
      label: "Script",
      status: "complete",
    });
  });

  it("recommends export after the script step has been visited", () => {
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
      label: "Download the Phase 1 deliverable",
    });
  });
});
