import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  assembleDemoScript,
  createDefaultDemoScriptDraft,
  filterReviewRequirements,
  mockGenerationStageLabels,
} from "@/lib/requirements";
import {
  createPhase1UiFixtureProjectRecord,
  createPhase1UiFixtureReviewQueue,
  createPhase1UiFixtureReviewRequirements,
  createPhase1UiFixtureSource,
  phase1UiFixtureBlockedRealAvailability,
  phase1UiFixtureProjectMetadata,
} from "@/lib/phase1/ui-fixtures";
import { getNextAction, getWorkflowProgress } from "@/lib/phase1/workflow";
import ExportStudio from "./export-studio";
import GenerateStudio from "./generate-studio";
import { ProjectCommandDesk } from "./project-home";
import Phase1ProjectShell from "./project-shell";
import ReviewStudio from "./review-studio";
import ScriptStudio from "./script-studio";
import SourceStudio from "./source-studio";

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

function createProjectRecord() {
  return createPhase1UiFixtureProjectRecord({
    currentStep: "review",
  });
}

describe("phase 1 redesigned surfaces", () => {
  it("renders the command desk empty state with one blunt starting action", () => {
    const html = render(
      <ProjectCommandDesk
        activeProject={null}
        canCreateSampleProject
        onCreateSampleProject={vi.fn()}
        onOpenProject={vi.fn()}
        onQueryChange={vi.fn()}
        onSortChange={vi.fn()}
        projects={[]}
        query=""
        sort="recent"
      />,
    );

    expect(html).toContain("Start with a sample project and walk the full Phase 1 flow.");
    expect(html).toContain("Start sample project");
  });

  it("renders the priority strip and table-first project desk for active work", () => {
    const baseProject = createProjectRecord();
    const project = {
      ...baseProject,
      currentStep: "review" as const,
      snapshot: {
        ...baseProject.snapshot,
        generatedCount: 2,
        generatedReviewableCount: 2,
      },
    };
    const html = render(
      <ProjectCommandDesk
        activeProject={project}
        canCreateSampleProject
        onCreateSampleProject={vi.fn()}
        onOpenProject={vi.fn()}
        onQueryChange={vi.fn()}
        onSortChange={vi.fn()}
        projects={[project]}
        query=""
        sort="recent"
      />,
    );

    expect(html).toContain("Priority project");
    expect(html).toContain("Resume project");
    expect(html).toContain("Project list");
    expect(html).toContain("Needs review");
  });

  it("renders the compact shell metadata strip for a project workspace", () => {
    const baseProject = createProjectRecord();
    const project = {
      ...baseProject,
      currentStep: "review" as const,
      snapshot: {
        ...baseProject.snapshot,
        generatedCount: 2,
        generatedReviewableCount: 2,
        approvedCount: 1,
      },
    };
    const html = render(
      <Phase1ProjectShell
        currentStep="review"
        nextAction={getNextAction(project.snapshot)}
        progress={getWorkflowProgress(project.snapshot)}
        project={project}
      >
        <div>Child surface</div>
      </Phase1ProjectShell>,
    );

    expect(html).toContain("Workbook");
    expect(html).toContain("Next action");
    expect(html).toContain("Pending review");
    expect(html).toContain("Approved");
    expect(html).toContain("Consultant decisions");
  });

  it("renders source as a dedicated workbook confirmation surface", () => {
    const source = createPhase1UiFixtureSource();
    const requirements = createPhase1UiFixtureReviewRequirements({});
    const html = render(
      <SourceStudio
        currentSourceMetadata={source}
        demoCount={1}
        mvpCount={1}
        onContinue={vi.fn()}
        onRestoreFixtureSource={vi.fn()}
        onUploadWorkbook={async () => false}
        requirements={requirements}
        sourceFeedback={null}
        sourceRowCount={requirements.length}
      />,
    );

    expect(html).toContain("Upload the workbook for this run");
    expect(html).toContain("Upload .xlsx workbook");
    expect(html).toContain("Continue to Generate");
    expect(html).toContain("Before you continue");
    expect(html).toContain("Parsed preview");
  });

  it("renders generate with the row explorer and recommended draft rail", () => {
    const source = createPhase1UiFixtureSource();
    const requirements = createPhase1UiFixtureReviewRequirements({});
    const html = render(
      <GenerateStudio
        demoRequirements={filterReviewRequirements(requirements, "demo")}
        generatedCount={1}
        generationFeedback={{
          tone: "success",
          message: "Draft generation completed for the recommended slice.",
        }}
        initialGenerationAvailability={phase1UiFixtureBlockedRealAvailability}
        isGenerating={false}
        lastGenerationMode="real"
        mockGenerationRun={{
          generatedCount: 1,
          selectedCount: 1,
          stages: mockGenerationStageLabels.map((label) => ({
            label,
            status: "complete",
          })),
        }}
        onGenerateRows={async () => true}
        onOpenReview={vi.fn()}
        requirements={requirements}
      />,
    );

    expect(source.sourceKind).toBe("fixture");
    expect(html).toContain("Run the recommended slice first.");
    expect(html).toContain("Generate recommended draft");
    expect(html).toContain("Row explorer and slice selection");
    expect(html).toContain("Recheck real access");
    expect(html).toContain("Open review queue");
    expect(html).toContain("The last successful run used grounded generation.");
  });

  it("renders the review blocker when generation has not started", () => {
    const requirements = createPhase1UiFixtureReviewRequirements({});
    const html = render(
      <ReviewStudio
        approvedCount={0}
        generatedCount={0}
        generatedReviewableRequirements={[]}
        onGenerateDemoRows={async () => false}
        onGoToGenerate={vi.fn()}
        onOpenScript={vi.fn()}
        onReviewAction={vi.fn()}
        projectId={phase1UiFixtureProjectMetadata.projectId}
        reviewRequirements={requirements}
      />,
    );

    expect(html).toContain("Generate drafts before review");
    expect(html).toContain("Generate demo rows now");
  });

  it("renders the review queue studio with the current requirement and shortcuts", () => {
    const reviewRequirements = createPhase1UiFixtureReviewRequirements({
      "01.01": "pending",
      "01.02": "pending",
    });
    const queue = createPhase1UiFixtureReviewQueue({
      "01.01": "pending",
      "01.02": "pending",
    });
    const html = render(
      <ReviewStudio
        approvedCount={0}
        generatedCount={queue.length}
        generatedReviewableRequirements={queue}
        onGenerateDemoRows={async () => false}
        onGoToGenerate={vi.fn()}
        onOpenScript={vi.fn()}
        onReviewAction={vi.fn()}
        projectId={phase1UiFixtureProjectMetadata.projectId}
        reviewRequirements={reviewRequirements}
      />,
    );

    expect(html).toContain("Review generated requirements");
    expect(html).toContain("Pending requirements");
    expect(html).toContain("Search and filter generated rows");
    expect(html).toContain("Approve");
  });

  it("renders script as blocked while pending review work remains", () => {
    const reviewRequirements = createPhase1UiFixtureReviewRequirements({
      "01.01": "approved",
      "01.02": "pending",
    });
    const draft = createDefaultDemoScriptDraft(
      phase1UiFixtureProjectMetadata.projectName,
    );
    const assembly = assembleDemoScript(reviewRequirements, draft);
    const html = render(
      <ScriptStudio
        assembly={assembly}
        draft={draft}
        exportReady={false}
        onDraftAction={vi.fn()}
        onGoToReview={vi.fn()}
        onOpenExport={vi.fn()}
        pendingReviewCount={1}
        projectMetadata={phase1UiFixtureProjectMetadata}
      />,
    );

    expect(html).toContain("Shape the Phase 1 handoff");
    expect(html).toContain("Continue to export");
    expect(html).toContain("still need consultant review");
    expect(html).toContain("Back to review");
  });

  it("renders export as ready once approved content is complete", () => {
    const reviewRequirements = createPhase1UiFixtureReviewRequirements({
      "01.01": "approved",
      "01.02": "approved",
    });
    const draft = createDefaultDemoScriptDraft(
      phase1UiFixtureProjectMetadata.projectName,
    );
    const assembly = assembleDemoScript(reviewRequirements, draft);
    const html = render(
      <ExportStudio
        assembly={assembly}
        exportReady
        onGoToReview={vi.fn()}
        onGoToScript={vi.fn()}
        pendingReviewCount={0}
        projectMetadata={phase1UiFixtureProjectMetadata}
      />,
    );

    expect(draft.title).toContain(phase1UiFixtureProjectMetadata.projectName);
    expect(html).toContain("Ready to download");
    expect(html).toContain("Download Markdown");
    expect(html).toContain("Format:");
  });
});
