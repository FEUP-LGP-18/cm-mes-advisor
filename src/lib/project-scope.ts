export const phaseOneScope = {
  productName: "Critical Manufacturing MES Demo Advisor",
  mode: "Excel-first with required pilot Master Data demo continuation",
  fixturePath: "fixtures/customer-x-functional-requirements.xlsx",
  included: [
    "Requirements sheet parsing",
    "Consultant review",
    "Requirement-level MES comments",
    "Step-by-step demo guidance",
    "Separate demo document export",
    "Required pilot Phase 2 Master Data demo continuation",
  ],
  excluded: [
    "Direct LibreChat product shell",
    "Raw partner artifact storage",
  ],
} as const;
