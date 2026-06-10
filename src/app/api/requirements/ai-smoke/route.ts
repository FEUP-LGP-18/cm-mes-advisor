import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readRequirementGenerationServerConfig } from "../../../../lib/requirements/server/config";
import {
  getRequirementGenerationAvailabilitySnapshot,
  resetRequirementGenerationAvailabilityCache,
} from "../../../../lib/requirements/server/availability";
import { createRequirementGenerationProvider } from "../../../../lib/requirements/server/provider";
import type { ParsedRequirement } from "../../../../lib/requirements/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const smokeRequirement: ParsedRequirement = {
  availability: "Available",
  availabilityCm: "Standard configuration",
  demo: true,
  demoRaw: "x",
  descriptionAvailability: "Supported by configuration.",
  detailDescriptionAndMotivation:
    "Consultants need a clear grounded demo flow for electronic batch review.",
  l2Process: "Manufacturing Execution",
  l3Process: "Review by Exception",
  mvp: true,
  mvpRaw: "x",
  operation: "Batch review",
  prioCws: "1",
  prioEms: "1",
  requirementDescription:
    "Support electronic batch review with review-by-exception evidence and consultant-facing demo steps.",
  requirementId: "AI-SMOKE-001",
  sourceComment: "Existing workbook hint: show batch review exception handling.",
  sourceRowNumber: 1,
  supportedPercent: "100%",
};

export async function POST(request: Request) {
  if (!isSmokeRequestAuthorized(request)) {
    return hiddenResponse();
  }

  const config = readRequirementGenerationServerConfig();
  if (config.mode !== "real") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "real-mode-disabled",
          message: "AI smoke requires GENERATION_MODE=real.",
        },
      },
      { status: 503 },
    );
  }

  resetRequirementGenerationAvailabilityCache();
  const availability = await getRequirementGenerationAvailabilitySnapshot({
    refresh: true,
    ttlMs: 0,
  });
  const realAvailability = availability.modes.real;

  if (!realAvailability.available) {
    return NextResponse.json(
      {
        ok: false,
        availability: summarizeAvailability(realAvailability),
        error: {
          code: "real-generation-unavailable",
          message: realAvailability.message,
          missingConfig: realAvailability.missingConfig ?? [],
          reason: realAvailability.status,
        },
      },
      { status: 503 },
    );
  }

  const provider = createRequirementGenerationProvider(config);
  const result = await provider.generate([smokeRequirement]);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        availability: summarizeAvailability(realAvailability),
        error: result.error,
      },
      { status: result.error.code === "real-generation-unavailable" ? 503 : 502 },
    );
  }

  const draft = result.drafts[0];
  if (!draft) {
    return NextResponse.json(
      {
        ok: false,
        availability: summarizeAvailability(realAvailability),
        error: {
          code: "empty-generation-result",
          message: "Real generation completed without returning a draft.",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    availability: summarizeAvailability(realAvailability),
    generation: {
      commentLength: draft.generatedComment.length,
      confidence: draft.confidence.level,
      demoSteps: draft.demoSteps.length,
      firstStepInstructions: draft.demoSteps[0]?.instructions.length ?? 0,
      generatedAtLooksRuntime: draft.generatedAt !== "deterministic-mock",
      generator: draft.generator,
      mcpServerUrlKind: config.mcpServerUrlKind ?? "external",
      providerMode: result.providerMode,
      sourceReferences: draft.sourceReferences.length,
      warnings: draft.warnings.length,
    },
  });
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
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function summarizeAvailability(value: {
  available: boolean;
  status: string;
}) {
  return {
    available: value.available,
    status: value.status,
  };
}
