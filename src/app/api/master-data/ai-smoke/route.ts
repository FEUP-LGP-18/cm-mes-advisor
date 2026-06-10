import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  parseMasterDataGenerateRequestBody,
  type MasterDataGenerateRequestBody,
} from "@/lib/master-data/api";
import { generateMasterDataDrafts } from "@/lib/master-data/generation";
import {
  buildMasterDataAiSuggestions,
  MasterDataRealGenerationUnavailableError,
} from "@/lib/master-data/server/provider";
import { loadMasterDataTemplateDefinition } from "@/lib/master-data/template";
import {
  flattenMasterDataObjects,
  masterDataObjectTypes,
  type MasterDataObjectType,
} from "@/lib/master-data/types";
import { readRequirementGenerationServerConfig } from "@/lib/requirements/server/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const smokeRequestBody: MasterDataGenerateRequestBody = {
  mode: "real",
  project: {
    customerName: "Customer X",
    projectId: "customer-x-ai-smoke",
    projectName: "Customer X AI Smoke",
  },
  requirements: [
    {
      availability: "Available",
      availabilityCm: "Standard configuration",
      consultantComment:
        "Consultant approved this row for a product and material setup demo.",
      demo: true,
      demoRaw: "x",
      descriptionAvailability: "Supported by configuration.",
      detailDescriptionAndMotivation:
        "Consultants need product and material master data ready for traceable execution.",
      l2Process: "Manufacturing Execution",
      l3Process: "Product Setup",
      mvp: true,
      mvpRaw: "x",
      operation: "Create product",
      prioCws: "1",
      prioEms: "1",
      requirementDescription:
        "Create product master data with material traceability for finished goods.",
      requirementId: "AI-SMOKE-MD-001",
      requirementKey: "1:AI-SMOKE-MD-001",
      reviewNote: "",
      reviewStatus: "approved",
      sourceComment: "Show product setup and related material traceability.",
      sourceRowNumber: 1,
      supportedPercent: "100%",
    },
  ],
  selectedObjectTypes: ["product", "material"],
  selectedRequirementKeys: ["1:AI-SMOKE-MD-001"],
};

export async function POST(request: Request) {
  if (!isSmokeRequestAuthorized(request)) {
    return hiddenResponse();
  }

  const config = readRequirementGenerationServerConfig();
  const generationSummary = summarizeGenerationConfig(config);

  if (config.mode !== "real") {
    return NextResponse.json(
      {
        ok: false,
        generation: generationSummary,
        error: {
          code: "real-mode-disabled",
          message: "Master Data AI smoke requires GENERATION_MODE=real.",
        },
      },
      { status: 503 },
    );
  }

  const parsedBody = parseMasterDataGenerateRequestBody(smokeRequestBody);
  if (!parsedBody.ok) {
    return NextResponse.json(
      {
        ok: false,
        generation: generationSummary,
        error: {
          code: "invalid-smoke-request",
          message: parsedBody.message,
        },
      },
      { status: 500 },
    );
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
    const objectCounts = countObjectsByType(result.generatedObjects);

    return NextResponse.json({
      ok: true,
      generation: {
        ...generationSummary,
        generatedAtLooksRuntime: generatedAt !== "deterministic-mock",
        logCount: result.logs.length,
        objectCounts,
        objectTypesWithSuggestions: countUsableAiSuggestions(aiSuggestions),
        totalObjects: flattenMasterDataObjects(result.generatedObjects).length,
        traceabilityCount: result.traceability.length,
        warningCount: result.warnings.length,
      },
    });
  } catch (error) {
    if (error instanceof MasterDataRealGenerationUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          generation: generationSummary,
          error: {
            code: "real-generation-unavailable",
            message: error.message,
            reason: error.reason,
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        generation: generationSummary,
        error: {
          code: "generation-failed",
          message:
            "Master Data AI smoke failed before a safe summary could be created.",
        },
      },
      { status: 502 },
    );
  }
}

function hiddenResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "not-found",
        message: "Not found.",
      },
    },
    { status: 404 },
  );
}

function isSmokeRequestAuthorized(request: Request) {
  const expectedToken = process.env.AI_SMOKE_TEST_TOKEN?.trim();
  if (!expectedToken) {
    return false;
  }

  const providedToken =
    request.headers.get("x-ai-smoke-token") ??
    readBearerToken(request.headers.get("authorization"));

  return tokensMatch(providedToken, expectedToken);
}

function readBearerToken(header: string | null) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

function tokensMatch(providedToken: string | null, expectedToken: string) {
  if (!providedToken) {
    return false;
  }

  const provided = Buffer.from(providedToken);
  const expected = Buffer.from(expectedToken);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

function summarizeGenerationConfig(config: {
  generationProvider: "anthropic" | "bedrock";
  mcpServerUrlKind?: "external" | "self";
  mode: "mock" | "real";
}) {
  return {
    generator:
      config.generationProvider === "anthropic"
        ? "anthropic-mcp"
        : "bedrock-mcp",
    mcpServerUrlKind: config.mcpServerUrlKind ?? "external",
    mode: config.mode,
    provider: config.generationProvider,
  };
}

function countObjectsByType(
  generatedObjects: Record<MasterDataObjectType, unknown[]>,
) {
  return Object.fromEntries(
    masterDataObjectTypes.map((objectType) => [
      objectType,
      generatedObjects[objectType]?.length ?? 0,
    ]),
  ) as Record<MasterDataObjectType, number>;
}

function countUsableAiSuggestions(value: Record<string, unknown>) {
  return Object.values(value).filter((suggestion) => suggestion !== undefined)
    .length;
}
