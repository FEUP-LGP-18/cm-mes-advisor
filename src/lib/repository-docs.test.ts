import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("repository onboarding docs", () => {
  it("keeps the root README scoped to the MES Demo Advisor project", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain("# Critical Manufacturing MES Demo Advisor");
    expect(readme).toContain("## Supabase Migrations");
    expect(readme).toContain("pilot-ready");
    expect(readme).toContain("Phase 2 is required for the pilot demo");
    expect(readme).not.toContain("a Phase 1-only product");
    expect(readme).not.toContain("Phase 2 Master Data generation remains optional");
    expect(readme).not.toContain("# Supabase CLI");
    expect(readme).not.toContain(
      "This repository contains all the functionality for Supabase CLI.",
    );
  });

  it("documents the release checklist and does not claim MES import validation", () => {
    const meta = readFileSync(
      join(process.cwd(), "content/docs/meta.json"),
      "utf8",
    );
    const checklist = readFileSync(
      join(process.cwd(), "content/docs/release-checklist.mdx"),
      "utf8",
    );
    const productScope = readFileSync(
      join(process.cwd(), "content/docs/product-scope.mdx"),
      "utf8",
    );

    expect(meta).toContain("release-checklist");
    expect(checklist).toContain("Pilot-ready release checklist");
    expect(checklist).toContain("Supabase-backed multi-user QA");
    expect(productScope).toContain("Phase 2 is required for the pilot demo");
    expect(productScope).toContain("not MES-validated");
  });

  it("does not commit Supabase CLI-generated local artifacts at the repo root", () => {
    expect(existsSync(join(process.cwd(), "LICENSE"))).toBe(false);
    expect(
      existsSync(join(process.cwd(), "supabase/snippets/Untitled query 898.sql")),
    ).toBe(false);
  });
});
