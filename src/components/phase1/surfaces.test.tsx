import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assembleDemoScript,
  createDefaultDemoScriptDraft,
  filterReviewRequirements,
  mockGenerationStageLabels,
} from "@/lib/requirements";
import type { ReviewRequirement } from "@/lib/requirements";
import type { ProjectListItem } from "@/lib/projects/types";
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
import Phase1Topbar from "./phase-topbar";
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

function createDashboardProject(
  overrides: Partial<ProjectListItem> = {},
): ProjectListItem {
  return {
    archivedAt: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    currentUserRole: "owner",
    customerName: "Customer X",
    description: "Phase 1 demo workspace",
    id: "22222222-2222-4222-8222-222222222222",
    name: "Customer X MES demo",
    phase1CurrentStep: "review",
    status: "active",
    updatedAt: "2026-05-09T10:00:00.000Z",
    updatedBy: "11111111-1111-4111-8111-111111111111",
    ...overrides,
  };
}

function createReviewRequirementsWithFirstSourceReference(
  url: string,
): ReviewRequirement[] {
  const requirements = createPhase1UiFixtureReviewRequirements({
    "01.01": "pending",
    "01.02": "pending",
  });
  const [firstRequirement, ...remainingRequirements] = requirements;

  if (
    !firstRequirement ||
    firstRequirement.generatedOutput.state !== "mock-generated-draft"
  ) {
    throw new Error("Fixture expected a generated review requirement.");
  }

  const generatedOutput = firstRequirement.generatedOutput;
  const existingReference = generatedOutput.draft.sourceReferences[0];

  return [
    {
      ...firstRequirement,
      generatedOutput: {
        ...generatedOutput,
        draft: {
          ...generatedOutput.draft,
          sourceReferences: [
            {
              id: existingReference?.id ?? "source-reference-test",
              kind: existingReference?.kind ?? "mock-ai",
              label: "Safety source reference",
              note: "Reference note stays visible.",
              url,
            },
            ...generatedOutput.draft.sourceReferences.slice(1),
          ],
        },
      },
    },
    ...remainingRequirements,
  ];
}

function renderReviewStudio(requirements: ReviewRequirement[]) {
  return render(
    <ReviewStudio
      approvedCount={0}
      generatedCount={requirements.length}
      generatedReviewableRequirements={requirements}
      onGenerateDemoRows={async () => false}
      onGoToGenerate={vi.fn()}
      onOpenScript={vi.fn()}
      onReviewAction={vi.fn()}
      projectId={phase1UiFixtureProjectMetadata.projectId}
      reviewRequirements={requirements}
    />,
  );
}

const createProjectActionStub = async () => ({
  message: null,
  status: "idle" as const,
});

const initialCreateProjectState = {
  message: null,
  status: "idle" as const,
};

describe("phase 1 redesigned surfaces", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not show sign out in local mock mode without Supabase auth", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const html = render(<Phase1Topbar />);

    expect(html).not.toContain("Logout");
    expect(html).toContain("MES Advisor");
  });

  it("renders authenticated global navigation when Supabase auth is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    const html = render(<Phase1Topbar email="owner@example.com" />);

    expect(html).toContain('href="/"');
    expect(html).toContain("Projects");
    expect(html).toContain("Owner");
    expect(html).toContain('aria-label="Sign out"');
  });

  it("renders the command desk empty state with one blunt starting action", () => {
    const html = render(
      <ProjectCommandDesk
        activeProject={null}
        createProject={createProjectActionStub}

        initialCreateProjectState={initialCreateProjectState}
        listError={null}
        onOpenProject={vi.fn()}
        onQueryChange={vi.fn()}
        onSortChange={vi.fn()}
        projects={[]}
        query=""
        sort="recent"
        totalProjectCount={0}
      />,
    );

    expect(html).toContain("No projects yet");
    expect(html).toContain("New Project");
  });

  it("renders the priority strip and table-first project desk for active work", () => {
    const project = createDashboardProject();
    const html = render(
      <ProjectCommandDesk
        activeProject={project}
        createProject={createProjectActionStub}

        initialCreateProjectState={initialCreateProjectState}
        listError={null}
        onOpenProject={vi.fn()}
        onQueryChange={vi.fn()}
        onSortChange={vi.fn()}
        projects={[project]}
        query=""
        sort="recent"
        totalProjectCount={1}
      />,
    );

    expect(html).toContain("Customer X MES demo");
    expect(html).toContain("Customer X");
    expect(html).toContain("Pending Review");
    expect(html).toContain("Open");
  });

  it("renders a no-results state when search filters out server projects", () => {
    const html = render(
      <ProjectCommandDesk
        activeProject={null}
        createProject={createProjectActionStub}

        initialCreateProjectState={initialCreateProjectState}
        listError={null}
        onOpenProject={vi.fn()}
        onQueryChange={vi.fn()}
        onSortChange={vi.fn()}
        projects={[]}
        query="missing"
        sort="recent"
        totalProjectCount={1}
      />,
    );

    expect(html).toContain("No projects found");
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
        canEditPhase1={false}
        currentStep="review"
        currentUserRole="viewer"
        nextAction={getNextAction(project.snapshot)}
        progress={getWorkflowProgress(project.snapshot)}
        project={project}
      >
        <div>Child surface</div>
      </Phase1ProjectShell>,
    );

    expect(html).toContain("Read-only workspace");
    expect(html).toContain("Requirements");
    expect(html).toContain("AI Processing");
  });

  it("renders blocked phase stages as disabled controls with hover guidance", () => {
    const baseProject = createProjectRecord();
    const project = {
      ...baseProject,
      currentStep: "generate" as const,
      snapshot: {
        ...baseProject.snapshot,
        generatedCount: 0,
        generatedReviewableCount: 0,
      },
    };
    const html = render(
      <Phase1ProjectShell
        currentStep="generate"
        nextAction={getNextAction(project.snapshot)}
        progress={getWorkflowProgress(project.snapshot)}
        project={project}
      >
        <div>Child surface</div>
      </Phase1ProjectShell>,
    );

    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Script Output");
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

    expect(html).toContain("Sample workbook active");
    expect(html).toContain("Upload .xlsx workbook");
    expect(html).toContain("Continue to Generate");
    expect(html).toContain("Before you continue");
    expect(html).toContain("Parsed Preview");
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
    expect(html).toContain("Row explorer — search, filter, and select");
    expect(html).toContain("Generate Recommended Draft");
    expect(html).toContain("Generation Mode");
    expect(html).toContain("Recheck access");
    expect(html).toContain("Open review queue");
    expect(html).toContain("Last run used grounded generation. Rail is back to draft mode.");
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

    expect(html).toContain("No requirements generated yet");
    expect(html).toContain("Generate demo rows");
    expect(html).toContain("Back to generation");
    expect(html).not.toContain("No requirements match your filters");
  });

  it("renders the review queue studio with the current requirement and shortcuts", () => {
    const reviewRequirements = createPhase1UiFixtureReviewRequirements({
      "01.01": "pending",
      "01.02": "approved",
    });
    const queue = createPhase1UiFixtureReviewQueue({
      "01.01": "pending",
      "01.02": "approved",
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

    expect(html).toContain("Requirements Review");
    expect(html).toContain("Requirement Text");
    expect(html).toContain("Pending requirements");
    expect(html).toContain("Showing 2 of 2");
    expect(html).toContain("Selected requirement");
    expect(html).toContain("AI comment");
    expect(html).toContain("MES object");
    expect(html).toContain("Consultant comment");
    expect(html).toContain("Review note");
    expect(html).toContain("Select all visible requirements");
    expect(html).toContain("Select requirement 01.01");
    expect(html).toContain("Select requirement 01.02");
    expect(html).toContain("Select 01.02 for inspection");
    expect(html).not.toContain(">Export</button>");
    expect(html).not.toContain("Export selected");
    expect(html).not.toContain("Approve selected");
    expect(html).not.toContain("selected rows");
    expect(html).toContain("Approve ready rows");
    expect(html).toContain("Skip remaining rows");
    expect(html).toContain("Approve");
    expect(html).toContain("Flag");
    expect(html).not.toContain("No requirements match your filters");
    expect(html).not.toContain("Clear filters");
  });

  it("renders only safe selected inspector source reference URLs as links", () => {
    const safeHtml = renderReviewStudio(
      createReviewRequirementsWithFirstSourceReference(
        "https://docs.example.com/source",
      ),
    );
    const unsafeHtml = renderReviewStudio(
      createReviewRequirementsWithFirstSourceReference("javascript:alert(1)"),
    );

    expect(safeHtml).toContain(
      '<a href="https://docs.example.com/source">Safety source reference</a>',
    );
    expect(safeHtml).toContain("Reference note stays visible.");
    expect(unsafeHtml).toContain("<span>Safety source reference</span>");
    expect(unsafeHtml).toContain("Reference note stays visible.");
    expect(unsafeHtml).not.toContain('href="javascript:alert(1)"');
  });

  it("renders the cleared review queue as a ready state, not a blocked state", () => {
    const reviewRequirements = createPhase1UiFixtureReviewRequirements({
      "01.01": "approved",
      "01.02": "approved",
    });
    const html = render(
      <ReviewStudio
        approvedCount={2}
        generatedCount={2}
        generatedReviewableRequirements={[]}
        onGenerateDemoRows={async () => false}
        onGoToGenerate={vi.fn()}
        onOpenScript={vi.fn()}
        onReviewAction={vi.fn()}
        projectId={phase1UiFixtureProjectMetadata.projectId}
        reviewRequirements={reviewRequirements}
      />,
    );

    expect(html).toContain("Review decisions complete");
    expect(html).toContain("Every generated requirement has a review decision");
    expect(html).toContain("Generate Script");
    expect(html).not.toContain("No requirements generated yet");
    expect(html).not.toContain("No requirements match your filters");
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

    expect(html).toContain("Keep shaping the handoff");
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
        approvedCount={2}
        assembly={assembly}
        exportReady
        onGoToReview={vi.fn()}
        onGoToScript={vi.fn()}
        onOpenMasterData={vi.fn()}
        pendingReviewCount={0}
        projectMetadata={phase1UiFixtureProjectMetadata}
      />,
    );

    expect(draft.title).toContain(phase1UiFixtureProjectMetadata.projectName);
    expect(html).toContain("Ready to download");
    expect(html).toContain("Download Markdown");
    expect(html).toContain("Not downloaded in this session");
    expect(html).toContain("No output metadata configured");
    expect(html).toContain("Markdown is the only enabled export format");
    expect(html).not.toContain("Export PDF");
    expect(html).not.toContain("Export Excel");
    expect(html).not.toContain("Share link");
    expect(html).toContain("Optional Phase 2 continuation");
    expect(html).toContain("Start Phase 2");
    expect(html).toContain("Phase 1 is complete when this handoff is exported.");
  });
});
