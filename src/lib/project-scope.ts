export const phaseOneScope = {
  productName: "Critical Manufacturing MES Demo Advisor",
  mode: "Excel-first",
  fixturePath: "fixtures/customer-x-functional-requirements.xlsx",
  included: [
    "Requirements sheet parsing",
    "Consultant review",
    "Requirement-level MES comments",
    "Step-by-step demo guidance",
    "Separate demo document export",
  ],
  excluded: [
    "Phase 2 Master Data generation",
    "Direct LibreChat product shell",
    "Raw partner artifact storage",
  ],
} as const;
