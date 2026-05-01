import { NextResponse } from "next/server";
import { requireProjectCapability } from "../../../../lib/projects/permissions.server";
import { readRequirementGenerationServerConfig } from "../../../../lib/requirements/server/config";
import { createRequirementGenerationProvider } from "../../../../lib/requirements/server/provider";
import { parseRequirementGenerationRequestBody } from "../../../../lib/requirements/server/request";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";
import type {
  RequirementGenerationRouteErrorBody,
  RequirementGenerationRouteSuccessBody,
} from "../../../../lib/requirements/generation-api";

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return invalidRequestResponse(
      "Request body must be valid JSON containing a requirements array.",
    );
  }

  const parsedBody = parseRequirementGenerationRequestBody(rawBody);
  if (!parsedBody.ok) {
    return invalidRequestResponse(parsedBody.error.message);
  }

  if (isSupabaseConfigured()) {
    const capabilityResult = await requireProjectCapability(
      parsedBody.projectId,
      "edit_project_state",
    );
    if (!capabilityResult.ok) {
      const status = capabilityResult.status === "not_authenticated" ? 401 : 403;
      const code = status === 401 ? "unauthorized" : "forbidden";
      const body: RequirementGenerationRouteErrorBody = {
        ok: false,
        error: { code, message: capabilityResult.message },
      };
      return NextResponse.json(body, { status });
    }
  }

  const config = readRequirementGenerationServerConfig();
  const provider = createRequirementGenerationProvider({
    ...config,
    mode: parsedBody.mode ?? config.mode,
  });
  const result = await provider.generate(parsedBody.requirements);

  if (!result.ok) {
    return result.error.code === "real-generation-unavailable"
      ? unavailableResponse(
          result.error.message,
          result.error.reason,
          result.error.missingConfig,
        )
      : generationFailedResponse(result.error.message);
  }

  const responseBody: RequirementGenerationRouteSuccessBody = {
    ok: true,
    mode: result.providerMode,
    drafts: result.drafts,
  };

  return NextResponse.json(responseBody);
}

function invalidRequestResponse(message: string) {
  const body: RequirementGenerationRouteErrorBody = {
    ok: false,
    error: {
      code: "invalid-request",
      message,
    },
  };

  return NextResponse.json(body, { status: 400 });
}

function unavailableResponse(
  message: string,
  reason: RequirementGenerationRouteErrorBody["error"]["reason"],
  missingConfig: string[],
) {
  const body: RequirementGenerationRouteErrorBody = {
    ok: false,
    error: {
      code: "real-generation-unavailable",
      message,
      reason,
      missingConfig,
    },
  };

  return NextResponse.json(body, { status: 503 });
}

function generationFailedResponse(message: string) {
  const body: RequirementGenerationRouteErrorBody = {
    ok: false,
    error: {
      code: "generation-failed",
      message,
    },
  };

  return NextResponse.json(body, { status: 502 });
}
