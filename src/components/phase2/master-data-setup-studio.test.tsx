import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MasterDataSetupStudio from "./master-data-setup-studio";
import type { MasterDataApplicableRequirement } from "@/lib/master-data/types";

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

const applicableRequirement: MasterDataApplicableRequirement = {
  confidence: {
    level: "medium",
    rationale: "Matched a product setup signal.",
  },
  consultantComment: "Approved for demo coverage.",
  l2Process: "Production",
  l3Process: "Product setup",
  operation: "Setup",
  preselected: true,
  reason: "Matched Master Data cues: product, material.",
  requirementDescription: "Quick Product setup",
  requirementId: "03.01",
  requirementKey: "28:03.01",
  reviewNote: "",
  reviewStatus: "approved",
  sourceRowNumber: 28,
  suggestedObjectTypes: ["product", "material"],
};

describe("MasterDataSetupStudio", () => {
  it("renders a locked Phase 2 state when no Phase 1 rows are approved", () => {
    const html = render(
      <MasterDataSetupStudio
        applicableRequirements={[]}
        approvedCount={0}
        feedback={null}
        hasAnalysisRun={false}
        hasGeneratedPhase1Drafts={false}
        mode="real"
        onAnalyze={async () => false}
        onContinueToProcess={vi.fn()}
        onModeChange={vi.fn()}
        onOpenPhase1Generate={vi.fn()}
        onOpenPhase1Review={vi.fn()}
        onToggleObjectType={vi.fn()}
        onToggleRequirement={vi.fn()}
        selectedObjectTypes={["enterprise", "site"]}
        selectedRequirementKeys={[]}
      />,
    );

    expect(html).toContain(
      "Approve Phase 1 rows before you continue into Master Data.",
    );
    expect(html).toContain(
      "Nothing can enter Phase 2 until at least one row is approved.",
    );
    expect(html).toContain("Generate Phase 1 drafts");
    expect(html).not.toContain("Generation mode");
    expect(html).not.toContain("Object scope");
    expect(html).not.toContain("Grounded real generation");
    expect(html).not.toContain("Prototype drafts");
    expect(html).not.toContain("Generate Master Data");
  });

  it("renders a no-match state when the approved slice has been analyzed but found no candidates", () => {
    const html = render(
      <MasterDataSetupStudio
        applicableRequirements={[]}
        approvedCount={2}
        feedback="No obvious Master Data rows were detected inside the approved Phase 1 slice."
        hasAnalysisRun
        hasGeneratedPhase1Drafts
        mode="real"
        onAnalyze={async () => true}
        onContinueToProcess={vi.fn()}
        onModeChange={vi.fn()}
        onOpenPhase1Generate={vi.fn()}
        onOpenPhase1Review={vi.fn()}
        onToggleObjectType={vi.fn()}
        onToggleRequirement={vi.fn()}
        selectedObjectTypes={["enterprise", "site"]}
        selectedRequirementKeys={[]}
      />,
    );

    expect(html).toContain("No Phase 2 matches yet");
    expect(html).toContain(
      "The approved slice did not surface any clear Master Data rows.",
    );
  });

  it("shows approved rows as not analyzed yet before the first Phase 2 analysis", () => {
    const html = render(
      <MasterDataSetupStudio
        applicableRequirements={[]}
        approvedCount={2}
        feedback="Approve at least one Phase 1 row before starting Phase 2. Master Data setup only analyzes the approved consultant slice."
        hasAnalysisRun={false}
        hasGeneratedPhase1Drafts
        mode="mock"
        onAnalyze={async () => true}
        onContinueToProcess={vi.fn()}
        onModeChange={vi.fn()}
        onOpenPhase1Generate={vi.fn()}
        onOpenPhase1Review={vi.fn()}
        onToggleObjectType={vi.fn()}
        onToggleRequirement={vi.fn()}
        selectedObjectTypes={["enterprise", "site"]}
        selectedRequirementKeys={[]}
      />,
    );

    expect(html).toContain("Not analyzed yet");
    expect(html).toContain("Analyze approved rows");
    expect(html).not.toContain(
      "Approve at least one Phase 1 row before starting Phase 2",
    );
  });

  it("renders the approved-slice table once applicable rows exist", () => {
    const html = render(
      <MasterDataSetupStudio
        applicableRequirements={[applicableRequirement]}
        approvedCount={1}
        feedback="Phase 2 setup is ready for generation."
        hasAnalysisRun
        hasGeneratedPhase1Drafts
        mode="real"
        onAnalyze={async () => true}
        onContinueToProcess={vi.fn()}
        onModeChange={vi.fn()}
        onOpenPhase1Generate={vi.fn()}
        onOpenPhase1Review={vi.fn()}
        onToggleObjectType={vi.fn()}
        onToggleRequirement={vi.fn()}
        selectedObjectTypes={["product", "material"]}
        selectedRequirementKeys={["28:03.01"]}
      />,
    );

    expect(html).toContain("Phase 2 input slice");
    expect(html).toContain("Quick Product setup");
    expect(html).toContain("Approved in Phase 1");
    expect(html).toContain("Generation mode");
    expect(html).toContain("Prototype drafts");
    expect(html).toContain("Continue to processing");
  });
});
