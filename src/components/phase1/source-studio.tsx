"use client";

import { useState, type ChangeEvent } from "react";
import type { ReviewRequirement } from "@/lib/requirements/review";
import type { RequirementsSourceMetadata } from "@/lib/requirements/source";
import { WorkspaceSourcePanel } from "@/app/requirements-review-workspace";

interface SourceStudioProps {
  canContinue?: boolean;
  canUploadWorkbook?: boolean;
  currentSourceMetadata: RequirementsSourceMetadata;
  demoCount: number;
  mvpCount: number;
  onContinue: () => void;
  onRestoreFixtureSource: () => void;
  onUploadWorkbook: (file: File) => Promise<boolean>;
  requirements: ReviewRequirement[];
  sourceFeedback: {
    tone: "neutral" | "success" | "error";
    message: string;
  } | null;
  sourceRowCount: number;
}

export default function SourceStudio({
  canContinue = true,
  canUploadWorkbook = true,
  currentSourceMetadata,
  demoCount,
  mvpCount,
  onContinue,
  onRestoreFixtureSource,
  onUploadWorkbook,
  requirements,
  sourceFeedback,
  sourceRowCount,
}: SourceStudioProps) {
  const [sourcePreviewExpanded, setSourcePreviewExpanded] = useState(true);
  const [sourceDetailsExpanded, setSourceDetailsExpanded] = useState(
    currentSourceMetadata.sourceKind !== "fixture",
  );

  async function handleUploadWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const uploaded = await onUploadWorkbook(file);

    if (uploaded) {
      setSourcePreviewExpanded(true);
      setSourceDetailsExpanded(true);
    }
  }

  return (
    <section className="grid gap-6">
      <section className="phase-section-card">
        <div className="phase-section-copy">
          <p className="phase-overline">Source</p>
          <h2 className="phase-section-title">Confirm the source for this run</h2>
          <p className="phase-section-body">
            Use the project workbook whenever you have it. Keep the sample file
            secondary, confirm the parsed rows, and move on to generation only
            after the source looks right.
          </p>
        </div>
      </section>

      <WorkspaceSourcePanel
        canUploadWorkbook={canUploadWorkbook}
        canContinue={canContinue}
        continueHelper="Once the workbook, counts, and parsed preview look right, continue to Generate and produce the first recommended draft."
        continueLabel="Continue to Generate"
        demoCount={demoCount}
        feedback={sourceFeedback}
        mvpCount={mvpCount}
        onContinue={onContinue}
        onRestoreFixtureSource={onRestoreFixtureSource}
        onToggleDetails={() => setSourceDetailsExpanded((current) => !current)}
        onTogglePreview={() => setSourcePreviewExpanded((current) => !current)}
        onUploadWorkbook={handleUploadWorkbook}
        previewRows={requirements.slice(0, 8)}
        sourceMetadata={currentSourceMetadata}
        sourceDetailsExpanded={sourceDetailsExpanded}
        sourcePreviewExpanded={sourcePreviewExpanded}
        sourceRowCount={sourceRowCount}
      />
    </section>
  );
}
