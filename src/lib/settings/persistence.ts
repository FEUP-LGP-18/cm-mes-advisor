import type { StorageLike } from "@/lib/requirements/review-storage";
import {
  defaultSettingsBehaviorSnapshot,
  normalizeSettingsBehaviorSnapshot,
  type SettingsBehaviorSnapshot,
} from "./contracts";

export const SETTINGS_BEHAVIOR_STATE_KEY = "settings";
export const SETTINGS_BEHAVIOR_STORAGE_KEY =
  "cm-mes-advisor:settings-behavior:v1";

export function loadSettingsBehaviorSnapshot(
  storage: StorageLike,
): SettingsBehaviorSnapshot {
  try {
    const rawSnapshot = storage.getItem(SETTINGS_BEHAVIOR_STORAGE_KEY);
    return rawSnapshot
      ? normalizeSettingsBehaviorSnapshot(JSON.parse(rawSnapshot))
      : cloneDefaultSettingsBehaviorSnapshot();
  } catch {
    return cloneDefaultSettingsBehaviorSnapshot();
  }
}

export function saveSettingsBehaviorSnapshot(
  storage: StorageLike,
  snapshot: SettingsBehaviorSnapshot,
): void {
  try {
    storage.setItem(
      SETTINGS_BEHAVIOR_STORAGE_KEY,
      JSON.stringify(normalizeSettingsBehaviorSnapshot(snapshot)),
    );
  } catch {
    // Browser-only preference persistence should not block the workflow.
  }
}

export function updateSettingsBehaviorSnapshot(
  storage: StorageLike,
  nextSnapshot: Partial<SettingsBehaviorSnapshot>,
): SettingsBehaviorSnapshot {
  const snapshot = normalizeSettingsBehaviorSnapshot({
    ...loadSettingsBehaviorSnapshot(storage),
    ...nextSnapshot,
  });

  saveSettingsBehaviorSnapshot(storage, snapshot);
  return snapshot;
}

function cloneDefaultSettingsBehaviorSnapshot(): SettingsBehaviorSnapshot {
  return {
    aiPreferences: { ...defaultSettingsBehaviorSnapshot.aiPreferences },
    generalOutputPreferences: {
      ...defaultSettingsBehaviorSnapshot.generalOutputPreferences,
    },
    industryTemplateId: defaultSettingsBehaviorSnapshot.industryTemplateId,
  };
}
