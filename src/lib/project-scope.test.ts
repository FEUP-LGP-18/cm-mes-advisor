import { describe, expect, it } from "vitest";
import { phaseOneScope } from "./project-scope";

describe("phaseOneScope", () => {
  it("keeps the product scope centered on the Excel-first workflow with required pilot Phase 2 continuation", () => {
    expect(phaseOneScope.mode).toBe(
      "Excel-first with required pilot Master Data demo continuation",
    );
    expect(phaseOneScope.fixturePath).toBe(
      "fixtures/customer-x-functional-requirements.xlsx",
    );
    expect(phaseOneScope.included).toContain(
      "Required pilot Phase 2 Master Data demo continuation",
    );
  });
});
