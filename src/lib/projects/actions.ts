"use server";

import { revokeInvite, resendInvite, createInvite, listInvites } from "./invites.server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPhase1StepPath } from "@/lib/phase1/workflow";
import { requireUser } from "./permissions.server";
import {
  createProjectForUser,
  saveProjectPhaseState,
} from "./repository.server";
import type { CreateProjectActionState, ProjectRole } from "./types";
import {
  normalizeSettingsBehaviorSnapshot,
  SETTINGS_BEHAVIOR_STATE_KEY,
} from "@/lib/settings";

export async function createProjectAction(
  _previousState: CreateProjectActionState,
  formData: FormData,
): Promise<CreateProjectActionState> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return {
      message: userResult.message,
      status: "error",
    };
  }

  const result = await createProjectForUser(
    {
      customerName: readFormText(formData, "customerName"),
      description: readFormText(formData, "description"),
      name: readFormText(formData, "name") ?? "",
    },
    userResult.data.id,
  );

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  const settings = normalizeSettingsBehaviorSnapshot({
    industryTemplateId: readFormText(formData, "industryTemplateId"),
  });
  if (settings.industryTemplateId) {
    const settingsResult = await saveProjectPhaseState(
      result.data.id,
      SETTINGS_BEHAVIOR_STATE_KEY,
      settings,
      0,
      userResult.data.id,
    );

    if (!settingsResult.ok) {
      return {
        message: settingsResult.message,
        status: "error",
      };
    }
  }

  revalidatePath("/");
  redirect(getPhase1StepPath(result.data.id, "source"));
}

export async function listInvitesAction(projectId: string) {
  return listInvites(projectId);
}

export async function createInviteAction(projectId: string, email: string, role: ProjectRole, origin: string) {
  const result = await createInvite(projectId, email, role, origin);
  if (result.ok) {
    revalidatePath(`/projects/${projectId}/settings`);
  }
  return result;
}

export async function revokeInviteAction(inviteId: string, projectId: string) {
  const result = await revokeInvite(inviteId, projectId);
  if (result.ok) {
    revalidatePath(`/projects/${projectId}/settings`);
  }
  return result;
}

export async function resendInviteAction(inviteId: string, projectId: string, origin: string) {
  const result = await resendInvite(inviteId, projectId, origin);
  // Resend doesn't change list state, but might update timestamps
  revalidatePath(`/projects/${projectId}/settings`);
  return result;
}

function readFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}
