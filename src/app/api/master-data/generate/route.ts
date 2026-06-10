import { NextResponse } from "next/server";
import { generateMasterDataDrafts } from "@/lib/master-data/generation";
import { loadMasterDataTemplateDefinition } from "@/lib/master-data/template";
import { requireProjectCapability } from "@/lib/projects/permissions.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  parseMasterDataGenerateRequestBody,
  type MasterDataGenerateRouteBody,
} from "@/lib/master-data/api";
import {
  buildMasterDataAiSuggestions,
  MasterDataRealGenerationUnavailableError,
} from "@/lib/master-data/server/provider";

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid-request",
      "Request body must be valid JSON containing the selected requirements and object types.",
    );
  }

  const parsedBody = parseMasterDataGenerateRequestBody(rawBody);

  if (!parsedBody.ok) {
    return errorResponse(400, "invalid-request", parsedBody.message);
  }

  if (isSupabaseConfigured()) {
    const capabilityResult = await requireProjectCapability(
      parsedBody.body.project.projectId,
      "edit_project_state",
    );
    if (!capabilityResult.ok) {
      const status =
        capabilityResult.status === "not_authenticated" ? 401 : 403;
      return errorResponse(
        status,
        status === 401 ? "unauthorized" : "forbidden",
        capabilityResult.message,
      );
    }
  }

  try {
    const requestBody = parsedBody.body;
    const template = await loadMasterDataTemplateDefinition();
    const aiSuggestions = await buildMasterDataAiSuggestions(requestBody);
    const generatedAt = new Date().toISOString();
    const result = generateMasterDataDrafts({
      aiSuggestions,
      project: requestBody.project,
      requirements: requestBody.requirements,
      selectedObjectTypes: requestBody.selectedObjectTypes,
      selectedRequirementKeys: requestBody.selectedRequirementKeys,
      template,
    });

    const body: MasterDataGenerateRouteBody = {
      ok: true,
      generatedAt,
      mode: requestBody.mode ?? "mock",
      generatedObjects: result.generatedObjects,
      logs: result.logs,
      traceability: result.traceability,
      warnings: result.warnings,
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof MasterDataRealGenerationUnavailableError) {
      return errorResponse(503, "real-generation-unavailable", error.message);
    }

    return errorResponse(
      500,
      "generation-failed",
      error instanceof Error
        ? error.message
        : "Master Data generation failed before the draft package could be created.",
    );
  }
}

function errorResponse(
  status: number,
  code:
    | "invalid-request"
    | "generation-failed"
    | "real-generation-unavailable"
    | "unauthorized"
    | "forbidden",
  message: string,
) {
  const body: MasterDataGenerateRouteBody = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, { status });
}
