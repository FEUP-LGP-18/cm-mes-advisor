export const phaseOneScope = {
  productName: "Critical Manufacturing MES Demo Advisor",
  mode: "Excel-first with optional Master Data continuation",
  fixturePath: "fixtures/customer-x-functional-requirements.xlsx",
  included: [
    "Requirements sheet parsing",
    "Consultant review",
    "Requirement-level MES comments",
    "Step-by-step demo guidance",
    "Separate demo document export",
    "Optional Phase 2 Master Data continuation",
  ],
  excluded: [
    "Direct LibreChat product shell",
    "Raw partner artifact storage",
  ],
} as const;
