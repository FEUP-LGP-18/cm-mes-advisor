"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import type { ParsedRequirement } from "@/lib/requirements/types";
import {
  createFixtureWorkspaceStateForProject,
  createUploadedWorkspaceStateForProject,
  getPhase1Project,
  loadPhase1ProjectRegistry,
  savePhase1ProjectRegistry,
  setActivePhase1Project,
  summarizePhase1Workspace,
  touchPhase1ProjectStep,
  updatePhase1ProjectRecord,
  upsertPhase1Project,
  type Phase1ProjectRecord,
  type Phase1ProjectRegistry,
} from "@/lib/phase1/project-registry";
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

interface Phase1ProjectContextValue {
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
  project: Phase1ProjectRecord | null;
  registry: Phase1ProjectRegistry | null;
  reviewRequirements: ReviewRequirement[];
  routeProjectId: string;
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
  routeProjectId,
}: PropsWithChildren<{
  fallbackWorkspaceState: RequirementsWorkspaceState;
  routeProjectId: string;
}>) {
  const [registry, setRegistry] = useState<Phase1ProjectRegistry | null>(null);
  const [sourceFeedback, setSourceFeedback] = useState<SourceFeedback | null>(
    null,
  );
  const [generationFeedback, setGenerationFeedback] =
    useState<GenerationFeedback | null>(null);
  const [lastGenerationMode, setLastGenerationMode] =
    useState<RequirementGenerationRouteMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockGenerationRun, setMockGenerationRun] =
    useState<MockGenerationRunState>(createIdleGenerationRun);

  useEffect(() => {
    const nextRegistry = loadPhase1ProjectRegistry(
      window.localStorage,
      fallbackWorkspaceState,
    );

    setRegistry(nextRegistry);
  }, [fallbackWorkspaceState]);

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
  const nextAction = useMemo(
    () => getNextAction(workflowSnapshot),
    [workflowSnapshot],
  );

  useEffect(() => {
    if (
      !project ||
      !registry ||
      registry.activeProjectId === project.projectId
    ) {
      return;
    }

    const nextRegistry = setActivePhase1Project(registry, project.projectId);
    savePhase1ProjectRegistry(window.localStorage, nextRegistry);
    setRegistry(nextRegistry);
  }, [project, registry]);

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

        savePhase1ProjectRegistry(window.localStorage, nextRegistry);

        return nextRegistry;
      });
    },
    [routeProjectId],
  );

  const setCurrentStep = useCallback(
    (step: Phase1WorkflowStep) => {
      if (!project) {
        return;
      }

      persistProject((currentProject) =>
        touchPhase1ProjectStep(currentProject, step),
      );
    },
    [persistProject, project],
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
    [persistProject, project, workspaceState],
  );

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

    const nextWorkspaceState = createFixtureWorkspaceStateForProject(
      project,
      fallbackWorkspaceState,
    );

    updateWorkspaceState(nextWorkspaceState, "source");
    setSourceFeedback({
      tone: "success",
      message: "Restored the sample workbook for this project.",
    });
  }, [fallbackWorkspaceState, project, updateWorkspaceState]);

  const uploadWorkbook = useCallback(
    async (file: File) => {
      if (!project) {
        return false;
      }

      setSourceFeedback(null);

      try {
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
    [project, updateWorkspaceState],
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
    [isGenerating, project, updateWorkspaceState, workspaceState],
  );

  const value = useMemo<Phase1ProjectContextValue>(
    () => ({
      currentSourceMetadata:
        workspaceState?.source ?? fallbackWorkspaceState.source,
      demoRequirements,
      demoScriptAssembly,
      fallbackWorkspaceState,
      generatedRequirements,
      generatedReviewableRequirements,
      generationFeedback,
      isGenerating,
      isHydrated: registry !== null,
      lastGenerationMode,
      mockGenerationRun,
      nextAction,
      project,
      registry,
      reviewRequirements,
      routeProjectId,
      setCurrentStep,
      sourceFeedback,
      summary,
      uploadWorkbook,
      workflowProgress,
      workflowSnapshot,
      workspaceState,
      updateDemoScriptDraft: updateDemoScriptDraftAction,
      updateRequirementReview,
      restoreFixtureSource,
      generateRows,
    }),
    [
      demoRequirements,
      demoScriptAssembly,
      fallbackWorkspaceState,
      generateRows,
      generatedRequirements,
      generatedReviewableRequirements,
      generationFeedback,
      isGenerating,
      lastGenerationMode,
      mockGenerationRun,
      nextAction,
      project,
      registry,
      restoreFixtureSource,
      reviewRequirements,
      routeProjectId,
      setCurrentStep,
      sourceFeedback,
      summary,
      updateDemoScriptDraftAction,
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
