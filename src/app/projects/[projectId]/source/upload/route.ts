import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { applyProjectIdentity } from "@/lib/phase1/project-registry";
import { requireProjectCapability } from "@/lib/projects/permissions.server";
import {
  deleteUploadedProjectFileMetadata,
  getProjectForUser,
  getProjectPhaseState,
  saveProjectFileMetadata,
  saveProjectPhaseState,
} from "@/lib/projects/repository.server";
import type { ProjectFailure } from "@/lib/projects/types";
import { parseRequirementsWorkbook } from "@/lib/requirements/parser";
import { createUploadSourceMetadata } from "@/lib/requirements/source";
import { assertRequirementsWorkbookFilename } from "@/lib/requirements/workbook-file";
import { createRequirementsWorkspaceState } from "@/lib/requirements/workspace-state";
import {
  normalizeSettingsBehaviorSnapshot,
  SETTINGS_BEHAVIOR_STATE_KEY,
} from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

const MAX_WORKBOOK_SIZE_BYTES = 10 * 1024 * 1024;
const PROJECT_FILES_BUCKET = "project-files";
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type UploadRouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function POST(request: Request, context: UploadRouteContext) {
  const resolvedParams = await context.params;
  const projectId = Array.isArray(resolvedParams.projectId)
    ? resolvedParams.projectId[0]
    : resolvedParams.projectId;

  if (!projectId) {
    return errorResponse("Project id is required.", 400, { projectId });
  }

  const accessResult = await requireProjectCapability(
    projectId,
    "upload_project_file",
  );
  if (!accessResult.ok) {
    return projectFailureResponse(accessResult);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("workbook");
  if (!(file instanceof File)) {
    return errorResponse("Choose an .xlsx workbook to upload.", 400, {
      projectId,
    });
  }

  const validationError = validateWorkbookFile(file);
  if (validationError) {
    return errorResponse(validationError, 400, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      projectId,
    });
  }

  const workbookBuffer = await file.arrayBuffer();
  let parsedRequirements;
  try {
    parsedRequirements = await parseRequirementsWorkbook(workbookBuffer);
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "The uploaded workbook could not be parsed.",
      400,
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        projectId,
      },
    );
  }

  if (parsedRequirements.length === 0) {
    return errorResponse(
      "The uploaded workbook does not contain any requirement rows.",
      400,
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        projectId,
      },
    );
  }

  const projectResult = await getProjectForUser(projectId, accessResult.data.id);
  if (!projectResult.ok) {
    return projectFailureResponse(projectResult);
  }

  const settingsStateResult = await getProjectPhaseState(
    projectId,
    SETTINGS_BEHAVIOR_STATE_KEY,
    accessResult.data.id,
  );
  if (!settingsStateResult.ok) {
    return projectFailureResponse(settingsStateResult);
  }
  const settings = normalizeSettingsBehaviorSnapshot(
    settingsStateResult.data?.state,
  );

  const checksum = createSha256Checksum(workbookBuffer);
  const uploadedAt = new Date().toISOString();
  const storageObjectPath = createWorkbookStorageObjectPath(
    projectId,
    checksum,
    uploadedAt,
  );
  const storagePath = createWorkbookStoragePath(storageObjectPath);
  const storageResult = await uploadWorkbookToStorage(
    storageObjectPath,
    workbookBuffer,
    file.type || XLSX_MIME_TYPE,
  );
  if (!storageResult.ok) {
    return errorResponse(storageResult.message, 400, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      projectId,
      storagePath,
    });
  }

  const sourceMetadata = createUploadSourceMetadata(file.name, workbookBuffer, {
    customerName: projectResult.data.customerName,
    industryTemplateId: settings.industryTemplateId,
    projectName: projectResult.data.name,
    sourceId: storagePath,
    uploadedAt,
  });
  const workspaceState = applyProjectIdentity(
    createRequirementsWorkspaceState(sourceMetadata, parsedRequirements),
    {
      customerName:
        projectResult.data.customerName?.trim() || "No customer set",
      projectId: projectResult.data.id,
      projectName: projectResult.data.name,
    },
  );
  const existingSourceState = await getProjectPhaseState(
    projectId,
    "source",
    accessResult.data.id,
  );
  if (!existingSourceState.ok) {
    await removeWorkbookFromStorage(storageObjectPath);
    return projectFailureResponse(existingSourceState);
  }

  const fileResult = await saveProjectFileMetadata(
    {
      checksum,
      filename: file.name,
      mimeType: file.type || XLSX_MIME_TYPE,
      projectId,
      sizeBytes: file.size,
      sourceMetadata: {
        ...sourceMetadata,
        parser: "phase1-requirements-v1",
        rowCount: parsedRequirements.length,
        storageBucket: PROJECT_FILES_BUCKET,
        storageMode: "supabase-storage",
        storageObjectPath,
      },
      storagePath,
    },
    accessResult.data.id,
  );
  if (!fileResult.ok) {
    await removeWorkbookFromStorage(storageObjectPath);
    return projectFailureResponse(fileResult);
  }

  const phaseStateResult = await saveProjectPhaseState(
    projectId,
    "source",
    workspaceState,
    existingSourceState.data?.version ?? 0,
    accessResult.data.id,
  );
  if (!phaseStateResult.ok) {
    const metadataCleanupResult = await deleteUploadedProjectFileMetadata(
      {
        fileId: fileResult.data.id,
        projectId,
      },
      accessResult.data.id,
    );
    if (!metadataCleanupResult.ok) {
      console.warn("Project workbook metadata cleanup failed", {
        fileId: fileResult.data.id,
        message: metadataCleanupResult.message,
        projectId,
      });
    }
    await removeWorkbookFromStorage(storageObjectPath);
    return projectFailureResponse(phaseStateResult);
  }

  return NextResponse.json({
    ok: true,
    projectFile: fileResult.data,
    workspaceState,
  });
}

function validateWorkbookFile(file: File) {
  try {
    assertRequirementsWorkbookFilename(file.name);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Only .xlsx workbooks are supported for requirements upload.";
  }

  if (file.size <= 0) {
    return "The uploaded workbook is empty.";
  }

  if (file.size > MAX_WORKBOOK_SIZE_BYTES) {
    return "The uploaded workbook is too large. Upload an .xlsx file under 10 MB.";
  }

  return null;
}

function createSha256Checksum(workbookBuffer: ArrayBuffer) {
  return createHash("sha256")
    .update(Buffer.from(workbookBuffer))
    .digest("hex");
}

function createWorkbookStorageObjectPath(
  projectId: string,
  checksum: string,
  uploadedAt: string,
) {
  return `projects/${projectId}/source/${Date.parse(
    uploadedAt,
  )}-${checksum}.xlsx`;
}

function createWorkbookStoragePath(storageObjectPath: string) {
  return `${PROJECT_FILES_BUCKET}/${storageObjectPath}`;
}

async function uploadWorkbookToStorage(
  storageObjectPath: string,
  workbookBuffer: ArrayBuffer,
  contentType: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .upload(storageObjectPath, Buffer.from(workbookBuffer), {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

  if (error) {
    return {
      message:
        error.message ||
        "The uploaded workbook could not be saved to project storage.",
      ok: false as const,
    };
  }

  return { ok: true as const };
}

async function removeWorkbookFromStorage(storageObjectPath: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .remove([storageObjectPath]);

  if (error) {
    console.warn("Project workbook storage cleanup failed", {
      message: error.message,
      storageObjectPath,
    });
  }
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
  metadata?: Record<string, unknown>,
) {
  console.warn("Project workbook upload rejected", {
    message,
    status,
    ...metadata,
  });

  return NextResponse.json({ error: { message }, ok: false }, { status });
}
