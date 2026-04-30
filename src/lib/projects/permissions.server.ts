import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  failure,
  success,
  type CurrentUser,
  type CurrentUserProfile,
  type ProjectCapability,
  type ProjectResult,
  type ProjectRole,
} from "./types";

const capabilitiesByRole = {
  viewer: ["read_project"],
  editor: ["read_project", "edit_project_state", "upload_project_file"],
  owner: [
    "read_project",
    "edit_project_state",
    "upload_project_file",
    "manage_project_settings",
    "manage_project_members",
    "archive_project",
    "delete_project",
  ],
} as const satisfies Record<ProjectRole, readonly ProjectCapability[]>;

export function getCapabilitiesForRole(
  role: ProjectRole | null,
): ProjectCapability[] {
  return role ? [...capabilitiesByRole[role]] : [];
}

export function roleHasCapability(
  role: ProjectRole | null,
  capability: ProjectCapability,
) {
  return getCapabilitiesForRole(role).includes(capability);
}

export async function requireUser(): Promise<ProjectResult<CurrentUser>> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return failure("not_authenticated", "Authentication required.");
  }

  return success(toCurrentUser(user));
}

export async function getCurrentUserProfile(): Promise<
  ProjectResult<CurrentUserProfile>
> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return success({
    ...userResult.data,
    name: extractDisplayName(user ?? null),
  });
}

export async function getProjectRole(
  projectId: string,
  userId: string,
): Promise<ProjectResult<ProjectRole | null>> {
  if (!isUuid(projectId) || !isUuid(userId)) {
    return failure("validation_error", "Project id and user id must be valid.");
  }

  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  if (userResult.data.id !== userId) {
    return failure("forbidden", "Cannot check access for another user.");
  }

  return readCurrentProjectRole(projectId);
}

export async function getProjectCapabilities(
  projectId: string,
  userId: string,
): Promise<ProjectResult<ProjectCapability[]>> {
  const roleResult = await getProjectRole(projectId, userId);
  if (!roleResult.ok) {
    return roleResult;
  }

  return success(getCapabilitiesForRole(roleResult.data));
}

export async function requireProjectCapability(
  projectId: string,
  action: ProjectCapability,
): Promise<ProjectResult<CurrentUser>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  const roleResult = await readCurrentProjectRole(projectId);
  if (!roleResult.ok) {
    return roleResult;
  }

  if (!roleHasCapability(roleResult.data, action)) {
    return failure("forbidden", "Project access denied.");
  }

  return userResult;
}

function toCurrentUser(user: User): CurrentUser {
  return {
    email: user.email ?? null,
    id: user.id,
  };
}

function extractDisplayName(user: User | null) {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata;
  const name =
    typeof metadata?.name === "string"
      ? metadata.name
      : typeof metadata?.full_name === "string"
        ? metadata.full_name
        : null;

  return name && name.trim().length > 0 ? name : null;
}

function isProjectRole(value: unknown): value is ProjectRole {
  return value === "viewer" || value === "editor" || value === "owner";
}

async function readCurrentProjectRole(
  projectId: string,
): Promise<ProjectResult<ProjectRole | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_project_role", {
    target_project_id: projectId,
  });

  if (error) {
    return failure("forbidden", "Project access could not be verified.");
  }

  return success(isProjectRole(data) ? data : null);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
