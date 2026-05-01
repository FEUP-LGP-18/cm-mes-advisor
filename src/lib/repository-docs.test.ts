import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("repository onboarding docs", () => {
  it("keeps the root README scoped to the MES Demo Advisor project", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain("# Critical Manufacturing MES Demo Advisor");
    expect(readme).toContain("## Supabase Migrations");
    expect(readme).not.toContain("# Supabase CLI");
    expect(readme).not.toContain(
      "This repository contains all the functionality for Supabase CLI.",
    );
  });

  it("does not commit Supabase CLI-generated local artifacts at the repo root", () => {
    expect(existsSync(join(process.cwd(), "LICENSE"))).toBe(false);
    expect(
      existsSync(join(process.cwd(), "supabase/snippets/Untitled query 898.sql")),
    ).toBe(false);
  });
});
