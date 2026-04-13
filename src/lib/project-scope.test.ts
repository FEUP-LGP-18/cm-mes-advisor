import { describe, expect, it } from "vitest";
import { phaseOneScope } from "./project-scope";

describe("phaseOneScope", () => {
  it("keeps the Epic 0 baseline focused on the Excel-first MVP", () => {
    expect(phaseOneScope.mode).toBe("Excel-first");
    expect(phaseOneScope.fixturePath).toBe(
      "fixtures/customer-x-functional-requirements.xlsx",
    );
    expect(phaseOneScope.excluded).toContain("Phase 2 Master Data generation");
  });
});
