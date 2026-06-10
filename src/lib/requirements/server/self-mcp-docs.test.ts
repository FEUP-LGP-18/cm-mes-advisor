import { describe, expect, it } from "vitest";
import {
  createSelfHostedRequirementDocumentationClient,
  getSelfHostedAdjacentDocumentation,
  getSelfHostedDocumentationChunks,
  searchSelfHostedDocumentation,
} from "./self-mcp-docs";

describe("self-hosted MCP documentation", () => {
  it("returns repo documentation chunks for batch review generation queries", () => {
    const chunks = searchSelfHostedDocumentation({
      userQuerySummary:
        "Support electronic batch review with review-by-exception evidence",
      userQueryToEmbed:
        "consultants need grounded demo steps and source references for batch review",
      maxNumberOfChunksToRetrieve: 3,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.text).toMatch(/consultant|demo|review/i);
    expect(chunks[0]?.docSource).toBe("CM MES Demo Advisor docs");
    expect(chunks.some((chunk) => chunk.sourceUrl?.startsWith("/docs/"))).toBe(
      true,
    );
  });

  it("returns adjacent chunks by chunk id", () => {
    const chunks = getSelfHostedAdjacentDocumentation({
      chunkIds: ["phase-one-review", "real-generation-grounding"],
    });

    expect(chunks.map((chunk) => chunk.id)).toEqual([
      "phase-one-review",
      "real-generation-grounding",
    ]);
  });

  it("exposes a stable non-empty documentation corpus", () => {
    expect(getSelfHostedDocumentationChunks().length).toBeGreaterThan(3);
  });

  it("creates an in-process documentation client for self-hosted MCP mode", async () => {
    const client = createSelfHostedRequirementDocumentationClient();

    const result = await client.lookupRequirementDocumentation({
      availability: "Available",
      availabilityCm: "Standard configuration",
      demo: true,
      demoRaw: "x",
      descriptionAvailability: "Supported by configuration.",
      detailDescriptionAndMotivation:
        "Consultants need grounded demo steps for electronic batch review.",
      l2Process: "Manufacturing Execution",
      l3Process: "Review by Exception",
      mvp: true,
      mvpRaw: "x",
      operation: "Batch review",
      prioCws: "1",
      prioEms: "1",
      requirementDescription: "Support electronic batch review",
      requirementId: "AI-SMOKE-001",
      sourceComment: "Show review-by-exception evidence.",
      sourceRowNumber: 1,
      supportedPercent: "100%",
    });

    expect(result.primaryChunks.length).toBeGreaterThan(0);
    expect(result.allChunks.length).toBeGreaterThan(0);
    await client.close();
  });
});
