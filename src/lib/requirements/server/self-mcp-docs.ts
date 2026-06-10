import type { McpDocumentationChunk } from "./mcp-client";
import type { RequirementDocumentationClient } from "./mcp-client";
import type { ParsedRequirement } from "../types";

export interface SelfMcpSearchInput {
  userQuerySummary?: string;
  userQueryToEmbed?: string;
  maxNumberOfChunksToRetrieve?: number;
}

export interface SelfMcpAdjacentInput {
  chunkIds?: string[];
  chunkId?: string;
  previousChunkId?: string | null;
  nextChunkId?: string | null;
}

const defaultMaxChunks = 3;
const maxReturnedChunks = 8;
const docSource = "CM MES Demo Advisor docs";
const docVersion = "repo";

const documentationChunks: McpDocumentationChunk[] = [
  {
    id: "product-scope-safe-language",
    title: "Product scope and safe language",
    text:
      "The app is an Excel-first Phase 1 workspace for consultant-reviewed generated drafts. It should not claim to replace consultant review or generate production MES configuration.",
    sourceUrl: "/docs/product-scope",
    docSource,
    docVersion,
    previousChunkId: null,
    nextChunkId: "requirements-real-generation",
  },
  {
    id: "requirements-real-generation",
    title: "Requirements pipeline real generation",
    text:
      "The browser calls POST /api/requirements/generate. Real generation uses MCP documentation lookup plus the selected server-side model provider, then returns generated drafts for consultant review.",
    sourceUrl: "/docs/requirements-pipeline",
    docSource,
    docVersion,
    previousChunkId: "product-scope-safe-language",
    nextChunkId: "phase-one-generate",
  },
  {
    id: "phase-one-generate",
    title: "Phase 1 generate step",
    text:
      "The generate step lets a teammate choose rows and create draft comments. It supports mock or real generation mode, generation availability refresh, demo slice generation, MVP row generation, selected row generation, row search, and filtering.",
    sourceUrl: "/docs/phase-1-flow",
    docSource,
    docVersion,
    previousChunkId: "requirements-real-generation",
    nextChunkId: "phase-one-review",
  },
  {
    id: "phase-one-review",
    title: "Consultant review queue",
    text:
      "The review step is a queue-detail workspace for consultant review. A teammate can approve generated output, flag it for review, skip it, reset it to draft, edit generated comments, add consultant notes, search, and filter the queue.",
    sourceUrl: "/docs/phase-1-flow",
    docSource,
    docVersion,
    previousChunkId: "phase-one-generate",
    nextChunkId: "phase-one-script-export",
  },
  {
    id: "phase-one-script-export",
    title: "Script and export traceability",
    text:
      "The script step turns approved generated rows into a consultant-facing demo narrative. The export includes project context, summary data, sections, demo steps, assumptions, warnings, and source references.",
    sourceUrl: "/docs/phase-1-flow",
    docSource,
    docVersion,
    previousChunkId: "phase-one-review",
    nextChunkId: "validation-consultant-review",
  },
  {
    id: "validation-consultant-review",
    title: "Validation and consultant judgment",
    text:
      "Validation flags rows that need care before approval, including missing requirement descriptions, partial or custom support, unclear availability, consultant review needed, and workaround-first situations. Validation is guidance and does not replace consultant judgment.",
    sourceUrl: "/docs/requirements-pipeline",
    docSource,
    docVersion,
    previousChunkId: "phase-one-script-export",
    nextChunkId: "real-generation-grounding",
  },
  {
    id: "real-generation-grounding",
    title: "Real generation grounding",
    text:
      "The real-generation prompt asks the model to stay evidence-grounded, avoid invention, and surface workaround or consultant-review situations. Real provider outputs include documentation source references when available.",
    sourceUrl: "/docs/real-generation",
    docSource,
    docVersion,
    previousChunkId: "validation-consultant-review",
    nextChunkId: "batch-review-demo-readiness",
  },
  {
    id: "batch-review-demo-readiness",
    title: "Batch review demo readiness",
    text:
      "Demo-ready comments should directly explain how CM MES addresses the requirement, avoid fake certainty, and sound like consultant-facing output. Demo steps should be action-oriented, name the module or screen when evidence supports it, and make it clear what the consultant should show.",
    sourceUrl: "/docs/phase-1-flow",
    docSource,
    docVersion,
    previousChunkId: "real-generation-grounding",
    nextChunkId: null,
  },
];

const documentationById = new Map(
  documentationChunks.map((chunk) => [chunk.id, chunk]),
);

export function searchSelfHostedDocumentation(
  input: SelfMcpSearchInput,
): McpDocumentationChunk[] {
  const query = [
    input.userQuerySummary,
    input.userQueryToEmbed,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  const tokens = tokenize(query);
  const maxChunks = normalizeMaxChunks(input.maxNumberOfChunksToRetrieve);

  const scored = documentationChunks
    .map((chunk, index) => ({
      chunk,
      index,
      score: scoreChunk(chunk, tokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    });

  const matching = scored.filter((entry) => entry.score > 0);
  return (matching.length > 0 ? matching : scored)
    .slice(0, maxChunks)
    .map((entry) => entry.chunk);
}

export function getSelfHostedAdjacentDocumentation(
  input: SelfMcpAdjacentInput,
): McpDocumentationChunk[] {
  const ids = new Set<string>();

  if (Array.isArray(input.chunkIds)) {
    input.chunkIds.forEach((id) => ids.add(id));
  }

  if (input.chunkId) {
    ids.add(input.chunkId);
  }

  if (input.previousChunkId) {
    ids.add(input.previousChunkId);
  }

  if (input.nextChunkId) {
    ids.add(input.nextChunkId);
  }

  return Array.from(ids)
    .map((id) => documentationById.get(id))
    .filter((chunk): chunk is McpDocumentationChunk => chunk !== undefined)
    .slice(0, maxReturnedChunks);
}

export function getSelfHostedDocumentationChunks(): McpDocumentationChunk[] {
  return [...documentationChunks];
}

export function createSelfHostedRequirementDocumentationClient(): RequirementDocumentationClient {
  return {
    async lookupRequirementDocumentation(requirement) {
      const primaryChunks = searchSelfHostedDocumentation(
        createRequirementSearchInput(requirement),
      );
      const adjacentChunks = getSelfHostedAdjacentDocumentation({
        chunkIds: Array.from(
          new Set(
            primaryChunks
              .flatMap((chunk) => [chunk.previousChunkId, chunk.nextChunkId])
              .filter((value): value is string => typeof value === "string"),
          ),
        ),
      });
      const allChunks = dedupeChunks([...primaryChunks, ...adjacentChunks]);

      return {
        primaryChunks,
        adjacentChunks,
        allChunks,
      };
    },
    async close() {},
  };
}

function normalizeMaxChunks(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultMaxChunks;
  }

  return Math.max(1, Math.min(maxReturnedChunks, Math.trunc(value)));
}

function scoreChunk(chunk: McpDocumentationChunk, queryTokens: string[]) {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = tokenize(
    [
      chunk.id,
      chunk.title,
      chunk.text,
      chunk.sourceUrl,
      chunk.docSource,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  );
  const haystackSet = new Set(haystack);

  return queryTokens.reduce((score, token) => {
    if (haystackSet.has(token)) {
      return score + 3;
    }

    if (haystack.some((entry) => entry.includes(token) || token.includes(entry))) {
      return score + 1;
    }

    return score;
  }, 0);
}

function createRequirementSearchInput(
  requirement: ParsedRequirement,
): SelfMcpSearchInput {
  return {
    userQuerySummary: [
      requirement.requirementId,
      requirement.requirementDescription,
      requirement.l2Process,
      requirement.l3Process,
      requirement.operation,
    ]
      .filter((value) => value.trim().length > 0)
      .join(" | "),
    userQueryToEmbed: [
      requirement.detailDescriptionAndMotivation,
      requirement.descriptionAvailability,
      requirement.availability,
      requirement.availabilityCm,
      requirement.sourceComment,
    ]
      .filter((value) => value.trim().length > 0)
      .join(" "),
    maxNumberOfChunksToRetrieve: defaultMaxChunks,
  };
}

function dedupeChunks(
  chunks: McpDocumentationChunk[],
): McpDocumentationChunk[] {
  const seen = new Set<string>();
  const deduped: McpDocumentationChunk[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.id}:${chunk.sourceUrl ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(chunk);
  }

  return deduped;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}
