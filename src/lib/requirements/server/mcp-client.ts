import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ParsedRequirement } from "../parser";

const searchToolName = "search_documentation";
const adjacentChunksToolName = "get_adjacent_chunks";
const defaultDocSource = "Documentation Portal";
const maxChunksToRetrieve = 3;
const maxAdjacentChunkCount = 4;
const maxSearchKeywordCount = 8;

export interface McpDocumentationChunk {
  id: string;
  title: string | null;
  text: string;
  sourceUrl: string | null;
  docSource: string | null;
  docVersion: string | null;
  previousChunkId: string | null;
  nextChunkId: string | null;
}

export interface McpRequirementLookupResult {
  primaryChunks: McpDocumentationChunk[];
  adjacentChunks: McpDocumentationChunk[];
  allChunks: McpDocumentationChunk[];
}

export interface RequirementDocumentationClient {
  lookupRequirementDocumentation(
    requirement: ParsedRequirement,
  ): Promise<McpRequirementLookupResult>;
  close(): Promise<void>;
}

interface ToolDefinition {
  name: string;
  inputSchema?: {
    properties?: Record<string, unknown>;
  };
}

interface RequirementSearchInput {
  userQuerySummary: string;
  userQueryToEmbed: string;
}

export async function createRequirementDocumentationClient({
  mcpServerUrl,
  mcpUserAccount,
}: {
  mcpServerUrl: string;
  mcpUserAccount: string | null;
}): Promise<RequirementDocumentationClient> {
  const client = new Client(
    {
      name: "cm-mes-advisor",
      version: "0.1.0",
    },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl), {
    requestInit: {
      headers:
        mcpUserAccount !== null
          ? {
              "CMF-UserAccount": mcpUserAccount,
            }
          : undefined,
    },
  });

  await client.connect(transport);

  const toolsResult = await client.listTools();
  const searchTool = findTool(toolsResult.tools, searchToolName);
  if (!searchTool) {
    await closeMcpClient(client, transport);
    throw new Error(
      `The MCP server does not expose the required ${searchToolName} tool.`,
    );
  }

  const adjacentTool = findTool(toolsResult.tools, adjacentChunksToolName);

  return {
    async lookupRequirementDocumentation(requirement) {
      const primarySearchInput =
        buildPrimaryRequirementSearchInput(requirement);
      const fallbackSearchInput =
        buildFallbackRequirementSearchInput(requirement);

      const firstPass = await callToolForChunks(client, searchToolName, {
        docSources: [defaultDocSource],
        docVersions: [],
        userQuerySummary: primarySearchInput.userQuerySummary,
        userQueryToEmbed: primarySearchInput.userQueryToEmbed,
        maxNumberOfChunksToRetrieve: maxChunksToRetrieve,
      });

      const primaryChunks =
        firstPass.length > 0
          ? firstPass
          : await callToolForChunks(client, searchToolName, {
              docSources: [],
              docVersions: [],
              userQuerySummary: fallbackSearchInput.userQuerySummary,
              userQueryToEmbed: fallbackSearchInput.userQueryToEmbed,
              maxNumberOfChunksToRetrieve: maxChunksToRetrieve,
            });

      const adjacentChunks = await lookupAdjacentChunks(
        client,
        adjacentTool,
        primaryChunks,
      );
      const allChunks = prioritizeDocumentationChunks(
        dedupeDocumentationChunks([...primaryChunks, ...adjacentChunks]),
        requirement,
      );

      return {
        primaryChunks,
        adjacentChunks,
        allChunks,
      };
    },
    async close() {
      await closeMcpClient(client, transport);
    },
  };
}

function findTool(
  tools: Array<{
    name: string;
    inputSchema?: { properties?: Record<string, unknown> };
  }>,
  name: string,
): ToolDefinition | null {
  return tools.find((tool) => tool.name === name) ?? null;
}

async function lookupAdjacentChunks(
  client: Client,
  tool: ToolDefinition | null,
  primaryChunks: McpDocumentationChunk[],
): Promise<McpDocumentationChunk[]> {
  if (!tool) {
    return [];
  }

  const adjacentIds = Array.from(
    new Set(
      primaryChunks
        .flatMap((chunk) => [chunk.previousChunkId, chunk.nextChunkId])
        .filter((value): value is string => typeof value === "string"),
    ),
  ).slice(0, maxAdjacentChunkCount);

  if (adjacentIds.length === 0) {
    return [];
  }

  const propertyNames = Object.keys(tool.inputSchema?.properties ?? {});
  if (propertyNames.includes("chunkIds")) {
    return callToolForChunks(client, adjacentChunksToolName, {
      chunkIds: adjacentIds,
    });
  }

  if (propertyNames.includes("chunkId")) {
    const chunks = await Promise.all(
      adjacentIds.map((chunkId) =>
        callToolForChunks(client, adjacentChunksToolName, { chunkId }),
      ),
    );
    return dedupeDocumentationChunks(chunks.flat());
  }

  if (
    propertyNames.includes("previousChunkId") &&
    propertyNames.includes("nextChunkId")
  ) {
    const chunks = await Promise.all(
      primaryChunks.map((chunk) =>
        callToolForChunks(client, adjacentChunksToolName, {
          previousChunkId: chunk.previousChunkId,
          nextChunkId: chunk.nextChunkId,
        }),
      ),
    );
    return dedupeDocumentationChunks(chunks.flat());
  }

  return [];
}

async function callToolForChunks(
  client: Client,
  name: string,
  argumentsValue: Record<string, unknown>,
): Promise<McpDocumentationChunk[]> {
  const result = await client.callTool({
    name,
    arguments: argumentsValue,
  });

  return normalizeDocumentationChunks(result);
}

function normalizeDocumentationChunks(value: unknown): McpDocumentationChunk[] {
  const candidates = new Map<string, McpDocumentationChunk>();

  for (const candidate of extractChunkCandidates(value)) {
    const chunk = toDocumentationChunk(candidate);
    if (!chunk) {
      continue;
    }

    const key = `${chunk.id}:${chunk.sourceUrl ?? ""}`;
    if (!candidates.has(key)) {
      candidates.set(key, chunk);
    }
  }

  if (candidates.size > 0) {
    return Array.from(candidates.values());
  }

  const textFallback = extractTextPayload(value);
  if (textFallback.length === 0) {
    return [];
  }

  return [
    {
      id: "mcp-text-response",
      title: "MCP documentation response",
      text: textFallback,
      sourceUrl: null,
      docSource: defaultDocSource,
      docVersion: null,
      previousChunkId: null,
      nextChunkId: null,
    },
  ];
}

function extractChunkCandidates(
  value: unknown,
  depth = 0,
  bucket: Array<Record<string, unknown>> = [],
): Array<Record<string, unknown>> {
  if (depth > 6) {
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      extractChunkCandidates(entry, depth + 1, bucket);
    });
    return bucket;
  }

  if (!isRecord(value)) {
    return bucket;
  }

  if (looksLikeChunk(value)) {
    bucket.push(value);
  }

  if (Array.isArray(value.content)) {
    value.content.forEach((entry) => {
      if (
        isRecord(entry) &&
        entry.type === "text" &&
        typeof entry.text === "string"
      ) {
        const parsed = parseJsonLike(entry.text);
        if (parsed !== null) {
          extractChunkCandidates(parsed, depth + 1, bucket);
        }
      }
    });
  }

  Object.values(value).forEach((entry) => {
    if (entry !== value.content) {
      extractChunkCandidates(entry, depth + 1, bucket);
    }
  });

  return bucket;
}

function looksLikeChunk(value: Record<string, unknown>): boolean {
  return (
    typeof pickString(value, ["ChunkId", "chunkId", "id", "Id"]) === "string" ||
    typeof pickString(value, ["Text", "text", "content", "chunkText"]) ===
      "string"
  );
}

function toDocumentationChunk(
  value: Record<string, unknown>,
): McpDocumentationChunk | null {
  const text = pickString(value, ["Text", "text", "content", "chunkText"]);
  if (!text) {
    return null;
  }

  const id =
    pickString(value, ["ChunkId", "chunkId", "id", "Id"]) ??
    `chunk:${hashText(text)}`;

  return {
    id,
    title: pickString(value, ["Title", "title", "name"]),
    text: text.trim(),
    sourceUrl: pickString(value, ["SourceUrl", "sourceUrl", "url", "Url"]),
    docSource: pickString(value, ["DocSource", "docSource", "source"]),
    docVersion: pickString(value, ["DocVersion", "docVersion", "version"]),
    previousChunkId: pickString(value, ["PreviousChunkId", "previousChunkId"]),
    nextChunkId: pickString(value, ["NextChunkId", "nextChunkId"]),
  };
}

function pickString(
  value: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const entry = value[key];
    if (typeof entry === "string" && entry.trim().length > 0) {
      return entry.trim();
    }
  }

  return null;
}

function extractTextPayload(value: unknown): string {
  const texts: string[] = [];
  collectTextPayload(value, texts, 0);
  return texts.join("\n\n").trim();
}

function collectTextPayload(
  value: unknown,
  bucket: string[],
  depth: number,
): void {
  if (depth > 6) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTextPayload(entry, bucket, depth + 1));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (Array.isArray(value.content)) {
    value.content.forEach((entry) => {
      if (
        isRecord(entry) &&
        entry.type === "text" &&
        typeof entry.text === "string"
      ) {
        bucket.push(entry.text.trim());
      }
    });
  }
}

function parseJsonLike(text: string): unknown | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const direct = tryParseJson(trimmed);
  if (direct !== null) {
    return direct;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!fencedMatch?.[1]) {
    return null;
  }

  return tryParseJson(fencedMatch[1].trim());
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function dedupeDocumentationChunks(
  chunks: McpDocumentationChunk[],
): McpDocumentationChunk[] {
  const unique = new Map<string, McpDocumentationChunk>();

  chunks.forEach((chunk) => {
    const key = `${chunk.id}:${chunk.sourceUrl ?? ""}`;
    if (!unique.has(key)) {
      unique.set(key, chunk);
    }
  });

  return Array.from(unique.values());
}

function buildPrimaryRequirementSearchInput(
  requirement: ParsedRequirement,
): RequirementSearchInput {
  const processPath = formatRequirementProcessPath(requirement);

  return {
    userQuerySummary: [
      `Requirement ${requirement.requirementId || requirement.sourceRowNumber}`,
      requirement.requirementDescription.trim(),
      processPath ? `Process path: ${processPath}` : null,
      requirement.detailDescriptionAndMotivation.trim()
        ? `Business context: ${requirement.detailDescriptionAndMotivation.trim()}`
        : null,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(". "),
    userQueryToEmbed: buildKeywordQuery([
      requirement.requirementDescription,
      requirement.l3Process,
      requirement.operation,
      requirement.l2Process,
      requirement.detailDescriptionAndMotivation,
    ]),
  };
}

function buildFallbackRequirementSearchInput(
  requirement: ParsedRequirement,
): RequirementSearchInput {
  const processPath = formatRequirementProcessPath(requirement);
  const shouldUseCommentHint = hasSparseRequirementText(requirement);
  const workbookCommentHint = shouldUseCommentHint
    ? createWorkbookCommentHint(requirement.sourceComment)
    : null;
  const availabilityHint = [
    requirement.availabilityCm.trim(),
    requirement.descriptionAvailability.trim(),
    requirement.supportedPercent.trim()
      ? `${requirement.supportedPercent.trim()}% workbook support signal`
      : null,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" | ");
  const primaryKeywords = collectSearchKeywords([
    requirement.requirementDescription.trim(),
    requirement.l3Process.trim(),
    requirement.operation.trim(),
    requirement.l2Process.trim(),
    requirement.detailDescriptionAndMotivation.trim(),
  ]);
  const secondaryKeywords = collectSearchKeywords(
    [
      requirement.operation.trim(),
      requirement.l3Process.trim(),
      requirement.detailDescriptionAndMotivation.trim(),
      requirement.availabilityCm.trim(),
      requirement.descriptionAvailability.trim(),
      shouldUseCommentHint ? (workbookCommentHint ?? "") : "",
    ],
    new Set(primaryKeywords),
  );

  return {
    userQuerySummary: [
      `Requirement ${requirement.requirementId || requirement.sourceRowNumber}`,
      requirement.requirementDescription.trim(),
      processPath
        ? `Find documentation that explains the consultant demo path for ${processPath}`
        : "Find documentation that explains the consultant demo path.",
      workbookCommentHint
        ? `Workbook comment hint (confirm against documentation, not ground truth): ${workbookCommentHint}`
        : null,
      availabilityHint
        ? `Workbook availability hint: ${availabilityHint}`
        : null,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(". "),
    userQueryToEmbed: dedupeKeywordList([
      ...secondaryKeywords,
      ...primaryKeywords,
    ])
      .slice(0, maxSearchKeywordCount)
      .join(" "),
  };
}

function buildKeywordQuery(values: string[]): string {
  return collectSearchKeywords(values)
    .slice(0, maxSearchKeywordCount)
    .join(" ");
}

function collectSearchKeywords(
  values: string[],
  excludedKeywords: Set<string> = new Set(),
): string[] {
  return dedupeKeywordList(
    values.flatMap((value) =>
      splitKeywords(value).filter(
        (keyword) => !excludedKeywords.has(keyword.toLowerCase()),
      ),
    ),
  );
}

function dedupeKeywordList(values: string[]): string[] {
  return Array.from(new Set(values));
}

function splitKeywords(value: string): string[] {
  const noiseKeywords = new Set([
    "critical",
    "manufacturing",
    "mes",
    "support",
    "supports",
    "supporting",
    "supported",
    "requirement",
    "requirements",
    "customer",
    "customers",
    "using",
    "used",
    "use",
    "need",
    "needs",
    "needed",
    "show",
    "demo",
    "solution",
  ]);

  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 1 && !noiseKeywords.has(token) && !/^\d+$/.test(token),
    );
}

function formatRequirementProcessPath(requirement: ParsedRequirement): string {
  return [requirement.l2Process, requirement.l3Process, requirement.operation]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" > ");
}

function hasSparseRequirementText(requirement: ParsedRequirement): boolean {
  return (
    collectSearchKeywords([
      requirement.requirementDescription,
      requirement.detailDescriptionAndMotivation,
    ]).length < 5
  );
}

function createWorkbookCommentHint(comment: string): string | null {
  const trimmed = comment.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const firstSentence = trimmed
    .replace(/\s+/g, " ")
    .split(/[.\n]/)
    .map((segment) => segment.trim())
    .find((segment) => segment.length > 0);

  if (!firstSentence) {
    return null;
  }

  return firstSentence.length > 220
    ? `${firstSentence.slice(0, 217).trim()}...`
    : firstSentence;
}

function prioritizeDocumentationChunks(
  chunks: McpDocumentationChunk[],
  requirement: ParsedRequirement,
): McpDocumentationChunk[] {
  const rankingTerms = collectSearchKeywords([
    requirement.requirementDescription,
    requirement.l3Process,
    requirement.operation,
    requirement.l2Process,
  ]);
  const actionTerms = [
    "screen",
    "module",
    "workspace",
    "page",
    "open",
    "select",
    "click",
    "navigate",
    "review",
    "create",
    "approve",
    "checklist",
    "step",
    "flow",
    "action",
  ];

  return [...chunks].sort((left, right) => {
    const leftScore = scoreDocumentationChunk(left, rankingTerms, actionTerms);
    const rightScore = scoreDocumentationChunk(
      right,
      rankingTerms,
      actionTerms,
    );

    return rightScore - leftScore;
  });
}

function scoreDocumentationChunk(
  chunk: McpDocumentationChunk,
  rankingTerms: string[],
  actionTerms: string[],
): number {
  const haystack = `${chunk.title ?? ""} ${chunk.text}`.toLowerCase();
  let score = 0;

  rankingTerms.forEach((term) => {
    if (haystack.includes(term)) {
      score += 2;
    }
  });

  actionTerms.forEach((term) => {
    if (haystack.includes(term)) {
      score += 3;
    }
  });

  if (chunk.sourceUrl) {
    score += 1;
  }

  return score;
}

async function closeMcpClient(
  client: Client,
  transport: StreamableHTTPClientTransport,
): Promise<void> {
  try {
    await transport.terminateSession();
  } catch {
    // Some MCP servers do not support explicit session termination.
  }

  try {
    await client.close();
  } catch {
    // Ignore close failures during cleanup.
  }
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
