export type ProjectRole = "viewer" | "editor" | "owner";

export type ProjectCapability =
  | "read_project"
  | "edit_project_state"
  | "upload_project_file"
  | "manage_project_settings"
  | "manage_project_members"
  | "archive_project"
  | "delete_project";

export type ProjectResultStatus =
  | "success"
  | "not_authenticated"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "internal_error";

export type ProjectSuccess<T> = {
  data: T;
  ok: true;
  status: "success";
};

export type ProjectFailure = {
  message: string;
  ok: false;
  status: Exclude<ProjectResultStatus, "success">;
};

export type ProjectResult<T> = ProjectFailure | ProjectSuccess<T>;

export type CurrentUser = {
  email: string | null;
  emailConfirmedAt: string | null;
  id: string;
};

export type CurrentUserProfile = CurrentUser & {
  name: string | null;
};

export type Project = {
  archivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  customerName: string | null;
  description: string | null;
  id: string;
  name: string;
  status: "active" | "archived" | "deleted";
  updatedAt: string;
  updatedBy: string | null;
};

export type ProjectListItem = Project & {
  currentUserRole: ProjectRole;
};

export type ProjectPhaseState = {
  phaseKey: string;
  projectId: string;
  state: unknown;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
};

export type ProjectActivityEvent = {
  actorId: string | null;
  createdAt: string;
  eventType: string;
  id: string;
  payload: unknown;
  projectId: string;
};

export type ProjectInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type ProjectInvite = {
  acceptedAt: string | null;
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  invitedBy: string | null;
  projectId: string;
  revokedAt: string | null;
  role: ProjectRole;
  status: ProjectInviteStatus;
  updatedAt: string;
};

export type CreateProjectInput = {
  customerName?: string | null;
  description?: string | null;
  name: string;
};

export type CreateProjectActionState = {
  message: string | null;
  status: "idle" | "error";
};

export function success<T>(data: T): ProjectSuccess<T> {
  return { data, ok: true, status: "success" };
}

export function failure(
  status: ProjectFailure["status"],
  message: string,
): ProjectFailure {
  return { message, ok: false, status };
}
