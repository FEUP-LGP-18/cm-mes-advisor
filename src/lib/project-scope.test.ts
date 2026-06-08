import { describe, expect, it } from "vitest";
import { phaseOneScope } from "./project-scope";

describe("phaseOneScope", () => {
  it("keeps the product scope centered on the Excel-first workflow with optional pilot Phase 2 continuation", () => {
    expect(phaseOneScope.mode).toBe(
      "Excel-first with optional pilot Master Data demo continuation",
    );
    expect(phaseOneScope.fixturePath).toBe(
      "fixtures/customer-x-functional-requirements.xlsx",
    );
    expect(phaseOneScope.included).toContain(
      "Optional pilot Phase 2 Master Data demo continuation",
    );
  });
});
