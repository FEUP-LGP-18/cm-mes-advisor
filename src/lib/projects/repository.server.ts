import { createClient } from "@/lib/supabase/server";
import { requireProjectCapability, requireUser } from "./permissions.server";
import {
  failure,
  success,
  type CreateProjectInput,
  type Project,
  type ProjectActivityEvent,
  type ProjectFailure,
  type ProjectListItem,
  type ProjectPhaseState,
  type ProjectResult,
  type ProjectRole,
} from "./types";

type SupabaseError = {
  code?: string;
  message?: string;
};

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

type ProjectPhaseStateRow = {
  phase_key: string;
  project_id: string;
  state_json: unknown;
  updated_at: string;
  updated_by: string | null;
  version: number;
};

type ProjectMembershipRoleRow = {
  project_id: string;
  role: ProjectRole;
};

type ProjectActivityEventRow = {
  actor_id: string | null;
  created_at: string;
  event_payload: unknown;
  event_type: string;
  id: string;
  project_id: string;
};

const projectSelect =
  "id,name,customer_name,description,status,created_by,updated_by,created_at,updated_at,archived_at";

const phaseStateSelect =
  "project_id,phase_key,state_json,version,updated_by,updated_at";

const activitySelect =
  "id,project_id,actor_id,event_type,event_payload,created_at";

export async function listProjectsForUser(
  userId: string,
): Promise<ProjectResult<ProjectListItem[]>> {
  const authResult = await requireRepositoryUser(userId);
  if (!authResult.ok) {
    return authResult;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectSelect)
    .order("updated_at", { ascending: false });

  if (error) {
    return mapSupabaseError(error, "Projects could not be listed.");
  }

  const memberships = await supabase
    .from("project_memberships")
    .select("project_id,role")
    .eq("user_id", userId);

  if (memberships.error) {
    return mapSupabaseError(
      memberships.error,
      "Project roles could not be listed.",
    );
  }

  const rolesByProjectId = new Map(
    ((memberships.data ?? []) as ProjectMembershipRoleRow[]).map(
      (membership) => [membership.project_id, membership.role],
    ),
  );
  const projects = ((data ?? []) as ProjectRow[])
    .map(mapProjectRow)
    .flatMap((project) => {
      const currentUserRole = rolesByProjectId.get(project.id);
      return currentUserRole ? [{ ...project, currentUserRole }] : [];
    });

  return success(projects);
}

export async function getProjectForUser(
  projectId: string,
  userId: string,
): Promise<ProjectResult<Project>> {
  const authResult = await requireRepositoryUser(userId);
  if (!authResult.ok) {
    return authResult;
  }

  const accessResult = await requireProjectCapability(projectId, "read_project");
  if (!accessResult.ok) {
    return accessResult;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectSelect)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error, "Project could not be loaded.");
  }

  if (!data) {
    return failure("not_found", "Project not found.");
  }

  return success(mapProjectRow(data as ProjectRow));
}

export async function createProjectForUser(
  input: CreateProjectInput,
  userId: string,
): Promise<ProjectResult<Project>> {
  const authResult = await requireRepositoryUser(userId);
  if (!authResult.ok) {
    return authResult;
  }

  const parsed = parseCreateProjectInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      created_by: userId,
      customer_name: parsed.data.customerName,
      description: parsed.data.description,
      name: parsed.data.name,
      updated_by: userId,
    })
    .select(projectSelect)
    .single();

  if (error) {
    return mapSupabaseError(error, "Project could not be created.");
  }

  return success(mapProjectRow(data as ProjectRow));
}

export async function saveProjectPhaseState(
  projectId: string,
  phaseKey: string,
  state: unknown,
  expectedVersion: number,
  userId: string,
): Promise<ProjectResult<ProjectPhaseState>> {
  const authResult = await requireRepositoryUser(userId);
  if (!authResult.ok) {
    return authResult;
  }

  const accessResult = await requireProjectCapability(
    projectId,
    "edit_project_state",
  );
  if (!accessResult.ok) {
    return accessResult;
  }

  if (!isValidPhaseKey(phaseKey) || !Number.isInteger(expectedVersion)) {
    return failure(
      "validation_error",
      "Phase key and expected version must be valid.",
    );
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("project_phase_states")
    .select(phaseStateSelect)
    .eq("project_id", projectId)
    .eq("phase_key", phaseKey)
    .maybeSingle();

  if (existing.error) {
    return mapSupabaseError(
      existing.error,
      "Project phase state could not be loaded.",
    );
  }

  const existingState = existing.data as ProjectPhaseStateRow | null;

  if (!existingState) {
    if (expectedVersion !== 0) {
      return failure("conflict", "Project phase state version conflict.");
    }

    const inserted = await supabase
      .from("project_phase_states")
      .insert({
        phase_key: phaseKey,
        project_id: projectId,
        state_json: state,
        updated_by: userId,
      })
      .select(phaseStateSelect)
      .single();

    if (inserted.error) {
      return mapSupabaseError(
        inserted.error,
        "Project phase state could not be created.",
      );
    }

    return success(mapPhaseStateRow(inserted.data as ProjectPhaseStateRow));
  }

  if (existingState.version !== expectedVersion) {
    return failure("conflict", "Project phase state version conflict.");
  }

  const updated = await supabase
    .from("project_phase_states")
    .update({
      state_json: state,
      updated_by: userId,
    })
    .eq("project_id", projectId)
    .eq("phase_key", phaseKey)
    .eq("version", expectedVersion)
    .select(phaseStateSelect)
    .maybeSingle();

  if (updated.error) {
    return mapSupabaseError(
      updated.error,
      "Project phase state could not be saved.",
    );
  }

  if (!updated.data) {
    return failure("conflict", "Project phase state version conflict.");
  }

  return success(mapPhaseStateRow(updated.data as ProjectPhaseStateRow));
}

export async function recordProjectActivity(
  projectId: string,
  eventType: string,
  payload: unknown,
  actorId: string,
): Promise<ProjectResult<ProjectActivityEvent>> {
  const authResult = await requireRepositoryUser(actorId);
  if (!authResult.ok) {
    return authResult;
  }

  const accessResult = await requireProjectCapability(projectId, "read_project");
  if (!accessResult.ok) {
    return accessResult;
  }

  if (eventType.trim().length === 0) {
    return failure("validation_error", "Event type is required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_activity_events")
    .insert({
      actor_id: actorId,
      event_payload: payload,
      event_type: eventType,
      project_id: projectId,
    })
    .select(activitySelect)
    .single();

  if (error) {
    return mapSupabaseError(error, "Project activity could not be recorded.");
  }

  return success(mapActivityRow(data as ProjectActivityEventRow));
}

async function requireRepositoryUser(userId: string) {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  if (userResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  return userResult;
}

function parseCreateProjectInput(
  input: CreateProjectInput,
): ProjectResult<CreateProjectInput> {
  const name = input.name.trim();
  if (name.length === 0) {
    return failure("validation_error", "Project name is required.");
  }

  return success({
    customerName: cleanOptionalText(input.customerName),
    description: cleanOptionalText(input.description),
    name,
  });
}

function cleanOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

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

function mapPhaseStateRow(row: ProjectPhaseStateRow): ProjectPhaseState {
  return {
    phaseKey: row.phase_key,
    projectId: row.project_id,
    state: row.state_json,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version,
  };
}

function mapActivityRow(row: ProjectActivityEventRow): ProjectActivityEvent {
  return {
    actorId: row.actor_id,
    createdAt: row.created_at,
    eventType: row.event_type,
    id: row.id,
    payload: row.event_payload,
    projectId: row.project_id,
  };
}

function mapSupabaseError(
  error: SupabaseError,
  fallbackMessage: string,
): ProjectFailure {
  if (error.code === "42501") {
    return failure("forbidden", fallbackMessage);
  }

  if (error.code === "PGRST116") {
    return failure("not_found", fallbackMessage);
  }

  if (error.code === "23505") {
    return failure("conflict", fallbackMessage);
  }

  if (error.code?.startsWith("23")) {
    return failure("validation_error", fallbackMessage);
  }

  return failure("forbidden", fallbackMessage);
}

function isValidPhaseKey(value: string) {
  return /^[a-z0-9][a-z0-9_-]*$/.test(value);
}
