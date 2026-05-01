"use server";

import { revokeInvite, resendInvite, createInvite, listInvites } from "./invites.server";
import { revalidatePath } from "next/cache";
import type { ProjectRole } from "./types";

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
