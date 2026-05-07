import { describe, expect, it } from "vitest";
import { createInitialMasterDataPhase2State } from "./types";

describe("createInitialMasterDataPhase2State", () => {
  it("starts Phase 2 in prototype draft mode for local usability", () => {
    expect(createInitialMasterDataPhase2State().mode).toBe("mock");
  });
});
