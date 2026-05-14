"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  assembleDemoScript,
  createDefaultDemoScriptDraft,
  type DemoScriptDraftAction,
} from "@/lib/requirements/demo-script";
import {
  mockGenerationStageLabels,
  type MockGenerationStage,
} from "@/lib/requirements/generation";
import type {
  RequirementGenerationRouteBody,
  RequirementGenerationRouteError,
  RequirementGenerationRouteMode,
  RequirementGenerationUnavailableReason,
} from "@/lib/requirements/generation-api";
import type {
  MasterDataAnalyzeRouteBody,
  MasterDataExportRouteBody,
  MasterDataGenerateRouteBody,
  MasterDataRequirementInput,
} from "@/lib/master-data/api";
import type { ParsedRequirement } from "@/lib/requirements/types";
import {
  createFixtureWorkspaceStateForProject,
  createEmptyProjectFromServerIdentity,
  createPhase1ProjectRecordFromWorkspaceState,
  createPhase1ProjectRegistry,
  createUploadedWorkspaceStateForProject,
  getPhase1Project,
  loadPhase1ProjectRegistry,
  savePhase1ProjectRegistry,
  setActivePhase1Project,
  touchMasterDataProjectStep,
  summarizePhase1Workspace,
  touchPhase1ProjectStep,
  updateMasterDataPhase2State,
  updatePhase1ProjectRecord,
  upsertPhase1Project,
  type Phase1ProjectRecord,
  type Phase1ProjectRegistry,
} from "@/lib/phase1/project-registry";
import {
  createPersistedPhase1State,
  createProjectRecordFromPersistedPhase1State,
  type PersistedPhase1State,
} from "@/lib/phase1/persisted-state";
import {
  buildReviewRequirements,
  filterReviewRequirements,
  summarizeReviewRequirements,
  updateRequirementsDemoScriptDraft,
  updateRequirementsReviewState,
  type RequirementReviewAction,
  type ReviewRequirement,
} from "@/lib/requirements/review";
import { createUploadSourceMetadata } from "@/lib/requirements/source";
import {
  createRequirementsWorkspaceState,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";
import {
  getNextAction,
  getWorkflowProgress,
  type Phase1NextAction,
  type Phase1WorkflowSnapshot,
  type Phase1WorkflowStep,
  type Phase1WorkflowStepState,
} from "@/lib/phase1/workflow";
import {
  createInitialMasterDataPhase2State,
  flattenMasterDataObjects,
  type MasterDataDraftObject,
  type MasterDataGenerationMode,
  type MasterDataObjectType,
  type MasterDataPhase2State,
  type MasterDataReviewStatus,
  type MasterDataWorkflowStep,
} from "@/lib/master-data/types";
import type { CurrentUser, Project } from "@/lib/projects/types";

type MockGenerationStageStatus = "waiting" | "running" | "complete";

interface MockGenerationStageState {
  label: MockGenerationStage;
  status: MockGenerationStageStatus;
}

interface MockGenerationRunState {
  selectedCount: number;
  generatedCount: number;
  stages: MockGenerationStageState[];
}

interface GenerationFeedback {
  tone: "neutral" | "success" | "error";
  message: string;
  code?: RequirementGenerationRouteError["code"];
  missingConfig?: string[];
  reason?: RequirementGenerationUnavailableReason;
}

interface SourceFeedback {
  tone: "neutral" | "success" | "error";
  message: string;
}

interface PersistenceFeedback {
  tone: "neutral" | "success" | "error";
  message: string;
}

type UploadWorkbookResponse =
  | {
      ok: true;
      workspaceState: RequirementsWorkspaceState;
    }
  | {
      error?: {
        message?: string;
      };
      ok: false;
    };

type SavePhase1StateResponse =
  | {
      ok: true;
      version: number;
    }
  | {
      error?: {
        currentVersion?: number;
        message?: string;
      };
      ok: false;
    };

interface Phase1ProjectContextValue {
  canEditPhase1: boolean;
  canUploadWorkbook: boolean;
  currentUser: CurrentUser | null;
  currentSourceMetadata: RequirementsWorkspaceState["source"];
  demoRequirements: ReviewRequirement[];
  demoScriptAssembly: ReturnType<typeof assembleDemoScript>;
  fallbackWorkspaceState: RequirementsWorkspaceState;
  generatedRequirements: ReviewRequirement[];
  generatedReviewableRequirements: ReviewRequirement[];
  generationFeedback: GenerationFeedback | null;
  isGenerating: boolean;
  isHydrated: boolean;
  lastGenerationMode: RequirementGenerationRouteMode | null;
  mockGenerationRun: MockGenerationRunState;
  nextAction: Phase1NextAction;
  persistenceFeedback: PersistenceFeedback | null;
  project: Phase1ProjectRecord | null;
  registry: Phase1ProjectRegistry | null;
  reviewRequirements: ReviewRequirement[];
  routeProjectId: string;
  masterDataPhase2: MasterDataPhase2State;
  masterDataObjects: MasterDataDraftObject[];
  analyzeMasterData: () => Promise<boolean>;
  downloadMasterDataPackage: () => Promise<MasterDataExportRouteBody | null>;
  generateMasterData: () => Promise<boolean>;
  setMasterDataMode: (mode: MasterDataGenerationMode) => void;
  setMasterDataStep: (step: MasterDataWorkflowStep) => void;
  setSelectedMasterDataObjectTypes: (
    objectTypes: MasterDataObjectType[],
  ) => void;
  setSelectedMasterDataRequirementKeys: (requirementKeys: string[]) => void;
  updateMasterDataObjectField: (
    objectId: string,
    fieldKey: string,
    value: string,
  ) => void;
  updateMasterDataObjectReviewStatus: (
    objectId: string,
    reviewStatus: MasterDataReviewStatus,
  ) => void;
  setCurrentStep: (step: Phase1WorkflowStep) => void;
  sourceFeedback: SourceFeedback | null;
  summary: ReturnType<typeof summarizeReviewRequirements>;
  uploadWorkbook: (file: File) => Promise<boolean>;
  workflowProgress: Phase1WorkflowStepState[];
  workflowSnapshot: Phase1WorkflowSnapshot;
  workspaceState: RequirementsWorkspaceState | null;
  updateDemoScriptDraft: (action: DemoScriptDraftAction) => void;
  updateRequirementReview: (
    requirement: ReviewRequirement,
    action: RequirementReviewAction,
  ) => void;
  restoreFixtureSource: () => void;
  generateRows: (
    targetRequirements: ReviewRequirement[],
    targetLabel: string,
    mode?: RequirementGenerationRouteMode,
  ) => Promise<boolean>;
}

const Phase1ProjectContext = createContext<Phase1ProjectContextValue | null>(
  null,
);

export function Phase1ProjectProvider({
  children,
  fallbackWorkspaceState,
  initialCanEditPhase1 = true,
  initialCanUploadWorkbook = true,
  initialCurrentUser,
  initialServerPhase1State = null,
  initialServerPhase1Version = 0,
  initialServerProject,
  initialServerWorkspaceState,
  routeProjectId,
}: PropsWithChildren<{
  fallbackWorkspaceState: RequirementsWorkspaceState;
  initialCanEditPhase1?: boolean;
  initialCanUploadWorkbook?: boolean;
  initialCurrentUser?: CurrentUser | null;
  initialServerPhase1State?: PersistedPhase1State | null;
  initialServerPhase1Version?: number;
  initialServerProject?: Project | null;
  initialServerWorkspaceState?: RequirementsWorkspaceState | null;
  routeProjectId: string;
}>) {
  const hasServerProject = Boolean(initialServerProject);
  const phase1VersionRef = useRef(initialServerPhase1Version);
  const phase1SaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [registry, setRegistry] = useState<Phase1ProjectRegistry | null>(null);
  const [sourceFeedback, setSourceFeedback] = useState<SourceFeedback | null>(
    null,
  );
  const [persistenceFeedback, setPersistenceFeedback] =
    useState<PersistenceFeedback | null>(null);
  const [generationFeedback, setGenerationFeedback] =
    useState<GenerationFeedback | null>(null);
  const [lastGenerationMode, setLastGenerationMode] =
    useState<RequirementGenerationRouteMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockGenerationRun, setMockGenerationRun] =
    useState<MockGenerationRunState>(createIdleGenerationRun);

  useEffect(() => {
    phase1VersionRef.current = initialServerPhase1Version;
  }, [initialServerPhase1Version]);

  useEffect(() => {
    let nextRegistry = hasServerProject
      ? createPhase1ProjectRegistry([], routeProjectId)
      : loadPhase1ProjectRegistry(window.localStorage, fallbackWorkspaceState);

    if (initialServerProject && initialServerPhase1State) {
      nextRegistry = upsertPhase1Project(
        nextRegistry,
        createProjectRecordFromPersistedPhase1State(initialServerPhase1State, {
          createdAt: initialServerProject.createdAt,
          projectId: initialServerProject.id,
          updatedAt: initialServerProject.updatedAt,
        }),
      );
    } else if (initialServerProject && initialServerWorkspaceState) {
      nextRegistry = upsertPhase1Project(
        nextRegistry,
        createPhase1ProjectRecordFromWorkspaceState(
          initialServerWorkspaceState,
          {
            createdAt: initialServerProject.createdAt,
            projectId: initialServerProject.id,
            updatedAt: initialServerProject.updatedAt,
          },
        ),
      );
    } else if (
      initialServerProject &&
      !getPhase1Project(nextRegistry, routeProjectId)
    ) {
      nextRegistry = upsertPhase1Project(
        nextRegistry,
        createEmptyProjectFromServerIdentity({
          createdAt: initialServerProject.createdAt,
          customerName: initialServerProject.customerName,
          projectId: initialServerProject.id,
          projectName: initialServerProject.name,
          updatedAt: initialServerProject.updatedAt,
        }),
      );
    }

    setRegistry(nextRegistry);
  }, [
    fallbackWorkspaceState,
    hasServerProject,
    initialServerPhase1State,
    initialServerProject,
    initialServerWorkspaceState,
    routeProjectId,
  ]);

  const project = useMemo(
    () => (registry ? getPhase1Project(registry, routeProjectId) : null),
    [registry, routeProjectId],
  );
  const workspaceState = project?.workspaceState ?? null;

  const reviewRequirements = useMemo(
    () =>
      workspaceState
        ? buildReviewRequirements(
            workspaceState.parsedRequirements,
            workspaceState.reviewState.requirements,
          )
        : [],
    [workspaceState],
  );
  const demoScriptAssembly = useMemo(
    () =>
      workspaceState
        ? assembleDemoScript(
            reviewRequirements,
            workspaceState.reviewState.demoScriptDraft,
          )
        : assembleDemoScript(
            [],
            createDefaultDemoScriptDraft(
              fallbackWorkspaceState.reviewState.project.projectName,
            ),
          ),
    [
      fallbackWorkspaceState.reviewState.project.projectName,
      reviewRequirements,
      workspaceState,
    ],
  );
  const summary = useMemo(
    () => summarizeReviewRequirements(reviewRequirements),
    [reviewRequirements],
  );
  const approvedMasterDataRequirementKeys = useMemo(
    () =>
      reviewRequirements
        .filter((requirement) => requirement.reviewStatus === "approved")
        .map((requirement) => requirement.requirementKey),
    [reviewRequirements],
  );
  const generatedRequirements = useMemo(
    () =>
      reviewRequirements.filter(
        (requirement) =>
          requirement.generatedOutput.state === "mock-generated-draft",
      ),
    [reviewRequirements],
  );
  const generatedReviewableRequirements = useMemo(
    () =>
      generatedRequirements.filter(
        (requirement) => requirement.reviewStatus === "pending",
      ),
    [generatedRequirements],
  );
  const demoRequirements = useMemo(
    () => filterReviewRequirements(reviewRequirements, "demo"),
    [reviewRequirements],
  );
  const workflowSnapshot = useMemo(
    () =>
      workspaceState
        ? summarizePhase1Workspace(
            workspaceState,
            project?.currentStep === "script" ||
              project?.currentStep === "export",
          )
        : createEmptyWorkflowSnapshot(),
    [project?.currentStep, workspaceState],
  );
  const workflowProgress = useMemo(
    () => getWorkflowProgress(workflowSnapshot),
    [workflowSnapshot],
  );
  const storedMasterDataPhase2 =
    project?.phase2 ?? createInitialMasterDataPhase2State();
  const masterDataPhase2 = useMemo(() => {
    const approvedRequirementKeySet = new Set(approvedMasterDataRequirementKeys);
    const applicableRequirements =
      storedMasterDataPhase2.applicableRequirements.filter((requirement) =>
        approvedRequirementKeySet.has(requirement.requirementKey),
      );
    const applicableRequirementKeySet = new Set(
      applicableRequirements.map((requirement) => requirement.requirementKey),
    );
    const selectedRequirementKeys =
      storedMasterDataPhase2.selectedRequirementKeys.filter((requirementKey) =>
        applicableRequirementKeySet.has(requirementKey),
      );

    return {
      ...storedMasterDataPhase2,
      applicableRequirements,
      generationFeedback:
        approvedRequirementKeySet.size === 0 &&
        storedMasterDataPhase2.currentStep === "setup"
          ? "Approve at least one Phase 1 row before starting Phase 2. Master Data setup only analyzes the approved consultant slice."
          : storedMasterDataPhase2.generationFeedback,
      mode: storedMasterDataPhase2.active
        ? storedMasterDataPhase2.mode
        : "mock",
      selectedRequirementKeys,
    };
  }, [approvedMasterDataRequirementKeys, storedMasterDataPhase2]);
  const masterDataObjects = useMemo(
    () => flattenMasterDataObjects(masterDataPhase2.generatedObjects),
    [masterDataPhase2.generatedObjects],
  );
  const nextAction = useMemo(
    () => getNextAction(workflowSnapshot),
    [workflowSnapshot],
  );

  useEffect(() => {
    if (
      hasServerProject ||
      !project ||
      !registry ||
      registry.activeProjectId === project.projectId
    ) {
      return;
    }

    const nextRegistry = setActivePhase1Project(registry, project.projectId);
    savePhase1ProjectRegistry(window.localStorage, nextRegistry);
    setRegistry(nextRegistry);
  }, [hasServerProject, project, registry]);

  const persistPhase1ProjectToServer = useCallback(
    (nextProject: Phase1ProjectRecord) => {
      if (!hasServerProject) {
        return;
      }

      if (!initialCanEditPhase1) {
        setPersistenceFeedback({
          tone: "error",
          message: "Viewers can inspect this project, but cannot save Phase 1 changes.",
        });
        return;
      }

      const persistedState = createPersistedPhase1State(nextProject);
      setPersistenceFeedback({
        tone: "neutral",
        message: "Saving Phase 1 project state...",
      });

      const saveProject = async (): Promise<void> => {
          const expectedVersion = phase1VersionRef.current;
          const response = await fetch(
            `/projects/${nextProject.projectId}/phase1/state`,
            {
              body: JSON.stringify({
                expectedVersion,
                state: persistedState,
              }),
              headers: {
                "content-type": "application/json",
              },
              method: "PATCH",
            },
          );
          const responseBody = (await response
            .json()
            .catch(() => null)) as SavePhase1StateResponse | null;

          if (!response.ok || !responseBody?.ok) {
            setPersistenceFeedback({
              tone: "error",
              message:
                response.status === 409
                  ? "This project changed in another session. Reload to review the latest saved state before continuing."
                  : responseBody && !responseBody.ok
                    ? responseBody.error?.message ||
                      "Phase 1 changes could not be saved."
                    : "Phase 1 changes could not be saved.",
            });
            return;
          }

          phase1VersionRef.current = responseBody.version;
          setPersistenceFeedback({
            tone: "success",
            message: "Phase 1 changes saved.",
          });
      };

      phase1SaveQueueRef.current = phase1SaveQueueRef.current.then(() =>
        saveProject(),
      );

      phase1SaveQueueRef.current = phase1SaveQueueRef.current.catch(() => {
        setPersistenceFeedback({
          tone: "error",
          message: "Phase 1 changes could not be saved.",
        });
      });
    },
    [hasServerProject, initialCanEditPhase1],
  );

  const persistProject = useCallback(
    (
      nextProject:
        | Phase1ProjectRecord
        | ((currentProject: Phase1ProjectRecord) => Phase1ProjectRecord),
    ) => {
      setRegistry((currentRegistry) => {
        if (!currentRegistry) {
          return currentRegistry;
        }

        const currentProject = getPhase1Project(
          currentRegistry,
          routeProjectId,
        );
        if (!currentProject) {
          return currentRegistry;
        }

        const resolvedProject =
          typeof nextProject === "function"
            ? nextProject(currentProject)
            : nextProject;
        const nextRegistry = upsertPhase1Project(
          currentRegistry,
          resolvedProject,
        );

        if (hasServerProject) {
          persistPhase1ProjectToServer(resolvedProject);
        } else {
          savePhase1ProjectRegistry(window.localStorage, nextRegistry);
        }

        return nextRegistry;
      });
    },
    [hasServerProject, persistPhase1ProjectToServer, routeProjectId],
  );

  const setCurrentStep = useCallback(
    (step: Phase1WorkflowStep) => {
      if (!project) {
        return;
      }

      if (hasServerProject && !initialCanEditPhase1) {
        return;
      }

      persistProject((currentProject) =>
        touchPhase1ProjectStep(currentProject, step),
      );
    },
    [hasServerProject, initialCanEditPhase1, persistProject, project],
  );

  const updateWorkspaceState = useCallback(
    (
      updater:
        | RequirementsWorkspaceState
        | ((
            currentWorkspaceState: RequirementsWorkspaceState,
          ) => RequirementsWorkspaceState),
      nextStep?: Phase1WorkflowStep,
    ) => {
      if (!project || !workspaceState) {
        return;
      }

      if (hasServerProject && !initialCanEditPhase1) {
        setPersistenceFeedback({
          tone: "error",
          message: "Viewers can inspect this project, but cannot save Phase 1 changes.",
        });
        return;
      }

      persistProject((currentProject) => {
        const currentWorkspaceState = currentProject.workspaceState;
        const resolvedWorkspaceState =
          typeof updater === "function"
            ? updater(currentWorkspaceState)
            : updater;

        return updatePhase1ProjectRecord(
          currentProject,
          resolvedWorkspaceState,
          nextStep ?? currentProject.currentStep,
        );
      });
    },
    [
      hasServerProject,
      initialCanEditPhase1,
      persistProject,
      project,
      workspaceState,
    ],
  );

  const updateMasterDataState = useCallback(
    (
      updater:
        | MasterDataPhase2State
        | ((currentState: MasterDataPhase2State) => MasterDataPhase2State),
    ) => {
      if (!project) {
        return;
      }

      if (hasServerProject && !initialCanEditPhase1) {
        setPersistenceFeedback({
          tone: "error",
          message: "Viewers can inspect this project, but cannot save Phase 1 changes.",
        });
        return;
      }

      persistProject((currentProject) =>
        updateMasterDataPhase2State(currentProject, updater),
      );
    },
    [hasServerProject, initialCanEditPhase1, persistProject, project],
  );

  useEffect(() => {
    if (!project) {
      return;
    }

    const shouldNormalizeApplicableRequirements =
      !haveSameKeys(
        storedMasterDataPhase2.applicableRequirements.map(
          (requirement) => requirement.requirementKey,
        ),
        masterDataPhase2.applicableRequirements.map(
          (requirement) => requirement.requirementKey,
        ),
      );
    const shouldNormalizeSelectedRequirementKeys = !haveSameKeys(
      storedMasterDataPhase2.selectedRequirementKeys,
      masterDataPhase2.selectedRequirementKeys,
    );
    const shouldNormalizeFeedback =
      storedMasterDataPhase2.generationFeedback !==
      masterDataPhase2.generationFeedback;
    const shouldNormalizeMode =
      storedMasterDataPhase2.mode !== masterDataPhase2.mode;

    if (
      !shouldNormalizeApplicableRequirements &&
      !shouldNormalizeSelectedRequirementKeys &&
      !shouldNormalizeFeedback &&
      !shouldNormalizeMode
    ) {
      return;
    }

    updateMasterDataState((currentState) => ({
      ...currentState,
      applicableRequirements: masterDataPhase2.applicableRequirements,
      generationFeedback: masterDataPhase2.generationFeedback,
      mode: masterDataPhase2.mode,
      selectedRequirementKeys: masterDataPhase2.selectedRequirementKeys,
    }));
  }, [
    masterDataPhase2.generationFeedback,
    masterDataPhase2.mode,
    masterDataPhase2.selectedRequirementKeys,
    masterDataPhase2.applicableRequirements,
    project,
    storedMasterDataPhase2.applicableRequirements,
    storedMasterDataPhase2.generationFeedback,
    storedMasterDataPhase2.mode,
    storedMasterDataPhase2.selectedRequirementKeys,
    updateMasterDataState,
  ]);

  const updateRequirementReview = useCallback(
    (requirement: ReviewRequirement, action: RequirementReviewAction) => {
      updateWorkspaceState((currentWorkspaceState) => ({
        ...currentWorkspaceState,
        reviewState: updateRequirementsReviewState(
          currentWorkspaceState.reviewState,
          requirement,
          action,
        ),
      }));
    },
    [updateWorkspaceState],
  );

  const updateDemoScriptDraftAction = useCallback(
    (action: DemoScriptDraftAction) => {
      updateWorkspaceState((currentWorkspaceState) => ({
        ...currentWorkspaceState,
        reviewState: updateRequirementsDemoScriptDraft(
          currentWorkspaceState.reviewState,
          action,
        ),
      }));
    },
    [updateWorkspaceState],
  );

  const restoreFixtureSource = useCallback(() => {
    if (!project) {
      return;
    }

    if (hasServerProject && !initialCanEditPhase1) {
      setSourceFeedback({
        tone: "error",
        message: "Viewers can inspect workbook sources, but cannot replace them.",
      });
      return;
    }

    const nextWorkspaceState = createFixtureWorkspaceStateForProject(
      project,
      fallbackWorkspaceState,
    );

    updateWorkspaceState(nextWorkspaceState, "source");
    setSourceFeedback({
      tone: "success",
      message: "Restored the sample workbook for this project.",
    });
  }, [
    fallbackWorkspaceState,
    hasServerProject,
    initialCanEditPhase1,
    project,
    updateWorkspaceState,
  ]);

  const uploadWorkbook = useCallback(
    async (file: File) => {
      if (!project) {
        return false;
      }

      if (hasServerProject && !initialCanUploadWorkbook) {
        setSourceFeedback({
          tone: "error",
          message: "Viewers can inspect workbook sources, but cannot upload or replace them.",
        });
        return false;
      }

      setSourceFeedback({
        tone: "neutral",
        message: hasServerProject
          ? "Uploading, validating, and saving the workbook source..."
          : "Parsing the workbook in this browser...",
      });

      try {
        if (hasServerProject) {
          const formData = new FormData();
          formData.append("workbook", file);

          const response = await fetch(
            `/projects/${project.projectId}/source/upload`,
            {
              body: formData,
              method: "POST",
            },
          );
          const responseBody = (await response.json().catch(() => null)) as
            | UploadWorkbookResponse
            | null;

          if (!response.ok || !responseBody?.ok) {
            setSourceFeedback({
              tone: "error",
              message:
                responseBody && !responseBody.ok
                  ? responseBody.error?.message ||
                    "The uploaded workbook could not be saved."
                  : "The uploaded workbook could not be saved.",
            });
            return false;
          }

          updateWorkspaceState(responseBody.workspaceState, "source");
          setSourceFeedback({
            tone: "success",
            message: `Saved ${file.name}. Collaborators will see this workbook source when they reopen the project.`,
          });

          return true;
        }

        const workbookBuffer = await file.arrayBuffer();
        const { parseRequirementsWorkbook } = await import(
          "@/lib/requirements/parser"
        );
        const parsedRequirements =
          await parseRequirementsWorkbook(workbookBuffer);
        const sourceMetadata = createUploadSourceMetadata(
          file.name,
          workbookBuffer,
        );
        const uploadedWorkspaceState = createRequirementsWorkspaceState(
          sourceMetadata,
          parsedRequirements,
        );
        const nextWorkspaceState = createUploadedWorkspaceStateForProject(
          project,
          uploadedWorkspaceState,
        );

        updateWorkspaceState(nextWorkspaceState, "source");
        setSourceFeedback({
          tone: "success",
          message: `Loaded ${file.name}. Review the parsed workbook below, then continue to generation.`,
        });

        return true;
      } catch (error) {
        setSourceFeedback({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "The uploaded workbook could not be parsed.",
        });

        return false;
      }
    },
    [
      hasServerProject,
      initialCanUploadWorkbook,
      project,
      updateWorkspaceState,
    ],
  );

  const generateRows = useCallback(
    async (
      targetRequirements: ReviewRequirement[],
      targetLabel: string,
      mode?: RequirementGenerationRouteMode,
    ) => {
      if (
        !project ||
        !workspaceState ||
        targetRequirements.length === 0 ||
        isGenerating
      ) {
        setMockGenerationRun(createIdleGenerationRun());
        return false;
      }

      if (hasServerProject && !initialCanEditPhase1) {
        setGenerationFeedback({
          tone: "error",
          message: "Viewers can inspect generated drafts, but cannot save workflow changes.",
        });
        return false;
      }

      setIsGenerating(true);
      setGenerationFeedback(null);
      setMockGenerationRun({
        selectedCount: targetRequirements.length,
        generatedCount: 0,
        stages: mockGenerationStageLabels.map((label, index) => ({
          label,
          status: index === 0 ? "running" : "waiting",
        })),
      });

      try {
        const response = await fetch("/api/requirements/generate", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            mode,
            projectId: project.projectId,
            requirements: targetRequirements.map(
              toGenerationRequestRequirement,
            ),
          }),
        });

        const responseBody = (await response
          .json()
          .catch(() => null)) as RequirementGenerationRouteBody | null;

        if (!response.ok || !responseBody || !responseBody.ok) {
          setLastGenerationMode(null);
          const message =
            responseBody && !responseBody.ok
              ? responseBody.error.message
              : `Server generation failed with status ${response.status}.`;
          setGenerationFeedback({
            tone: "error",
            message:
              message ||
              "Server generation failed. The saved review state was not changed.",
            code:
              responseBody && !responseBody.ok
                ? responseBody.error.code
                : "generation-failed",
            missingConfig:
              responseBody && !responseBody.ok
                ? responseBody.error.missingConfig
                : undefined,
            reason:
              responseBody && !responseBody.ok
                ? responseBody.error.reason
                : undefined,
          });
          setMockGenerationRun(createIdleGenerationRun());
          return false;
        }

        const draftsByRequirementKey = new Map(
          responseBody.drafts.map((draft) => [
            draft.requirement.requirementKey,
            draft,
          ]),
        );
        const targetRequirementKeys = targetRequirements.map(
          (requirement) => requirement.requirementKey,
        );
        const responseRequirementKeys = responseBody.drafts.map(
          (draft) => draft.requirement.requirementKey,
        );
        const responseMatchesSelection =
          responseBody.drafts.length === targetRequirements.length &&
          targetRequirementKeys.every((requirementKey, index) => {
            const draftKey = responseRequirementKeys[index];
            return requirementKey === draftKey;
          });

        if (!responseMatchesSelection) {
          setGenerationFeedback({
            tone: "error",
            message:
              "Server generation returned drafts that did not match the selected rows. The saved review state was not changed.",
          });
          setMockGenerationRun(createIdleGenerationRun());
          return false;
        }

        updateWorkspaceState((currentWorkspaceState) => {
          const nextReviewState = targetRequirements.reduce(
            (state, requirement) => {
              const draft = draftsByRequirementKey.get(
                requirement.requirementKey,
              );

              if (!draft) {
                return state;
              }

              return updateRequirementsReviewState(state, requirement, {
                type: "storeMockGeneratedDraft",
                generatedOutput: draft,
              });
            },
            currentWorkspaceState.reviewState,
          );

          return {
            ...currentWorkspaceState,
            reviewState: nextReviewState,
          };
        }, "review");
        setLastGenerationMode(responseBody.mode);
        setMockGenerationRun({
          selectedCount: targetRequirements.length,
          generatedCount: responseBody.drafts.length,
          stages: mockGenerationStageLabels.map((label) => ({
            label,
            status: "complete",
          })),
        });
        setGenerationFeedback({
          tone: "success",
          message:
            responseBody.mode === "real"
              ? `Generated ${responseBody.drafts.length} grounded draft(s) for ${targetLabel}.`
              : `Generated ${responseBody.drafts.length} draft(s) for ${targetLabel}.`,
          code: undefined,
          missingConfig: undefined,
          reason: undefined,
        });

        return true;
      } catch {
        setLastGenerationMode(null);
        setGenerationFeedback({
          tone: "error",
          message:
            "Server generation could not be reached. The saved review state was not changed.",
          code: "generation-failed",
          missingConfig: undefined,
          reason: undefined,
        });
        setMockGenerationRun(createIdleGenerationRun());
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      hasServerProject,
      initialCanEditPhase1,
      isGenerating,
      project,
      updateWorkspaceState,
      workspaceState,
    ],
  );

  const setMasterDataStep = useCallback(
    (step: MasterDataWorkflowStep) => {
      if (!project) {
        return;
      }

      if (hasServerProject && !initialCanEditPhase1) {
        setPersistenceFeedback({
          tone: "error",
          message: "Viewers can inspect this project, but cannot save Phase 1 changes.",
        });
        return;
      }

      persistProject((currentProject) =>
        touchMasterDataProjectStep(currentProject, step),
      );
    },
    [hasServerProject, initialCanEditPhase1, persistProject, project],
  );

  const setMasterDataMode = useCallback(
    (mode: MasterDataGenerationMode) => {
      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        generationFeedback:
          currentState.generationStatus === "error" && mode === "mock"
            ? "Prototype drafts selected. Return to processing when you are ready to retry without the grounded generation config."
            : currentState.generationFeedback,
        generationStatus:
          currentState.generationStatus === "error"
            ? "idle"
            : currentState.generationStatus,
        mode,
      }));
    },
    [updateMasterDataState],
  );

  const setSelectedMasterDataRequirementKeys = useCallback(
    (requirementKeys: string[]) => {
      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        selectedRequirementKeys: requirementKeys,
      }));
    },
    [updateMasterDataState],
  );

  const setSelectedMasterDataObjectTypes = useCallback(
    (objectTypes: MasterDataObjectType[]) => {
      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        selectedObjectTypes: objectTypes,
      }));
    },
    [updateMasterDataState],
  );

  const analyzeMasterData = useCallback(async () => {
    if (!project) {
      return false;
    }

    const approvedRequirementKeys = reviewRequirements
      .filter((requirement) => requirement.reviewStatus === "approved")
      .map((requirement) => requirement.requirementKey);

    try {
      const response = await fetch("/api/master-data/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          approvedRequirementKeys,
          requirements: reviewRequirements.map(toMasterDataRequirementInput),
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as
        | MasterDataAnalyzeRouteBody
        | null;

      if (!response.ok || !responseBody || !responseBody.ok) {
        updateMasterDataState((currentState) => ({
          ...currentState,
          active: true,
          currentStep: "setup",
          generationFeedback:
            responseBody && !responseBody.ok
              ? responseBody.error.message
              : "Master Data analysis could not be completed.",
        }));
        return false;
      }

      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        currentStep: "setup",
        applicableRequirements: responseBody.applicableRequirements,
        selectedRequirementKeys: (() => {
          const applicableRequirementKeys = new Set(
            responseBody.applicableRequirements.map(
              (requirement) => requirement.requirementKey,
            ),
          );
          const retainedSelection = currentState.selectedRequirementKeys.filter(
            (requirementKey) => applicableRequirementKeys.has(requirementKey),
          );

          if (retainedSelection.length > 0) {
            return retainedSelection;
          }

          return responseBody.applicableRequirements
            .filter((requirement) => requirement.preselected)
            .map((requirement) => requirement.requirementKey);
        })(),
        selectedObjectTypes:
          currentState.selectedObjectTypes.length > 0
            ? currentState.selectedObjectTypes
            : responseBody.suggestedObjectTypes,
        generationFeedback:
          responseBody.warnings.length > 0
            ? responseBody.warnings.join(" ")
            : "Phase 2 setup is ready for generation.",
      }));
      return true;
    } catch {
      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        currentStep: "setup",
        generationFeedback:
          "Master Data analysis could not be reached. The saved project state was not changed.",
      }));
      return false;
    }
  }, [project, reviewRequirements, updateMasterDataState]);

  const generateMasterData = useCallback(async () => {
    if (!project) {
      return false;
    }

    const phase2State = masterDataPhase2;
    const selectedRequirementKeys = phase2State.selectedRequirementKeys;
    const selectedObjectTypes = phase2State.selectedObjectTypes;

    if (
      selectedRequirementKeys.length === 0 ||
      selectedObjectTypes.length === 0
    ) {
      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        currentStep: "setup",
        generationFeedback:
          "Choose at least one applicable requirement and one object type before generating Master Data.",
      }));
      return false;
    }

    updateMasterDataState((currentState) => ({
      ...currentState,
      active: true,
      currentStep: "process",
      generationStatus: "running",
      generationFeedback: "Generating Master Data drafts for the selected slice.",
      generationLogs: [
        {
          id: "process:start",
          stage: "analysis",
          status: "running",
          message: `Preparing ${selectedRequirementKeys.length} requirement(s) for Master Data generation.`,
        },
      ],
    }));

    try {
      const response = await fetch("/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: phase2State.mode,
          project: {
            customerName: project.customerName,
            projectId: project.projectId,
            projectName: project.projectName,
          },
          requirements: reviewRequirements.map(toMasterDataRequirementInput),
          selectedObjectTypes,
          selectedRequirementKeys,
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as
        | MasterDataGenerateRouteBody
        | null;

      if (!response.ok || !responseBody || !responseBody.ok) {
        updateMasterDataState((currentState) => ({
          ...currentState,
          active: true,
          currentStep: "process",
          generationStatus: "error",
          generationFeedback:
            responseBody && !responseBody.ok
              ? responseBody.error.message
              : "Master Data generation failed before drafts could be created.",
        }));
        return false;
      }

      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        currentStep: "review",
        generationStatus: "ready",
        generationFeedback:
          responseBody.warnings.length > 0
            ? responseBody.warnings.join(" ")
            : `Generated ${flattenMasterDataObjects(responseBody.generatedObjects).length} Master Data draft object(s).`,
        generatedAt: responseBody.generatedAt,
        generationLogs: responseBody.logs,
        generatedObjects: responseBody.generatedObjects,
        traceability: responseBody.traceability,
        exportSummary: null,
      }));
      return true;
    } catch {
      updateMasterDataState((currentState) => ({
        ...currentState,
        active: true,
        currentStep: "process",
        generationStatus: "error",
        generationFeedback:
          "The Master Data generation route could not be reached right now.",
      }));
      return false;
    }
  }, [masterDataPhase2, project, reviewRequirements, updateMasterDataState]);

  const updateMasterDataObjectField = useCallback(
    (objectId: string, fieldKey: string, value: string) => {
      updateMasterDataState((currentState) => ({
        ...currentState,
        generatedObjects: Object.fromEntries(
          Object.entries(currentState.generatedObjects).map(
            ([objectType, objects]) => [
              objectType,
              objects.map((objectDraft) => {
                if (objectDraft.objectId !== objectId) {
                  return objectDraft;
                }

                return {
                  ...objectDraft,
                  modified: true,
                  fields: objectDraft.fields.map((field) =>
                    field.key === fieldKey
                      ? {
                          ...field,
                          modified: true,
                          source: "manual",
                          value,
                          warning: null,
                        }
                      : field,
                  ),
                };
              }),
            ],
          ),
        ) as MasterDataPhase2State["generatedObjects"],
      }));
    },
    [updateMasterDataState],
  );

  const updateMasterDataObjectReviewStatus = useCallback(
    (objectId: string, reviewStatus: MasterDataReviewStatus) => {
      updateMasterDataState((currentState) => ({
        ...currentState,
        generatedObjects: Object.fromEntries(
          Object.entries(currentState.generatedObjects).map(
            ([objectType, objects]) => [
              objectType,
              objects.map((objectDraft) =>
                objectDraft.objectId === objectId
                  ? {
                      ...objectDraft,
                      reviewStatus,
                    }
                  : objectDraft,
              ),
            ],
          ),
        ) as MasterDataPhase2State["generatedObjects"],
      }));
    },
    [updateMasterDataState],
  );

  const downloadMasterDataPackage = useCallback(async () => {
    if (!project) {
      return null;
    }

    const response = await fetch("/api/master-data/export", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        generatedAt: project.phase2.generatedAt,
        project: {
          customerName: project.customerName,
          projectId: project.projectId,
          projectName: project.projectName,
        },
        generatedObjects: project.phase2.generatedObjects,
        traceability: project.phase2.traceability,
      }),
    });
    const responseBody = (await response.json().catch(() => null)) as
      | MasterDataExportRouteBody
      | null;

    if (!response.ok || !responseBody || !responseBody.ok) {
      updateMasterDataState((currentState) => ({
        ...currentState,
        generationFeedback:
          responseBody && !responseBody.ok
            ? responseBody.error.message
            : "The Master Data package could not be exported.",
      }));
      return responseBody;
    }

    const bytes = Uint8Array.from(atob(responseBody.packageBase64), (character) =>
      character.charCodeAt(0),
    );
    const blob = new Blob([bytes], {
      type: responseBody.mimeType,
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = responseBody.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);

    updateMasterDataState((currentState) => ({
      ...currentState,
      active: true,
      currentStep: "export",
      exportSummary: responseBody.summary,
      generationFeedback: "Master Data package download is ready.",
    }));

    return responseBody;
  }, [project, updateMasterDataState]);

  const value = useMemo<Phase1ProjectContextValue>(
    () => ({
      canEditPhase1: initialCanEditPhase1,
      canUploadWorkbook: initialCanUploadWorkbook,
      currentUser: initialCurrentUser ?? null,
      currentSourceMetadata:
        workspaceState?.source ?? fallbackWorkspaceState.source,
      analyzeMasterData,
      demoRequirements,
      demoScriptAssembly,
      downloadMasterDataPackage,
      fallbackWorkspaceState,
      generateMasterData,
      generatedRequirements,
      generatedReviewableRequirements,
      generationFeedback,
      isGenerating,
      isHydrated: registry !== null,
      lastGenerationMode,
      masterDataObjects,
      masterDataPhase2,
      mockGenerationRun,
      nextAction,
      persistenceFeedback,
      project,
      registry,
      reviewRequirements,
      routeProjectId,
      setMasterDataMode,
      setMasterDataStep,
      setSelectedMasterDataObjectTypes,
      setSelectedMasterDataRequirementKeys,
      setCurrentStep,
      sourceFeedback,
      summary,
      uploadWorkbook,
      workflowProgress,
      workflowSnapshot,
      workspaceState,
      updateDemoScriptDraft: updateDemoScriptDraftAction,
      updateMasterDataObjectField,
      updateMasterDataObjectReviewStatus,
      updateRequirementReview,
      restoreFixtureSource,
      generateRows,
    }),
    [
      analyzeMasterData,
      initialCanEditPhase1,
      initialCanUploadWorkbook,
      initialCurrentUser,
      demoRequirements,
      demoScriptAssembly,
      downloadMasterDataPackage,
      fallbackWorkspaceState,
      generateMasterData,
      generateRows,
      generatedRequirements,
      generatedReviewableRequirements,
      generationFeedback,
      isGenerating,
      lastGenerationMode,
      masterDataObjects,
      masterDataPhase2,
      mockGenerationRun,
      nextAction,
      persistenceFeedback,
      project,
      registry,
      restoreFixtureSource,
      reviewRequirements,
      routeProjectId,
      setMasterDataMode,
      setMasterDataStep,
      setSelectedMasterDataObjectTypes,
      setSelectedMasterDataRequirementKeys,
      setCurrentStep,
      sourceFeedback,
      summary,
      updateDemoScriptDraftAction,
      updateMasterDataObjectField,
      updateMasterDataObjectReviewStatus,
      updateRequirementReview,
      uploadWorkbook,
      workflowProgress,
      workflowSnapshot,
      workspaceState,
    ],
  );

  return (
    <Phase1ProjectContext.Provider value={value}>
      {children}
    </Phase1ProjectContext.Provider>
  );
}

function toMasterDataRequirementInput(
  requirement: ReviewRequirement,
): MasterDataRequirementInput {
  return {
    ...toGenerationRequestRequirement(requirement),
    consultantComment: requirement.consultantComment,
    requirementKey: requirement.requirementKey,
    reviewNote: requirement.reviewNote,
    reviewStatus: requirement.reviewStatus,
  };
}

function haveSameKeys(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function usePhase1Project() {
  const value = useContext(Phase1ProjectContext);

  if (!value) {
    throw new Error(
      "usePhase1Project must be used inside Phase1ProjectProvider.",
    );
  }

  return value;
}

function createIdleGenerationRun(): MockGenerationRunState {
  return {
    selectedCount: 0,
    generatedCount: 0,
    stages: mockGenerationStageLabels.map((label) => ({
      label,
      status: "waiting",
    })),
  };
}

function createEmptyWorkflowSnapshot(): Phase1WorkflowSnapshot {
  return {
    sourceRowCount: 0,
    demoCount: 0,
    mvpCount: 0,
    generatedCount: 0,
    generatedReviewableCount: 0,
    approvedCount: 0,
    approvedStepCount: 0,
    selectedCount: 0,
    scriptVisited: false,
    exportReady: false,
  };
}

function toGenerationRequestRequirement(
  requirement: ParsedRequirement,
): ParsedRequirement {
  return {
    sourceRowNumber: requirement.sourceRowNumber,
    requirementId: requirement.requirementId,
    requirementDescription: requirement.requirementDescription,
    l2Process: requirement.l2Process,
    l3Process: requirement.l3Process,
    operation: requirement.operation,
    demo: requirement.demo,
    demoRaw: requirement.demoRaw,
    detailDescriptionAndMotivation: requirement.detailDescriptionAndMotivation,
    prioEms: requirement.prioEms,
    prioCws: requirement.prioCws,
    mvp: requirement.mvp,
    mvpRaw: requirement.mvpRaw,
    availability: requirement.availability,
    availabilityCm: requirement.availabilityCm,
    descriptionAvailability: requirement.descriptionAvailability,
    supportedPercent: requirement.supportedPercent,
    sourceComment: requirement.sourceComment,
  };
}
