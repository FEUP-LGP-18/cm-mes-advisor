import { createClient } from "@/lib/supabase/server";
import {
  isUuid,
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import { recordProjectActivity } from "./repository.server";
import {
  failure,
  success,
  type Project,
  type ProjectResult,
  type UpdateProjectMetadataInput,
} from "./types";

type ProjectRow = {
  archived_at: string | null;
  created_at: string;
  created_by: string | null;
  customer_name: string | null;
  description: string | null;
  id: string;
  name: string;
  status: Project["status"];
  updated_at: string;
  updated_by: string | null;
};

type ProjectNameRow = {
  name: string;
};

type SupabaseError = {
  code?: string;
  message?: string;
};

const projectSelect =
  "id,name,customer_name,description,status,created_by,updated_by,created_at,updated_at,archived_at";

export async function updateProjectMetadata(
  projectId: string,
  input: UpdateProjectMetadataInput,
): Promise<ProjectResult<Project>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_settings",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const name = input.name.trim();
  if (name.length === 0) {
    return failure("validation_error", "Project name is required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      customer_name: cleanOptionalText(input.customerName),
      description: cleanOptionalText(input.description),
      name,
      updated_by: userId,
    })
    .eq("id", projectId)
    .select(projectSelect)
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error, "Project metadata could not be updated.");
  }

  if (!data) {
    return failure("not_found", "Project not found.");
  }

  await recordProjectActivity(
    projectId,
    "project_metadata_updated",
    {
      customerName: cleanOptionalText(input.customerName),
      description: cleanOptionalText(input.description),
      name,
    },
    userId,
  );

  return success(mapProjectRow(data as ProjectRow));
}

export async function archiveProject(
  projectId: string,
): Promise<ProjectResult<Project>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "archive_project",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      archived_at: new Date().toISOString(),
      status: "archived",
      updated_by: userId,
    })
    .eq("id", projectId)
    .eq("status", "active")
    .select(projectSelect)
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error, "Project could not be archived.");
  }

  if (!data) {
    return failure("not_found", "Project not found or is not active.");
  }

  await recordProjectActivity(projectId, "project_archived", {}, userId);

  return success(mapProjectRow(data as ProjectRow));
}

export async function unarchiveProject(
  projectId: string,
): Promise<ProjectResult<Project>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "archive_project",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      archived_at: null,
      status: "active",
      updated_by: userId,
    })
    .eq("id", projectId)
    .eq("status", "archived")
    .select(projectSelect)
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error, "Project could not be unarchived.");
  }

  if (!data) {
    return failure("not_found", "Project not found or is not archived.");
  }

  await recordProjectActivity(projectId, "project_unarchived", {}, userId);

  return success(mapProjectRow(data as ProjectRow));
}

export async function deleteProject(
  projectId: string,
  confirmationName: string,
): Promise<ProjectResult<{ projectId: string }>> {
  const userResult = await requireUser();
  if (!userResult.ok) return userResult;
  const userId = userResult.data.id;

  if (!isUuid(projectId)) {
    return failure("validation_error", "Project id must be valid.");
  }

  const accessResult = await requireProjectCapability(
    projectId,
    "delete_project",
  );
  if (!accessResult.ok) return accessResult;
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const confirmedName = confirmationName.trim();
  if (confirmedName.length === 0) {
    return failure(
      "validation_error",
      "Project name confirmation is required.",
    );
  }

  const supabase = await createClient();
  const current = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  if (current.error) {
    return mapSupabaseError(current.error, "Project could not be loaded.");
  }

  if (!current.data) {
    return failure("not_found", "Project not found.");
  }

  const projectName = (current.data as ProjectNameRow).name;
  if (projectName !== confirmedName) {
    return failure(
      "validation_error",
      "Project name confirmation does not match.",
    );
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("name", projectName);

  if (error) {
    const msg = (error as SupabaseError).message ?? "";
    if (
      msg.toLowerCase().includes("last") &&
      msg.toLowerCase().includes("owner")
    ) {
      return failure(
        "conflict",
        "Cannot delete a project while you are the sole owner. Transfer ownership or remove the project members first.",
      );
    }
    return mapSupabaseError(error, "Project could not be deleted.");
  }

  return success({ projectId });
}

function cleanOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    customerName: row.customer_name,
    description: row.description,
    id: row.id,
    name: row.name,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function mapSupabaseError(error: SupabaseError, fallbackMessage: string) {
  if (error.code === "42501") {
    return failure("forbidden", fallbackMessage);
  }
  if (error.code === "PGRST116") {
    return failure("not_found", fallbackMessage);
  }
  if (error.code?.startsWith("23")) {
    return failure("validation_error", fallbackMessage);
  }
  return failure("internal_error", fallbackMessage);
}
