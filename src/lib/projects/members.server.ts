import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireProjectCapability, requireUser } from "./permissions.server";
import { recordProjectActivity } from "./repository.server";
import {
  failure,
  success,
  type ProjectMember,
  type ProjectResult,
  type ProjectRole,
} from "./types";

type MembershipRow = {
  created_at: string;
  role: ProjectRole;
  user_id: string;
};

type SupabaseError = {
  code?: string;
  message?: string;
};

async function resolveUserProfile(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
): Promise<{ email: string | null; name: string | null }> {
  const { data } = await adminClient.auth.admin.getUserById(userId);
  const user = data?.user;
  if (!user) return { email: null, name: null };

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const rawName =
    typeof metadata.name === "string"
      ? metadata.name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : null;
  const name = rawName && rawName.trim().length > 0 ? rawName.trim() : null;

  return { email: user.email ?? null, name };
}

function mapRow(
  row: MembershipRow,
  profile: { email: string | null; name: string | null },
): ProjectMember {
  return {
    email: profile.email,
    joinedAt: row.created_at,
    name: profile.name,
    role: row.role,
    userId: row.user_id,
  };
}

export async function listMembers(
  projectId: string,
): Promise<ProjectResult<ProjectMember[]>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_members",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_memberships")
    .select("user_id,role,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return failure("internal_error", "Failed to load members.");
  }

  const rows = (data ?? []) as MembershipRow[];
  const adminClient = await createAdminClient();

  const members = await Promise.all(
    rows.map(async (row) => {
      const profile = await resolveUserProfile(adminClient, row.user_id);
      return mapRow(row, profile);
    }),
  );

  return success(members);
}

export async function updateMemberRole(
  projectId: string,
  targetUserId: string,
  newRole: ProjectRole,
): Promise<ProjectResult<ProjectMember>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  if (newRole !== "viewer" && newRole !== "editor" && newRole !== "owner") {
    return failure("validation_error", "Role must be viewer, editor, or owner.");
  }

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_members",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_memberships")
    .update({ role: newRole })
    .eq("project_id", projectId)
    .eq("user_id", targetUserId)
    .select("user_id,role,created_at")
    .maybeSingle();

  if (error) {
    const msg = (error as SupabaseError).message ?? "";
    if (msg.includes("Cannot demote the last project owner")) {
      return failure("conflict", "Cannot demote the last project owner.");
    }
    return failure("internal_error", "Failed to update member role.");
  }

  if (!data) {
    return failure("not_found", "Member not found.");
  }

  await recordProjectActivity(
    projectId,
    "member_role_changed",
    { newRole, targetUserId },
    userId,
  );

  const row = data as MembershipRow;
  const adminClient = await createAdminClient();
  const profile = await resolveUserProfile(adminClient, row.user_id);
  return success(mapRow(row, profile));
}

export async function removeMember(
  projectId: string,
  targetUserId: string,
): Promise<ProjectResult<{ userId: string }>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_members",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_memberships")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", targetUserId);

  if (error) {
    const msg = (error as SupabaseError).message ?? "";
    if (msg.includes("Cannot remove the last project owner")) {
      return failure("conflict", "Cannot remove the last project owner.");
    }
    return failure("internal_error", "Failed to remove member.");
  }

  await recordProjectActivity(
    projectId,
    "member_removed",
    { targetUserId },
    userId,
  );

  return success({ userId: targetUserId });
}
