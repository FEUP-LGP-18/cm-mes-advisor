import { NextResponse } from "next/server";
import { getFixtureWorkspaceState } from "@/lib/phase1/fixture";
import {
  createPersistedPhase1State,
  PHASE1_PERSISTED_STATE_KEY,
  parsePersistedPhase1State,
} from "@/lib/phase1/persisted-state";
import {
  applyProjectIdentity,
  createPhase1ProjectRecordFromWorkspaceState,
} from "@/lib/phase1/project-registry";
import {
  phase1WorkflowSteps,
  type Phase1WorkflowStep,
} from "@/lib/phase1/workflow";
import { requireProjectCapability } from "@/lib/projects/permissions.server";
import {
  getProjectForUser,
  getProjectPhaseState,
  saveProjectPhaseState,
} from "@/lib/projects/repository.server";
import type { ProjectFailure } from "@/lib/projects/types";

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

type SavePhase1StateBody = {
  expectedVersion?: unknown;
  state?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const resolvedParams = await context.params;
  const projectId = Array.isArray(resolvedParams.projectId)
    ? resolvedParams.projectId[0]
    : resolvedParams.projectId;

  if (!projectId) {
    return errorResponse("Project id is required.", 400);
  }

  const accessResult = await requireProjectCapability(
    projectId,
    "edit_project_state",
  );
  if (!accessResult.ok) {
    return projectFailureResponse(accessResult);
  }

  const body = (await request.json().catch(() => null)) as
    | SavePhase1StateBody
    | null;
  if (!body || typeof body.expectedVersion !== "number") {
    return errorResponse("Expected version is required.", 400);
  }

  const { workspaceState: fallbackWorkspaceState } =
    await getFixtureWorkspaceState();
  const persistedState = parsePersistedPhase1State(
    body.state,
    fallbackWorkspaceState,
  );
  if (!persistedState) {
    return errorResponse("Phase 1 state is invalid.", 400);
  }

  const projectResult = await getProjectForUser(projectId, accessResult.data.id);
  if (!projectResult.ok) {
    return projectFailureResponse(projectResult);
  }

  const projectRecord = createPhase1ProjectRecordFromWorkspaceState(
    applyProjectIdentity(persistedState.workspaceState, {
      customerName: projectResult.data.customerName?.trim() || "No customer set",
      projectId: projectResult.data.id,
      projectName: projectResult.data.name,
    }),
    {
      createdAt: projectResult.data.createdAt,
      currentStep: persistedState.currentStep,
      projectId: projectResult.data.id,
      updatedAt: projectResult.data.updatedAt,
    },
  );
  const normalizedState = createPersistedPhase1State(projectRecord);
  const saveResult = await saveProjectPhaseState(
    projectId,
    PHASE1_PERSISTED_STATE_KEY,
    normalizedState,
    body.expectedVersion,
    accessResult.data.id,
  );

  if (!saveResult.ok) {
    if (saveResult.status === "conflict") {
      const recoveredSaveResult = await recoverConflictSave({
        fallbackWorkspaceState,
        incomingState: normalizedState,
        projectId,
        userId: accessResult.data.id,
      });

      if (recoveredSaveResult?.ok) {
        return NextResponse.json({
          ok: true,
          state: normalizedState,
          version: recoveredSaveResult.version,
        });
      }

      return errorResponse(
        recoveredSaveResult?.message ?? saveResult.message,
        409,
        recoveredSaveResult?.currentVersion,
      );
    }

    return projectFailureResponse(saveResult);
  }

  return NextResponse.json({
    ok: true,
    state: normalizedState,
    version: saveResult.data.version,
  });
}

async function recoverConflictSave({
  fallbackWorkspaceState,
  incomingState,
  projectId,
  userId,
}: {
  fallbackWorkspaceState: Awaited<
    ReturnType<typeof getFixtureWorkspaceState>
  >["workspaceState"];
  incomingState: ReturnType<typeof createPersistedPhase1State>;
  projectId: string;
  userId: string;
}): Promise<
  | {
      ok: true;
      version: number;
    }
  | {
      currentVersion?: number;
      message: string;
      ok: false;
    }
> {
  const currentStateResult = await getProjectPhaseState(
    projectId,
    PHASE1_PERSISTED_STATE_KEY,
    userId,
  );
  const currentVersion = currentStateResult.ok
    ? currentStateResult.data?.version ?? 0
    : undefined;

  if (!currentStateResult.ok || !currentStateResult.data) {
    return {
      currentVersion,
      message: "Project phase state version conflict.",
      ok: false,
    };
  }

  const currentState = parsePersistedPhase1State(
    currentStateResult.data.state,
    fallbackWorkspaceState,
  );

  if (
    currentState &&
    isSameSourceState(incomingState, currentState) &&
    isPhase1StateRegression(incomingState, currentState)
  ) {
    return {
      currentVersion,
      message:
        "A newer Phase 1 workflow state is already saved. Reload to continue from the latest project state.",
      ok: false,
    };
  }

  const retrySaveResult = await saveProjectPhaseState(
    projectId,
    PHASE1_PERSISTED_STATE_KEY,
    incomingState,
    currentStateResult.data.version,
    userId,
  );

  if (!retrySaveResult.ok) {
    return {
      currentVersion,
      message: retrySaveResult.message,
      ok: false,
    };
  }

  return {
    ok: true,
    version: retrySaveResult.data.version,
  };
}

function isSameSourceState(
  incomingState: ReturnType<typeof createPersistedPhase1State>,
  currentState: ReturnType<typeof createPersistedPhase1State>,
) {
  return (
    incomingState.workspaceState.source.sourceId ===
    currentState.workspaceState.source.sourceId
  );
}

function isPhase1StateRegression(
  incomingState: ReturnType<typeof createPersistedPhase1State>,
  currentState: ReturnType<typeof createPersistedPhase1State>,
) {
  const incomingGeneratedCount = countGeneratedDrafts(incomingState);
  const currentGeneratedCount = countGeneratedDrafts(currentState);

  if (incomingGeneratedCount < currentGeneratedCount) {
    return true;
  }

  return (
    incomingGeneratedCount === currentGeneratedCount &&
    getStepRank(incomingState.currentStep) < getStepRank(currentState.currentStep)
  );
}

function countGeneratedDrafts(
  state: ReturnType<typeof createPersistedPhase1State>,
) {
  return Object.values(state.workspaceState.reviewState.requirements).filter(
    (requirement) =>
      requirement.generatedOutput.state === "mock-generated-draft",
  ).length;
}

function getStepRank(step: Phase1WorkflowStep) {
  return phase1WorkflowSteps.indexOf(step);
}

function projectFailureResponse(failure: ProjectFailure) {
  const status =
    failure.status === "not_authenticated"
      ? 401
      : failure.status === "forbidden"
        ? 403
        : failure.status === "not_found"
          ? 404
          : failure.status === "conflict"
            ? 409
            : 400;

  return errorResponse(failure.message, status);
}

function errorResponse(
  message: string,
  status: number,
  currentVersion?: number,
) {
  return NextResponse.json(
    {
      error: {
        currentVersion,
        message,
      },
      ok: false,
    },
    { status },
  );
}
