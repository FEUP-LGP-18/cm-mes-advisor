"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getMasterDataStepPath,
  getAllowedMasterDataStep,
} from "@/lib/master-data/workflow";
import type { MasterDataWorkflowStep } from "@/lib/master-data/types";
import { usePhase1Project } from "@/components/phase1/project-provider";
import MasterDataProjectShell from "./master-data-shell";
import MasterDataExportStudio from "./master-data-export-studio";
import MasterDataProcessStudio from "./master-data-process-studio";
import MasterDataReviewStudio from "./master-data-review-studio";
import MasterDataSetupStudio from "./master-data-setup-studio";
import MasterDataTraceabilityStudio from "./master-data-traceability-studio";

export default function MasterDataStepRoute({
  step,
}: {
  step: MasterDataWorkflowStep;
}) {
  const router = useRouter();
  const {
    analyzeMasterData,
    downloadMasterDataPackage,
    generateMasterData,
    generatedRequirements,
    isHydrated,
    masterDataObjects,
    masterDataPhase2,
    project,
    reviewRequirements,
    setMasterDataMode,
    setMasterDataStep,
    setSelectedMasterDataObjectTypes,
    setSelectedMasterDataRequirementKeys,
    updateMasterDataObjectField,
    updateMasterDataObjectReviewStatus,
  } = usePhase1Project();
  const allowedStep =
    isHydrated && project ? getAllowedMasterDataStep(masterDataPhase2, step) : step;

  useEffect(() => {
    if (!isHydrated || !project) {
      return;
    }

    if (allowedStep !== step) {
      router.replace(getMasterDataStepPath(project.projectId, allowedStep));
      return;
    }

    if (
      project.activeFlow !== "master-data" ||
      project.phase2.currentStep !== step
    ) {
      setMasterDataStep(step);
    }
  }, [allowedStep, isHydrated, project, router, setMasterDataStep, step]);

  if (!isHydrated || !project) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-6">
        <div className="phase-empty-state max-w-xl text-center">
          <p className="phase-overline">Loading project</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Restoring the Master Data workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--shell-muted)]">
            The saved project state is loading so the Phase 2 continuation can
            reopen the right Master Data stage.
          </p>
        </div>
      </main>
    );
  }

  return (
    <MasterDataProjectShell currentStep={step} project={project}>
      {step === "setup" ? (
        <MasterDataSetupStudio
          applicableRequirements={masterDataPhase2.applicableRequirements}
          approvedCount={
            reviewRequirements.filter((requirement) => requirement.reviewStatus === "approved")
              .length
          }
          feedback={masterDataPhase2.generationFeedback}
          hasAnalysisRun={
            masterDataPhase2.applicableRequirements.length > 0 ||
            masterDataPhase2.generationFeedback !== null
          }
          hasGeneratedPhase1Drafts={generatedRequirements.length > 0}
          mode={masterDataPhase2.mode}
          onAnalyze={analyzeMasterData}
          onContinueToProcess={() =>
            router.push(getMasterDataStepPath(project.projectId, "process"))
          }
          onModeChange={setMasterDataMode}
          onOpenPhase1Generate={() =>
            router.push(`/projects/${encodeURIComponent(project.projectId)}/generate`)
          }
          onOpenPhase1Review={() =>
            router.push(`/projects/${encodeURIComponent(project.projectId)}/review`)
          }
          onToggleObjectType={(objectType) => {
            const nextObjectTypes = masterDataPhase2.selectedObjectTypes.includes(objectType)
              ? masterDataPhase2.selectedObjectTypes.filter(
                  (entry) => entry !== objectType,
                )
              : [...masterDataPhase2.selectedObjectTypes, objectType];
            setSelectedMasterDataObjectTypes(nextObjectTypes);
          }}
          onToggleRequirement={(requirementKey) => {
            const nextKeys = masterDataPhase2.selectedRequirementKeys.includes(
              requirementKey,
            )
              ? masterDataPhase2.selectedRequirementKeys.filter(
                  (entry) => entry !== requirementKey,
                )
              : [...masterDataPhase2.selectedRequirementKeys, requirementKey];
            setSelectedMasterDataRequirementKeys(nextKeys);
          }}
          selectedObjectTypes={masterDataPhase2.selectedObjectTypes}
          selectedRequirementKeys={masterDataPhase2.selectedRequirementKeys}
        />
      ) : null}

      {step === "process" ? (
        <MasterDataProcessStudio
          onGenerate={generateMasterData}
          onOpenReview={() =>
            router.push(getMasterDataStepPath(project.projectId, "review"))
          }
          onReturnToSetup={() =>
            router.push(getMasterDataStepPath(project.projectId, "setup"))
          }
          onUsePrototypeDrafts={() => {
            setMasterDataMode("mock");
            router.push(getMasterDataStepPath(project.projectId, "setup"));
          }}
          phase2={masterDataPhase2}
        />
      ) : null}

      {step === "review" ? (
        <MasterDataReviewStudio
          onOpenExport={() =>
            router.push(getMasterDataStepPath(project.projectId, "export"))
          }
          onOpenTraceability={() =>
            router.push(getMasterDataStepPath(project.projectId, "traceability"))
          }
          onReturnToProcess={() =>
            router.push(getMasterDataStepPath(project.projectId, "process"))
          }
          onUpdateField={updateMasterDataObjectField}
          onUpdateReviewStatus={updateMasterDataObjectReviewStatus}
          phase2={masterDataPhase2}
        />
      ) : null}

      {step === "export" ? (
        <MasterDataExportStudio
          onDownload={async () => {
            await downloadMasterDataPackage();
          }}
          onOpenTraceability={() =>
            router.push(getMasterDataStepPath(project.projectId, "traceability"))
          }
          onReturnToReview={() =>
            router.push(getMasterDataStepPath(project.projectId, "review"))
          }
          phase2={masterDataPhase2}
        />
      ) : null}

      {step === "traceability" ? (
        <MasterDataTraceabilityStudio
          onReturnToExport={() =>
            router.push(getMasterDataStepPath(project.projectId, "export"))
          }
          records={masterDataPhase2.traceability}
        />
      ) : null}

      {step === "review" && masterDataObjects.length === 0 ? null : null}
    </MasterDataProjectShell>
  );
}
