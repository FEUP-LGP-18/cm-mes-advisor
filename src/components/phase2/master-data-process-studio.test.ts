import { describe, expect, it } from "vitest";
import { shouldAutoStartMasterDataGeneration } from "./master-data-process-studio";

describe("shouldAutoStartMasterDataGeneration", () => {
  it("starts processing only from the idle state", () => {
    expect(shouldAutoStartMasterDataGeneration("idle")).toBe(true);
    expect(shouldAutoStartMasterDataGeneration("running")).toBe(false);
    expect(shouldAutoStartMasterDataGeneration("ready")).toBe(false);
    expect(shouldAutoStartMasterDataGeneration("error")).toBe(false);
  });
});
