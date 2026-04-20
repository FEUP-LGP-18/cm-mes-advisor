import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  DemoScriptAssembly,
  DemoScriptDraft,
} from "@/lib/requirements/demo-script";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";
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

describe("demo script panels", () => {
  it("renders the script editor without export CTA duplication", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptEditingPanel
        assembly={readyAssembly}
        draft={demoScriptDraft}
        onDraftAction={vi.fn()}
        onSwitchToReview={vi.fn()}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Script editor");
    expect(markup).toContain("Shape the consultant-facing narrative");
    expect(markup).toContain("Script title");
    expect(markup).not.toContain("Download Markdown");
  });

  it("renders export as a completion step with download CTA", () => {
    const markup = renderToStaticMarkup(
      <DemoScriptExportPanel
        assembly={readyAssembly}
        onSwitchToReview={vi.fn()}
        onSwitchToScript={vi.fn()}
        projectMetadata={projectMetadata}
      />,
    );

    expect(markup).toContain("Finalize the Phase 1 deliverable");
    expect(markup).toContain("Download Markdown");
    expect(markup).toContain("Included requirements");
    expect(markup).not.toContain("Script title");
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
