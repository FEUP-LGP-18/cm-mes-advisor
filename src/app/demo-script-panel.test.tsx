import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  DemoScriptAssembly,
  DemoScriptDraft,
} from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";
import type { GeneralOutputPreferences } from "@/lib/settings";
import DemoScriptEditingPanel, {
  DemoScriptExportPanel,
  buildDemoScriptExportOverview,
  getDemoScriptEmptyStateCopy,
} from "./demo-script-panel";

const projectMetadata: ReviewProjectMetadata = {
  projectId: "customer-x-demo",
  projectName: "Customer X Demo",
  customerName: "Customer X",
  sourceFilename: "fixtures/customer-x-functional-requirements.xlsx",
  sourceRowCount: 167,
};

const demoScriptDraft: DemoScriptDraft = {
  version: 1,
  title: "Customer X Demo Script",
  sectionOrder: [],
  sectionEdits: {},
  stepEdits: {},
};

const readyAssembly: DemoScriptAssembly = {
  title: "Customer X Demo Script",
  emptyState: null,
  approvedRequirementCount: 2,
  approvedStepCount: 3,
  generatedRequirementCount: 3,
  sections: [
    {
      key: "section-1",
      title: "Materials setup",
      sourceLabel: "L2 process",
      subtitle: "Prepare the materials used in the demo.",
      stepCount: 3,
      requirementCount: 2,
      steps: [
        {
          key: "step-1",
          sectionKey: "section-1",
          title: "Create material",
          sourceTitle: "Create material",
          note: "",
          groupLabel: "Business Data",
          generatedComment:
            "MES supports material setup through standard data management.",
          currentComment: "Use the standard material setup flow.",
          instructions: ["Open Business Data", "Create the material record"],
          confidence: {
            level: "medium",
            score: 0.72,
            rationale: "Grounded in the sample workflow.",
          },
          assumptions: ["The sample demo keeps one default material."],
          warnings: ["Confirm the naming convention before handoff."],
          sourceReferences: [
            {
              id: "ref-1",
              kind: "mock-ai",
              label: "Mock material setup reference",
              note: "Used for the prototype export preview.",
            },
          ],
          sourceDemoStep: {
            id: "source-step-1",
            title: "Create material",
            mesModuleOrScreen: "Business Data > Material",
            reviewStatus: "consultant-review",
            relatedRequirementIds: ["01.01"],
            instructions: ["Open Business Data", "Create the material record"],
            sourceReferences: [],
          },
          traceability: {
            requirementKey: "3:01.01",
            requirementId: "01.01",
            sourceRowNumber: 3,
            sourceDemoStepId: "source-step-1",
          },
        },
        {
          key: "step-2",
          sectionKey: "section-1",
          title: "Assign resource",
          sourceTitle: "Assign resource",
          note: "",
          groupLabel: "Resource setup",
          generatedComment: "Link the resource to the material flow.",
          currentComment: "Show the resource assignment.",
          instructions: ["Open Resource", "Attach it to the material flow"],
          confidence: {
            level: "high",
            score: 0.85,
            rationale: "Matches the approved mock draft.",
          },
          assumptions: [],
          warnings: [],
          sourceReferences: [],
          sourceDemoStep: {
            id: "source-step-2",
            title: "Assign resource",
            mesModuleOrScreen: "Business Data > Resource",
            reviewStatus: "draft",
            relatedRequirementIds: ["01.02"],
            instructions: ["Open Resource", "Attach it to the material flow"],
            sourceReferences: [],
          },
          traceability: {
            requirementKey: "4:01.02",
            requirementId: "01.02",
            sourceRowNumber: 4,
            sourceDemoStepId: "source-step-2",
          },
        },
      ],
    },
  ],
};

const blockedAssembly: DemoScriptAssembly = {
  title: "Customer X Demo Script",
  emptyState: "no-approved-drafts",
  approvedRequirementCount: 0,
  approvedStepCount: 0,
  generatedRequirementCount: 2,
  sections: [],
};

const outputPreferences: GeneralOutputPreferences = {
  consultantName: "Example Consultant",
  mesVersion: "cm-v10",
  outputLanguage: "en",
  outputLanguageStatus: "saved-for-future-outputs",
};

function createAssemblyWithSourceUrl(url: string): DemoScriptAssembly {
  const [firstSection, ...remainingSections] = readyAssembly.sections;

  if (!firstSection) {
    throw new Error("Expected a ready script section fixture.");
  }

  const [firstStep, ...remainingSteps] = firstSection.steps;

  if (!firstStep) {
    throw new Error("Expected a ready script step fixture.");
  }

  return {
    ...readyAssembly,
    sections: [
      {
        ...firstSection,
        steps: [
          {
            ...firstStep,
            sourceReferences: firstStep.sourceReferences.map((reference) => ({
              ...reference,
              url,
            })),
          },
          ...remainingSteps,
        ],
      },
      ...remainingSections,
    ],
  };
}

describe("demo script panels", () => {
  it("renders the target-style script workspace without export CTA duplication", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptEditingPanel
        assembly={readyAssembly}
        draft={demoScriptDraft}
        exportReady
        onDraftAction={vi.fn()}
        onSwitchToExport={vi.fn()}
        onSwitchToReview={vi.fn()}
        pendingReviewCount={0}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Demo Script");
    expect(markup).toContain("Requirements addressed");
    expect(markup).toContain("Demo steps generated");
    expect(markup).toContain("Traceability");
    expect(markup).toContain("Script sections");
    expect(markup).toContain('aria-label="Script editor"');
    expect(markup).not.toContain(
      '<main class="fv-card fv-script-main-card"',
    );
    expect(markup).toContain("Refine the structure, wording, and notes");
    expect(markup).toContain("Script title");
    expect(markup).toContain("Source workbook");
    expect(markup).toContain("Continue to export");
    expect(markup).not.toContain("Download Markdown");
    expect(markup).not.toContain("Export PDF");
    expect(markup).not.toContain("Export Excel");
  });

  it("disables export continuation while review work remains", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptEditingPanel
        assembly={readyAssembly}
        draft={demoScriptDraft}
        exportReady={false}
        onDraftAction={vi.fn()}
        onSwitchToExport={vi.fn()}
        onSwitchToReview={vi.fn()}
        pendingReviewCount={1}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Keep shaping the handoff");
    expect(markup).toContain("1 generated row still need consultant review");
    expect(markup).toMatch(/<button[^>]*disabled=""/);
  });

  it("renders a blocked export state with review and script navigation", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptExportPanel
        assembly={blockedAssembly}
        exportReady={false}
        onSwitchToReview={vi.fn()}
        onSwitchToScript={vi.fn()}
        pendingReviewCount={2}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Export is still blocked");
    expect(markup).toContain("Approve at least one generated draft");
    expect(markup).toContain("Back to Script");
    expect(markup).toContain("Back to Review");
    expect(markup).not.toContain("Export PDF");
    expect(markup).not.toContain("Export Excel");
  });

  it("renders export as a completion step with Markdown-only download CTA", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptExportPanel
        assembly={readyAssembly}
        onSwitchToReview={vi.fn()}
        onSwitchToScript={vi.fn()}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Finalize Markdown handoff");
    expect(markup).toContain("Ready to download");
    expect(markup).toContain("Download Markdown");
    expect(markup).toContain("Not downloaded in this session");
    expect(markup).toContain("Included requirements");
    expect(markup).toContain("No output metadata configured");
    expect(markup).not.toContain("Script title");
    expect(markup).not.toContain("Export PDF");
    expect(markup).not.toContain("Export Excel");
    expect(markup).not.toContain("Share link");
  });

  it("renders general output metadata without implying translation", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptExportPanel
        assembly={readyAssembly}
        onSwitchToReview={vi.fn()}
        onSwitchToScript={vi.fn()}
        outputPreferences={outputPreferences}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Output metadata");
    expect(markup).toContain("Consultant");
    expect(markup).toContain("Example Consultant");
    expect(markup).toContain("MES version");
    expect(markup).toContain("CM V10");
    expect(markup).toContain("Output language preference");
    expect(markup).toContain(
      "English (saved for future outputs; existing generated content is not translated)",
    );
    expect(markup).not.toContain("Translated output");
  });

  it("renders downloaded state as local session status", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptExportPanel
        assembly={readyAssembly}
        initialDownloadedAt="10:45 AM"
        onSwitchToReview={vi.fn()}
        onSwitchToScript={vi.fn()}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Downloaded in this session");
    expect(markup).toContain(
      "Markdown downloaded at 10:45 AM. This is a local session status only.",
    );
  });

  it("renders only safe script source reference URLs as links", () => {
    const safeMarkup = renderToStaticMarkup(
      <DemoScriptEditingPanel
        assembly={createAssemblyWithSourceUrl("https://docs.example.com/source")}
        draft={demoScriptDraft}
        exportReady
        onDraftAction={vi.fn()}
        onSwitchToExport={vi.fn()}
        onSwitchToReview={vi.fn()}
        pendingReviewCount={0}
        projectMetadata={projectMetadata}
      />,
    );
    const unsafeMarkup = renderToStaticMarkup(
      <DemoScriptEditingPanel
        assembly={createAssemblyWithSourceUrl("javascript:alert(1)")}
        draft={demoScriptDraft}
        exportReady
        onDraftAction={vi.fn()}
        onSwitchToExport={vi.fn()}
        onSwitchToReview={vi.fn()}
        pendingReviewCount={0}
        projectMetadata={projectMetadata}
      />,
    );

    expect(safeMarkup).toContain('href="https://docs.example.com/source"');
    expect(safeMarkup).toContain("Mock material setup reference");
    expect(safeMarkup).toContain("Used for the prototype export preview.");
    expect(unsafeMarkup).toContain("<span>Mock material setup reference</span>");
    expect(unsafeMarkup).toContain("Used for the prototype export preview.");
    expect(unsafeMarkup).not.toContain('href="javascript:alert(1)"');
  });

  it("builds a concise export overview from the assembled script", () => {
    const overview = buildDemoScriptExportOverview(readyAssembly);

    expect(overview.includedRequirementIds).toEqual(["01.01", "01.02"]);
    expect(overview.sectionSummaries).toEqual([
      {
        key: "section-1",
        title: "Materials setup",
        stepCount: 3,
        requirementCount: 2,
      },
    ]);
    expect(overview.hasAssumptions).toBe(true);
    expect(overview.hasWarnings).toBe(true);
    expect(overview.hasTraceability).toBe(true);
  });

  it("keeps empty-state copy action-oriented", () => {
    expect(getDemoScriptEmptyStateCopy("no-approved-drafts")).toMatchObject({
      title: "Approve at least one generated draft",
    });
    expect(getDemoScriptEmptyStateCopy("no-demo-steps").body).toContain(
      "before the script can be exported",
    );
  });
});
