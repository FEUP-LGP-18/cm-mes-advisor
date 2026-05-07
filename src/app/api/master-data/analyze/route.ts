import { NextResponse } from "next/server";
import { analyzeMasterDataApplicability } from "@/lib/master-data/analysis";
import {
  parseMasterDataAnalyzeRequestBody,
  type MasterDataAnalyzeRouteBody,
} from "@/lib/master-data/api";

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid-request",
      "Request body must be valid JSON containing the requirements to analyze.",
    );
  }

  const parsedBody = parseMasterDataAnalyzeRequestBody(rawBody);

  if (!parsedBody.ok) {
    return errorResponse(400, "invalid-request", parsedBody.message);
  }

  try {
    const result = analyzeMasterDataApplicability(parsedBody.body);

    const body: MasterDataAnalyzeRouteBody = {
      ok: true,
      applicableRequirements: result.applicableRequirements,
      suggestedObjectTypes: result.suggestedObjectTypes,
      warnings: result.warnings,
    };

    return NextResponse.json(body);
  } catch (error) {
    return errorResponse(
      500,
      "analysis-failed",
      error instanceof Error
        ? error.message
        : "Master Data analysis failed before the applicable rows could be suggested.",
    );
  }
}

function errorResponse(
  status: number,
  code: "invalid-request" | "analysis-failed",
  message: string,
) {
  const body: MasterDataAnalyzeRouteBody = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, { status });
}
