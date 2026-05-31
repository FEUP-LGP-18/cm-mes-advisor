import { Phase1ProjectProvider } from "@/components/phase1/project-provider";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";
import {
  getProjectCapabilities,
  getProjectRole,
  requireProjectCapability,
} from "@/lib/projects/permissions.server";
import {
  getProjectForUser,
  getProjectPhaseState,
} from "@/lib/projects/repository.server";
import type {
  CurrentUser,
  Project,
  ProjectCapability,
  ProjectRole,
} from "@/lib/projects/types";
import {
  createProjectRecordFromPersistedPhase1State,
  PHASE1_PERSISTED_STATE_KEY,
  parsePersistedPhase1State,
  type PersistedPhase1State,
} from "@/lib/phase1/persisted-state";
import {
  defaultSettingsBehaviorSnapshot,
  normalizeSettingsBehaviorSnapshot,
  SETTINGS_BEHAVIOR_STATE_KEY,
  type SettingsBehaviorSnapshot,
} from "@/lib/settings";
import {
  parseRequirementsWorkspaceState,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notFound } from "next/navigation";
import { connection } from "next/server";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const [resolvedParams, { workspaceState }] = await Promise.all([
    params,
    getFixtureWorkspaceState(),
  ]);
  const projectId = Array.isArray(resolvedParams.projectId)
    ? resolvedParams.projectId[0]
    : resolvedParams.projectId;

  if (!projectId) {
    throw new Error("Project route is missing the projectId parameter.");
  }

  let initialServerProject: Project | null = null;
  let initialServerWorkspaceState: RequirementsWorkspaceState | null = null;
  let initialServerPhase1State: PersistedPhase1State | null = null;
  let initialServerPhase1Version = 0;
  let initialSettingsBehaviorSnapshot: SettingsBehaviorSnapshot =
    defaultSettingsBehaviorSnapshot;
  let initialCurrentUser: CurrentUser | null = null;
  let initialCurrentUserCapabilities: ProjectCapability[] = [];
  let initialCurrentUserRole: ProjectRole | null = null;
  let initialCanUploadWorkbook = true;
  let initialCanEditPhase1 = true;

  if (isSupabaseConfigured()) {
    const capabilityResult = await requireProjectCapability(
      projectId,
      "read_project",
    );
    if (!capabilityResult.ok) {
      notFound();
    }
    initialCurrentUser = capabilityResult.data;
    const capabilitiesResult = await getProjectCapabilities(
      projectId,
      capabilityResult.data.id,
    );
    initialCurrentUserCapabilities = capabilitiesResult.ok
      ? capabilitiesResult.data
      : [];
    initialCanUploadWorkbook =
      initialCurrentUserCapabilities.includes("upload_project_file");
    initialCanEditPhase1 =
      initialCurrentUserCapabilities.includes("edit_project_state");
    const roleResult = await getProjectRole(projectId, capabilityResult.data.id);
    initialCurrentUserRole = roleResult.ok ? roleResult.data : null;

    const projectResult = await getProjectForUser(
      projectId,
      capabilityResult.data.id,
    );
    if (!projectResult.ok) {
      notFound();
    }
    initialServerProject = projectResult.data;

    const settingsStateResult = await getProjectPhaseState(
      projectId,
      SETTINGS_BEHAVIOR_STATE_KEY,
      capabilityResult.data.id,
    );
    if (!settingsStateResult.ok) {
      throw new Error(settingsStateResult.message);
    }
    initialSettingsBehaviorSnapshot = normalizeSettingsBehaviorSnapshot(
      settingsStateResult.data?.state,
    );

    const phase1StateResult = await getProjectPhaseState(
      projectId,
      PHASE1_PERSISTED_STATE_KEY,
      capabilityResult.data.id,
    );
    if (!phase1StateResult.ok) {
      throw new Error(phase1StateResult.message);
    }

    if (phase1StateResult.data) {
      initialServerPhase1State = parsePersistedPhase1State(
        phase1StateResult.data.state,
        workspaceState,
      );
      if (!initialServerPhase1State) {
        throw new Error("Saved Phase 1 state could not be loaded.");
      }
      initialServerPhase1Version = phase1StateResult.data.version;
      initialServerWorkspaceState =
        createProjectRecordFromPersistedPhase1State(
          initialServerPhase1State,
          {
            createdAt: projectResult.data.createdAt,
            projectId: projectResult.data.id,
            updatedAt: projectResult.data.updatedAt,
          },
        ).workspaceState;
    } else {
      const sourceStateResult = await getProjectPhaseState(
        projectId,
        "source",
        capabilityResult.data.id,
      );
      if (!sourceStateResult.ok) {
        throw new Error(sourceStateResult.message);
      }

      if (sourceStateResult.data) {
        initialServerWorkspaceState = parseRequirementsWorkspaceState(
          sourceStateResult.data.state,
          workspaceState,
        );
      }
    }
  }

  return (
    <Phase1ProjectProvider
      fallbackWorkspaceState={workspaceState}
      initialCanEditPhase1={initialCanEditPhase1}
      initialCanUploadWorkbook={initialCanUploadWorkbook}
      initialCurrentUserCapabilities={initialCurrentUserCapabilities}
      initialCurrentUser={initialCurrentUser}
      initialCurrentUserRole={initialCurrentUserRole}
      initialServerPhase1State={initialServerPhase1State}
      initialServerPhase1Version={initialServerPhase1Version}
      initialServerProject={initialServerProject}
      initialServerWorkspaceState={initialServerWorkspaceState}
      initialSettingsBehaviorSnapshot={initialSettingsBehaviorSnapshot}
      routeProjectId={projectId}
    >
      {children}
    </Phase1ProjectProvider>
  );
}
