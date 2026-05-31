import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/lib/requirements/review-storage";
import {
  loadSettingsBehaviorSnapshot,
  saveSettingsBehaviorSnapshot,
  SETTINGS_BEHAVIOR_STORAGE_KEY,
  updateSettingsBehaviorSnapshot,
} from "./persistence";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("settings behavior persistence", () => {
  it("loads defaults when no browser snapshot is saved", () => {
    expect(loadSettingsBehaviorSnapshot(new MemoryStorage())).toMatchObject({
      industryTemplateId: null,
    });
  });

  it("normalizes persisted template aliases and rejects unsafe fields", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_BEHAVIOR_STORAGE_KEY,
      JSON.stringify({
        industryTemplateId: "medical-devices",
        rawModelId: "provider/raw",
      }),
    );

    expect(loadSettingsBehaviorSnapshot(storage)).toMatchObject({
      industryTemplateId: "medical",
    });
    expect(loadSettingsBehaviorSnapshot(storage)).not.toHaveProperty(
      "rawModelId",
    );
  });

  it("updates the shared snapshot without dropping existing settings", () => {
    const storage = new MemoryStorage();
    saveSettingsBehaviorSnapshot(storage, {
      aiPreferences: {
        confidenceThreshold: 80,
        includeExplanations: false,
        modelAlias: "review-focused",
        verbosity: "high",
      },
      generalOutputPreferences: {
        consultantName: "Consultant",
        mesVersion: "cm-v10",
        outputLanguage: "pt",
        outputLanguageStatus: "saved-for-future-outputs",
      },
      industryTemplateId: null,
    });

    expect(
      updateSettingsBehaviorSnapshot(storage, {
        industryTemplateId: "aerospace",
      }),
    ).toMatchObject({
      aiPreferences: {
        modelAlias: "review-focused",
      },
      generalOutputPreferences: {
        consultantName: "Consultant",
      },
      industryTemplateId: "aerospace",
    });
  });
});
