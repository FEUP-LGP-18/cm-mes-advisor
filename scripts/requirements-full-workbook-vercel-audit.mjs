#!/usr/bin/env node

import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ExcelJS from "exceljs";

const defaultArtifactDir =
  "test-results/requirements-full-workbook-vercel-audit";
const fixturePath = "fixtures/customer-x-functional-requirements.xlsx";
const generationEndpointPath = "/api/requirements/generate";
const expectedFixtureSummary = {
  rowCount: 167,
  demoCount: 29,
  mvpCount: 54,
  demoAndMvpCount: 13,
  firstSourceRowNumber: 3,
  lastSourceRowNumber: 169,
};
const maxBatchSize = 3;
const retryableStatuses = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const confidenceLevels = new Set(["high", "medium", "low"]);
const validStepStatuses = new Set(["draft", "consultant-review"]);
const trueFlagValues = new Set(["x", "yes", "y", "true", "1"]);
const requiredHeaders = {
  requirementId: "#",
  requirementDescription: "Requirement description",
  l2Process: "L2 process",
  l3Process: "L3 process",
  operation: "Operation",
  demoRaw: "Demo",
  detailDescriptionAndMotivation: "Detail  description & motivation",
  prioEms: "Prio EMS",
  prioCws: "Prio CWS",
  mvpRaw: "MVP",
  availability: "Availability",
  availabilityCm: "Availability CM",
  descriptionAvailability: "Description availability",
  supportedPercent: "Supported %",
  sourceComment: "Comment",
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const startedAt = new Date();
const explicitTargetUrl = args.url ?? process.env.AI_SMOKE_URL;
const env = readDotenvFiles(process.cwd(), [
  ".env.local",
  ".env.development.local",
  ".env",
]);
const targetBaseUrl = normalizeBaseUrl(explicitTargetUrl);
const batchSize = readBatchSize(args.batchSize);
const limit = readLimit(args.limit);
const sourceRows = readSourceRows(args.sourceRows);
const artifactDir = path.resolve(process.cwd(), args.artifactDir);
const rawResponsesPath = path.join(artifactDir, "raw-responses.jsonl");
const reviewArtifactPath = path.join(artifactDir, "quality-review.json");
const summaryPath = path.join(artifactDir, "summary.json");
const humanReviewCsvPath = path.join(artifactDir, "human-review-queue.csv");

await fs.mkdir(artifactDir, { recursive: true });
await fs.writeFile(rawResponsesPath, "");

const allRequirements = await parseRequirementsWorkbookFile(
  path.resolve(process.cwd(), fixturePath),
);
const fixtureSummary = summarizeRequirements(allRequirements);
assertFixtureSummary(fixtureSummary, allRequirements);

const auditedRequirements = selectAuditedRequirements(allRequirements, {
  limit,
  sourceRows,
});
const batches = chunk(auditedRequirements, batchSize);
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const endpointUrl = new URL(generationEndpointPath, targetBaseUrl);
const rows = [];
const batchErrors = [];
const responseModeCounts = {};

console.log(
  JSON.stringify(
    {
      event: "audit-start",
      targetHost: targetBaseUrl.host,
      fixture: fixtureSummary,
      auditedRows: auditedRequirements.length,
      fullWorkbook: auditedRequirements.length === allRequirements.length,
      sourceRows,
      batchSize,
      batches: batches.length,
      artifactDir: toRelativePath(artifactDir),
    },
    null,
    2,
  ),
);

for (let index = 0; index < batches.length; index += 1) {
  const batch = batches[index];
  const response = await postGenerationBatch({
    batch,
    endpointUrl,
    env,
  });

  await appendRawResponse({
    batch,
    batchIndex: index,
    response,
    runId,
  });

  const safeBatchSummary = summarizeBatchResponse({
    batch,
    batchIndex: index,
    response,
  });
  console.log(JSON.stringify(safeBatchSummary));

  if (!response.ok) {
    batchErrors.push(safeBatchSummary);
    break;
  }

  incrementCount(responseModeCounts, response.body.mode ?? "missing");
  const batchRows = evaluateBatch({
    body: response.body,
    requirements: batch,
    startedAt,
  });
  rows.push(...batchRows);
}

const reviewRows = markHumanReviewQueue(rows);
const summary = summarizeAudit({
  artifactDir,
  auditedRequirements,
  batchErrors,
  batchSize,
  fixtureSummary,
  humanReviewCsvPath,
  rawResponsesPath,
  responseModeCounts,
  reviewArtifactPath,
  rows: reviewRows,
  startedAt,
  summaryPath,
  targetBaseUrl,
});

await fs.writeFile(reviewArtifactPath, JSON.stringify(reviewRows, null, 2));
await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
await fs.writeFile(humanReviewCsvPath, createHumanReviewCsv(reviewRows));

console.log(
  JSON.stringify(
    { event: "audit-complete", summary: createSafeStdoutSummary(summary) },
    null,
    2,
  ),
);

if (summary.criticalFailureRows > 0 || summary.batchErrorCount > 0) {
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    artifactDir: defaultArtifactDir,
    batchSize: "1",
    help: false,
    limit: null,
    sourceRows: null,
    url: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--":
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--artifact-dir":
        parsed.artifactDir = readArgValue(argv, (index += 1), arg);
        break;
      case "--batch-size":
        parsed.batchSize = readArgValue(argv, (index += 1), arg);
        break;
      case "--limit":
        parsed.limit = readArgValue(argv, (index += 1), arg);
        break;
      case "--source-rows":
        parsed.sourceRows = readArgValue(argv, (index += 1), arg);
        break;
      case "--url":
        parsed.url = readArgValue(argv, (index += 1), arg);
        break;
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function readArgValue(argv, index, name) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    fail(`Missing value for ${name}.`);
  }

  return value;
}

function readBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxBatchSize) {
    fail(`--batch-size must be an integer between 1 and ${maxBatchSize}.`);
  }

  return parsed;
}

function readLimit(value) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fail("--limit must be a positive integer.");
  }

  return parsed;
}

function readSourceRows(value) {
  if (value === null) {
    return null;
  }

  const rows = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
  if (rows.length === 0 || rows.some((row) => row < 1)) {
    fail("--source-rows must be a comma-separated list of positive row numbers.");
  }

  return [...new Set(rows)];
}

function selectAuditedRequirements(requirements, { limit, sourceRows }) {
  if (limit !== null && sourceRows !== null) {
    fail("Use either --limit or --source-rows, not both.");
  }

  if (sourceRows !== null) {
    const selected = sourceRows.map((sourceRowNumber) => {
      const requirement = requirements.find(
        (item) => item.sourceRowNumber === sourceRowNumber,
      );
      if (!requirement) {
        fail(`No parsed requirement found for source row ${sourceRowNumber}.`);
      }

      return requirement;
    });

    return selected;
  }

  return limit === null ? requirements : requirements.slice(0, limit);
}

function readDotenvFiles(repoRoot, filenames) {
  const resolvedEnv = { ...process.env };

  for (const filename of filenames) {
    const filepath = path.join(repoRoot, filename);
    let text;
    try {
      text = fsSyncRead(filepath);
    } catch {
      continue;
    }

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const match = line.match(
        /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
      );
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      resolvedEnv[key] ??= normalizeDotenvValue(rawValue);
    }
  }

  return resolvedEnv;
}

function fsSyncRead(filepath) {
  return readFileSync(filepath, "utf8");
}

function normalizeDotenvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) {
    fail("Missing target URL. Pass --url or set AI_SMOKE_URL in the current shell.");
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      fail("Target URL must use http or https.");
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      fail("Target URL must not include credentials, query strings, or fragments.");
    }

    return new URL(parsed.origin);
  } catch {
    fail("Invalid target URL.");
  }
}

async function parseRequirementsWorkbookFile(filepath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const worksheet = workbook.getWorksheet("Requirements");
  if (!worksheet) {
    throw new Error("Workbook is missing Requirements sheet.");
  }

  const columns = readHeaderColumns(worksheet);
  const requirements = [];

  for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rowText = readMappedRowText(row, columns);
    if (!Object.values(rowText).some((value) => value.length > 0)) {
      continue;
    }

    requirements.push({
      sourceRowNumber: rowNumber,
      requirementId: rowText.requirementId,
      requirementDescription: rowText.requirementDescription,
      l2Process: rowText.l2Process,
      l3Process: rowText.l3Process,
      operation: rowText.operation,
      demo: normalizeRequirementFlag(rowText.demoRaw),
      demoRaw: rowText.demoRaw,
      detailDescriptionAndMotivation: rowText.detailDescriptionAndMotivation,
      prioEms: rowText.prioEms,
      prioCws: rowText.prioCws,
      mvp: normalizeRequirementFlag(rowText.mvpRaw),
      mvpRaw: rowText.mvpRaw,
      availability: rowText.availability,
      availabilityCm: rowText.availabilityCm,
      descriptionAvailability: rowText.descriptionAvailability,
      supportedPercent: rowText.supportedPercent,
      sourceComment: rowText.sourceComment,
    });
  }

  return requirements;
}

function readHeaderColumns(worksheet) {
  const headerRow = worksheet.getRow(2);
  const headers = new Map();
  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = readCellText(cell);
    if (header) {
      headers.set(header, columnNumber);
    }
  });

  const missingHeaders = Object.values(requiredHeaders).filter(
    (header) => !headers.has(header),
  );
  if (missingHeaders.length > 0) {
    throw new Error(
      `Requirements sheet is missing expected row 2 header(s): ${missingHeaders.join(
        ", ",
      )}.`,
    );
  }

  return Object.fromEntries(
    Object.entries(requiredHeaders).map(([field, header]) => [
      field,
      headers.get(header),
    ]),
  );
}

function readMappedRowText(row, columns) {
  return Object.fromEntries(
    Object.keys(requiredHeaders).map((field) => [
      field,
      readCellText(row.getCell(columns[field])),
    ]),
  );
}

function readCellText(cell) {
  const value = cell.value;
  if (value == null) {
    return "";
  }

  return cellValueToText(value, cell.text).trim();
}

function cellValueToText(value, renderedText) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }

    if ("text" in value) {
      return value.text;
    }

    if ("result" in value && value.result != null) {
      return cellValueToText(value.result, String(value.result));
    }

    if ("error" in value) {
      return value.error;
    }
  }

  return renderedText;
}

function normalizeRequirementFlag(rawValue) {
  return trueFlagValues.has(rawValue.trim().toLowerCase());
}

function summarizeRequirements(requirements) {
  const summary = requirements.reduce(
    (acc, requirement) => ({
      rowCount: acc.rowCount + 1,
      demoCount: acc.demoCount + (requirement.demo ? 1 : 0),
      mvpCount: acc.mvpCount + (requirement.mvp ? 1 : 0),
      demoAndMvpCount:
        acc.demoAndMvpCount + (requirement.demo && requirement.mvp ? 1 : 0),
    }),
    {
      rowCount: 0,
      demoCount: 0,
      mvpCount: 0,
      demoAndMvpCount: 0,
    },
  );

  return {
    ...summary,
    firstSourceRowNumber: requirements[0]?.sourceRowNumber ?? null,
    lastSourceRowNumber: requirements.at(-1)?.sourceRowNumber ?? null,
  };
}

function assertFixtureSummary(summary) {
  const mismatches = Object.entries(expectedFixtureSummary).filter(
    ([key, value]) => summary[key] !== value,
  );
  if (mismatches.length > 0) {
    fail(
      `Fixture summary mismatch: ${mismatches
        .map(([key, expected]) => `${key} expected ${expected}, got ${summary[key]}`)
        .join("; ")}`,
    );
  }
}

async function postGenerationBatch({ batch, endpointUrl, env }) {
  const requestBody = {
    projectId: "customer-x-fixture",
    mode: "real",
    requirements: batch,
    settings: {},
  };
  const headers = {
    "content-type": "application/json",
  };
  const protectionBypass = env.VERCEL_PROTECTION_BYPASS?.trim();
  if (protectionBypass) {
    headers["x-vercel-protection-bypass"] = protectionBypass;
  }

  let lastFailure = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
      const rawText = await response.text();
      const body = parseJsonResponse(rawText);
      const result = {
        attempt,
        body,
        ok: response.ok && body?.ok === true,
        rawText,
        status: response.status,
      };

      if (
        result.ok ||
        !retryableStatuses.has(response.status) ||
        attempt === 3
      ) {
        return result;
      }

      lastFailure = result;
    } catch (error) {
      lastFailure = {
        attempt,
        body: {
          ok: false,
          error: {
            code: "network-error",
            message:
              error instanceof Error
                ? error.message
                : "Network request failed.",
          },
        },
        ok: false,
        rawText: "",
        status: null,
      };
      if (attempt === 3) {
        return lastFailure;
      }
    }

    await delay(1000 * attempt);
  }

  return lastFailure;
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid-json-response",
        message: "Response body was not valid JSON.",
      },
    };
  }
}

async function appendRawResponse({ batch, batchIndex, response, runId }) {
  await fs.appendFile(
    rawResponsesPath,
    `${JSON.stringify({
      batchIndex,
      request: {
        requirementKeys: batch.map(createRequirementKey),
        rowNumbers: batch.map((requirement) => requirement.sourceRowNumber),
      },
      response,
      runId,
      timestamp: new Date().toISOString(),
    })}\n`,
  );
}

function summarizeBatchResponse({ batch, batchIndex, response }) {
  const error = response.body?.error;
  return {
    event: "batch",
    batchIndex: batchIndex + 1,
    batchSize: batch.length,
    draftCount: Array.isArray(response.body?.drafts)
      ? response.body.drafts.length
      : 0,
    error: error
      ? {
          code: error.code,
          reason: error.reason,
          missingConfig: Array.isArray(error.missingConfig)
            ? error.missingConfig
            : [],
        }
      : null,
    mode: response.body?.mode,
    ok: response.ok,
    status: response.status,
  };
}

function evaluateBatch({ body, requirements, startedAt }) {
  const rows = [];
  const drafts = Array.isArray(body?.drafts) ? body.drafts : [];
  const keyCounts = new Map();

  for (const draft of drafts) {
    const key = draft?.requirement?.requirementKey;
    if (typeof key === "string") {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }

  if (body?.mode !== "real") {
    for (const requirement of requirements) {
      rows.push(createMissingDraftRow(requirement, "Response mode was not real."));
    }
    return rows;
  }

  if (drafts.length !== requirements.length) {
    for (const requirement of requirements) {
      rows.push(
        createMissingDraftRow(
          requirement,
          `Expected ${requirements.length} draft(s), received ${drafts.length}.`,
        ),
      );
    }
    return rows;
  }

  for (const requirement of requirements) {
    const key = createRequirementKey(requirement);
    const matchingDrafts = drafts.filter(
      (draft) => draft?.requirement?.requirementKey === key,
    );
    if (matchingDrafts.length !== 1) {
      rows.push(
        createMissingDraftRow(
          requirement,
          `Expected one draft for ${key}, received ${matchingDrafts.length}.`,
        ),
      );
      continue;
    }

    rows.push(
      evaluateDraft(requirement, matchingDrafts[0], keyCounts, startedAt),
    );
  }

  return rows;
}

function createMissingDraftRow(requirement, reason) {
  return {
    auto: {
      critical: [reason],
      minor: [],
      status: "fail",
      warnings: [],
    },
    draft: null,
    draftHash: null,
    flags: readFlags(requirement),
    humanReview: null,
    requirement: readRequirementSummary(requirement),
    sourceReferenceIds: [],
    sourceReferenceUrls: [],
    supportType: assessRequirementSupport(requirement).supportType,
  };
}

function evaluateDraft(requirement, draft, keyCounts, startedAt) {
  const critical = [];
  const warnings = [];
  const minor = [];
  const support = assessRequirementSupport(requirement);
  const draftText = JSON.stringify(draft);
  const generatedComment =
    typeof draft.generatedComment === "string" ? draft.generatedComment.trim() : "";
  const demoSteps = Array.isArray(draft.demoSteps) ? draft.demoSteps : [];
  const sourceReferences = Array.isArray(draft.sourceReferences)
    ? draft.sourceReferences
    : [];
  const confidence = isRecord(draft.confidence) ? draft.confidence : null;
  const sourceReferenceIds = sourceReferences
    .map((reference) => reference?.id)
    .filter((value) => typeof value === "string");
  const sourceReferenceUrls = sourceReferences
    .map((reference) => reference?.url)
    .filter((value) => typeof value === "string");

  if (!isRecord(draft)) {
    critical.push("Draft is not an object.");
  }

  if (draft.schemaVersion !== 1) {
    critical.push("Draft schemaVersion is not 1.");
  }

  if (draft.generator !== "anthropic-mcp") {
    critical.push("Draft generator is not anthropic-mcp.");
  }

  validateGeneratedAt(draft.generatedAt, critical, startedAt);
  validateIdentity(requirement, draft.requirement, critical);
  validateDuplicateKey(draft.requirement?.requirementKey, keyCounts, critical);
  validateGeneratedComment(generatedComment, critical, warnings, minor);
  validateDemoSteps(demoSteps, critical, warnings);
  validateConfidence(confidence, critical, warnings);
  validateStringArray(draft.assumptions, "assumptions", critical);
  validateStringArray(draft.warnings, "warnings", critical);
  validateSourceReferences(sourceReferences, critical);
  validateSafetyMarkers(draftText, critical);
  validateReviewOrientation({
    confidence,
    critical,
    demoSteps,
    generatedComment,
    sourceReferences,
    support,
    warnings,
  });

  const status = critical.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass";
  return {
    auto: {
      critical,
      minor,
      status,
      warnings,
    },
    draft: {
      assumptions: draft.assumptions,
      confidence: draft.confidence,
      demoSteps: draft.demoSteps,
      generatedAt: draft.generatedAt,
      generatedComment: draft.generatedComment,
      generator: draft.generator,
      requirement: draft.requirement,
      schemaVersion: draft.schemaVersion,
      sourceReferences: draft.sourceReferences,
      warnings: draft.warnings,
    },
    draftHash: sha256(draftText),
    flags: readFlags(requirement),
    humanReview: null,
    requirement: readRequirementSummary(requirement),
    sourceReferenceIds,
    sourceReferenceUrls,
    supportType: support.supportType,
  };
}

function validateGeneratedAt(generatedAt, critical, startedAt) {
  if (typeof generatedAt !== "string" || generatedAt.trim().length === 0) {
    critical.push("Draft generatedAt is missing.");
    return;
  }

  if (generatedAt === "deterministic-mock") {
    critical.push("Draft generatedAt is deterministic-mock.");
  }

  const parsed = Date.parse(generatedAt);
  if (Number.isNaN(parsed)) {
    critical.push("Draft generatedAt is not ISO/runtime-looking.");
    return;
  }

  const lowerBound = startedAt.getTime() - 10 * 60 * 1000;
  const upperBound = Date.now() + 10 * 60 * 1000;
  if (parsed < lowerBound || parsed > upperBound) {
    critical.push("Draft generatedAt is outside the audit runtime window.");
  }
}

function validateIdentity(requirement, identity, critical) {
  if (!isRecord(identity)) {
    critical.push("Draft requirement identity is missing.");
    return;
  }

  if (identity.requirementKey !== createRequirementKey(requirement)) {
    critical.push("Draft requirementKey does not match request row.");
  }

  if (identity.requirementId !== requirement.requirementId.trim()) {
    critical.push("Draft requirementId does not match request row.");
  }

  if (identity.sourceRowNumber !== requirement.sourceRowNumber) {
    critical.push("Draft sourceRowNumber does not match request row.");
  }
}

function validateDuplicateKey(key, keyCounts, critical) {
  if (typeof key === "string" && (keyCounts.get(key) ?? 0) > 1) {
    critical.push("Duplicate draft requirementKey returned in response.");
  }
}

function validateGeneratedComment(comment, critical, warnings, minor) {
  if (!comment) {
    critical.push("Draft generatedComment is empty.");
    return;
  }

  const sentenceCount = countSentences(comment);
  if (sentenceCount < 2 || sentenceCount > 4) {
    warnings.push("Draft generatedComment is not 2-4 sentences.");
  }

  if (comment.length < 80) {
    minor.push("Draft generatedComment is short.");
  }

  if (comment.length > 1200) {
    warnings.push("Draft generatedComment is unusually long.");
  }
}

function validateDemoSteps(demoSteps, critical, warnings) {
  if (!Array.isArray(demoSteps) || demoSteps.length < 1 || demoSteps.length > 4) {
    critical.push("Draft demoSteps count is outside 1-4.");
    return;
  }

  demoSteps.forEach((step, index) => {
    if (!isRecord(step)) {
      critical.push(`Demo step ${index + 1} is not an object.`);
      return;
    }

    if (!hasNonemptyString(step.title)) {
      critical.push(`Demo step ${index + 1} title is empty.`);
    }

    if (!hasNonemptyString(step.mesModuleOrScreen)) {
      critical.push(`Demo step ${index + 1} mesModuleOrScreen is empty.`);
    }

    if (!validStepStatuses.has(step.reviewStatus)) {
      critical.push(`Demo step ${index + 1} reviewStatus is invalid.`);
    }

    if (
      !Array.isArray(step.instructions) ||
      step.instructions.length < 2 ||
      step.instructions.length > 5 ||
      !step.instructions.every(hasNonemptyString)
    ) {
      critical.push(`Demo step ${index + 1} instructions are outside 2-5 nonempty strings.`);
    }

    if (
      Array.isArray(step.instructions) &&
      new Set(step.instructions.map((value) => value.trim())).size <
        step.instructions.length
    ) {
      warnings.push(`Demo step ${index + 1} has repeated instructions.`);
    }

    if (
      Array.isArray(step.sourceReferences) &&
      step.sourceReferences.some((reference) => reference?.kind !== "mcp-documentation")
    ) {
      critical.push(`Demo step ${index + 1} has non-MCP documentation references.`);
    }
  });
}

function validateConfidence(confidence, critical, warnings) {
  if (!confidence) {
    critical.push("Draft confidence is missing.");
    return;
  }

  if (!confidenceLevels.has(confidence.level)) {
    critical.push("Draft confidence level is invalid.");
  }

  if (typeof confidence.score !== "number" || !Number.isFinite(confidence.score)) {
    critical.push("Draft confidence score is invalid.");
  }

  if (!hasNonemptyString(confidence.rationale)) {
    critical.push("Draft confidence rationale is empty.");
  }

  if (confidence.level === "high" && confidence.score < 0.7) {
    warnings.push("Draft confidence score is low for high confidence.");
  }
}

function validateStringArray(value, name, critical) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    critical.push(`Draft ${name} is not a string array.`);
  }
}

function validateSourceReferences(sourceReferences, critical) {
  if (!Array.isArray(sourceReferences)) {
    critical.push("Draft sourceReferences is not an array.");
    return;
  }

  if (sourceReferences.length === 0) {
    critical.push("Draft has no source references.");
    return;
  }

  for (const reference of sourceReferences) {
    if (!isRecord(reference)) {
      critical.push("Draft source reference is not an object.");
      continue;
    }

    if (reference.kind !== "mcp-documentation") {
      critical.push("Draft source reference kind is not mcp-documentation.");
    }

    if (!hasNonemptyString(reference.id) || !hasNonemptyString(reference.label)) {
      critical.push("Draft source reference is missing id or label.");
    }
  }
}

function validateSafetyMarkers(text, critical) {
  const forbiddenMarkers = [
    "mock-ai",
    "mcp-placeholder",
    "deterministic-mock",
    "did not match the expected draft format",
    "safe consultant-review fallback",
    "real draft could not be completed",
    "safe fallback",
  ];

  for (const marker of forbiddenMarkers) {
    if (text.toLowerCase().includes(marker.toLowerCase())) {
      critical.push(`Draft contains forbidden marker: ${marker}.`);
    }
  }

  const secretPatterns = [
    /sk-ant-api[0-9A-Za-z_-]{12,}/,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-[0-9A-Za-z-]{20,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  ];

  if (secretPatterns.some((pattern) => pattern.test(text))) {
    critical.push("Draft contains a secret-like token pattern.");
  }
}

function validateReviewOrientation({
  confidence,
  critical,
  demoSteps,
  generatedComment,
  sourceReferences,
  support,
  warnings,
}) {
  const reviewOriented =
    demoSteps.some((step) => step?.reviewStatus === "consultant-review") ||
    /consultant|review|workaround|validate|confirm/i.test(generatedComment);
  const weakEvidence =
    sourceReferences.length === 0 || confidence?.level === "low";

  if (support.supportType !== "standard" && !reviewOriented) {
    critical.push(
      "Partial/custom/unclear row is not consultant-review oriented.",
    );
  }

  if (weakEvidence && !reviewOriented) {
    critical.push("Weak-evidence row is not consultant-review oriented.");
  }

  if (support.supportType !== "standard" && demoSteps.every((step) => step?.reviewStatus === "draft")) {
    critical.push("Partial/custom/unclear row has only draft demo steps.");
  }

  if (support.supportType === "standard" && sourceReferences.length === 0) {
    warnings.push("Standard-looking row has no source references.");
  }
}

function markHumanReviewQueue(rows) {
  const reviewRows = rows.map((row) => ({
    ...row,
    humanReview: {
      decision: "pending",
      finalState: "pending",
      issueSeverity:
        row.auto.critical.length > 0
          ? "critical"
          : row.auto.warnings.length > 0
            ? "warning"
            : "none",
      reason: null,
      requiredFix: "",
      reviewerNote: "",
      required: false,
    },
  }));

  for (const row of reviewRows) {
    const reasons = [];
    if (row.flags.demo || row.flags.mvp) {
      reasons.push("demo-or-mvp");
    }
    if (row.auto.critical.length > 0) {
      reasons.push("auto-critical");
    }
    if (row.draft?.confidence?.level === "low") {
      reasons.push("low-confidence");
    }
    if ((row.draft?.sourceReferences?.length ?? 0) === 0) {
      reasons.push("no-source-references");
    }
    if (
      row.draft?.demoSteps?.some(
        (step) => step.reviewStatus === "consultant-review",
      )
    ) {
      reasons.push("consultant-review-step");
    }

    if (reasons.length > 0) {
      row.humanReview.required = true;
      row.humanReview.reason = reasons.join(",");
    }
  }

  const remaining = reviewRows.filter((row) => !row.humanReview.required);
  const byProcess = new Map();
  for (const row of remaining) {
    const key = `${row.requirement.l2Process} > ${row.requirement.l3Process}`;
    const rowsForProcess = byProcess.get(key) ?? [];
    rowsForProcess.push(row);
    byProcess.set(key, rowsForProcess);
  }

  for (const rowsForProcess of byProcess.values()) {
    rowsForProcess.sort((left, right) => left.requirement.sourceRowNumber - right.requirement.sourceRowNumber);
    const sampleSize = Math.max(1, Math.ceil(rowsForProcess.length * 0.2));
    for (const row of rowsForProcess.slice(0, sampleSize)) {
      row.humanReview.required = true;
      row.humanReview.reason = "stratified-standard-sample";
    }
  }

  return reviewRows;
}

function summarizeAudit({
  artifactDir,
  auditedRequirements,
  batchErrors,
  batchSize,
  fixtureSummary,
  humanReviewCsvPath,
  rawResponsesPath,
  responseModeCounts,
  reviewArtifactPath,
  rows,
  startedAt,
  summaryPath,
  targetBaseUrl,
}) {
  const commentLengths = rows
    .map((row) => row.draft?.generatedComment?.length)
    .filter((value) => typeof value === "number");
  const demoStepCounts = rows
    .map((row) => row.draft?.demoSteps?.length)
    .filter((value) => typeof value === "number");
  const sourceReferenceCounts = rows
    .map((row) => row.draft?.sourceReferences?.length)
    .filter((value) => typeof value === "number");
  const confidenceCounts = {};
  const generatorCounts = {};

  for (const row of rows) {
    incrementCount(confidenceCounts, row.draft?.confidence?.level ?? "missing");
    incrementCount(generatorCounts, row.draft?.generator ?? "missing");
  }

  const criticalFailureRows = rows.filter(
    (row) => row.auto.critical.length > 0,
  ).length;
  const warningRows = rows.filter((row) => row.auto.warnings.length > 0).length;
  const humanReviewRequiredRows = rows.filter(
    (row) => row.humanReview?.required,
  ).length;
  const consultantReviewRows = rows.filter((row) =>
    row.draft?.demoSteps?.some(
      (step) => step.reviewStatus === "consultant-review",
    ),
  ).length;

  return {
    artifactDir,
    artifacts: {
      humanReviewCsvPath,
      rawResponsesPath,
      reviewArtifactPath,
      summaryPath,
    },
    auditedRows: auditedRequirements.length,
    batchErrorCount: batchErrors.length,
    batchSize,
    commentLength: summarizeNumbers(commentLengths),
    confidenceCounts,
    consultantReviewRows,
    criticalFailureRows,
    demoStepCount: summarizeNumbers(demoStepCounts),
    durationSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    fixture: fixtureSummary,
    fullWorkbook: auditedRequirements.length === fixtureSummary.rowCount,
    generatorCounts,
    humanReviewRequiredRows,
    responseModeCounts,
    sourceReferenceCount: summarizeNumbers(sourceReferenceCounts),
    sourceReferenceZeroRows: rows.filter(
      (row) => (row.draft?.sourceReferences?.length ?? 0) === 0,
    ).length,
    targetHost: targetBaseUrl.host,
    totalRowsWithDrafts: rows.filter((row) => row.draft !== null).length,
    warningRows,
  };
}

function createSafeStdoutSummary(summary) {
  return {
    artifactDir: toRelativePath(summary.artifactDir),
    artifacts: {
      humanReviewCsvPath: toRelativePath(summary.artifacts.humanReviewCsvPath),
      rawResponsesPath: toRelativePath(summary.artifacts.rawResponsesPath),
      reviewArtifactPath: toRelativePath(summary.artifacts.reviewArtifactPath),
      summaryPath: toRelativePath(summary.artifacts.summaryPath),
    },
    auditedRows: summary.auditedRows,
    batchErrorCount: summary.batchErrorCount,
    batchSize: summary.batchSize,
    commentLength: summary.commentLength,
    confidenceCounts: summary.confidenceCounts,
    consultantReviewRows: summary.consultantReviewRows,
    criticalFailureRows: summary.criticalFailureRows,
    demoStepCount: summary.demoStepCount,
    durationSeconds: summary.durationSeconds,
    fixture: summary.fixture,
    fullWorkbook: summary.fullWorkbook,
    generatorCounts: summary.generatorCounts,
    humanReviewRequiredRows: summary.humanReviewRequiredRows,
    responseModeCounts: summary.responseModeCounts,
    sourceReferenceCount: summary.sourceReferenceCount,
    sourceReferenceZeroRows: summary.sourceReferenceZeroRows,
    targetHost: summary.targetHost,
    totalRowsWithDrafts: summary.totalRowsWithDrafts,
    warningRows: summary.warningRows,
  };
}

function toRelativePath(filepath) {
  const relative = path.relative(process.cwd(), filepath);
  return relative && !relative.startsWith("..") ? relative : filepath;
}

function summarizeNumbers(values) {
  if (values.length === 0) {
    return {
      avg: 0,
      max: 0,
      min: 0,
      total: 0,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    avg: Math.round((total / values.length) * 100) / 100,
    max: Math.max(...values),
    min: Math.min(...values),
    total,
  };
}

function createHumanReviewCsv(rows) {
  const header = [
    "sourceRowNumber",
    "requirementId",
    "l2Process",
    "l3Process",
    "demo",
    "mvp",
    "supportType",
    "autoStatus",
    "criticalCount",
    "warningCount",
    "confidence",
    "sourceReferenceCount",
    "draftHash",
    "humanReviewRequired",
    "humanReviewReason",
    "reviewerDecision",
    "issueSeverity",
    "requiredFix",
    "reviewerNote",
    "finalState",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.requirement.sourceRowNumber,
        row.requirement.requirementId,
        row.requirement.l2Process,
        row.requirement.l3Process,
        row.flags.demo,
        row.flags.mvp,
        row.supportType,
        row.auto.status,
        row.auto.critical.length,
        row.auto.warnings.length,
        row.draft?.confidence?.level ?? "",
        row.draft?.sourceReferences?.length ?? 0,
        row.draftHash ?? "",
        row.humanReview?.required ?? false,
        row.humanReview?.reason ?? "",
        row.humanReview?.decision ?? "",
        row.humanReview?.issueSeverity ?? "",
        row.humanReview?.requiredFix ?? "",
        row.humanReview?.reviewerNote ?? "",
        row.humanReview?.finalState ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function readRequirementSummary(requirement) {
  return {
    l2Process: requirement.l2Process,
    l3Process: requirement.l3Process,
    operation: requirement.operation,
    requirementId: requirement.requirementId,
    requirementKey: createRequirementKey(requirement),
    sourceRowNumber: requirement.sourceRowNumber,
  };
}

function readFlags(requirement) {
  return {
    demo: requirement.demo,
    mvp: requirement.mvp,
  };
}

function createRequirementKey(requirement) {
  return `${requirement.sourceRowNumber}:${
    requirement.requirementId.trim() || "no-id"
  }`;
}

function assessRequirementSupport(requirement) {
  const searchableText = [
    requirement.availability,
    requirement.availabilityCm,
    requirement.descriptionAvailability,
    requirement.supportedPercent,
  ]
    .join(" ")
    .toLowerCase();
  const hasRequirementText =
    requirement.requirementDescription.trim().length > 0;
  const supportedPercent = parseSupportedPercent(requirement.supportedPercent);
  const isLowerSupportedPercent =
    supportedPercent !== null && supportedPercent < 100;
  const isPartialOrCustom =
    isLowerSupportedPercent ||
    includesAny(searchableText, [
      "partial",
      "custom",
      "extension",
      "customization",
      "not supported",
      "not available",
      "workaround",
    ]);
  const isStandard =
    !isPartialOrCustom &&
    (supportedPercent === 100 ||
      includesAny(searchableText, [
        "standard",
        "configuration",
        "configurable",
        "available",
        "supported",
      ]));

  if (!hasRequirementText) {
    return { supportType: "unclear" };
  }

  if (isPartialOrCustom) {
    return { supportType: "partial-or-custom" };
  }

  if (isStandard) {
    return { supportType: "standard" };
  }

  return { supportType: "unclear" };
}

function parseSupportedPercent(value) {
  const match = value.match(/\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function includesAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function countSentences(value) {
  return value
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function hasNonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function incrementCount(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node scripts/requirements-full-workbook-vercel-audit.mjs [options]

Audits the Customer X workbook against the protected Vercel real-generation API.
Stdout contains safe counts only. Raw generated output is written to ignored
test-results artifacts.

Options:
  --url <url>             Vercel base URL. Defaults to AI_SMOKE_URL from the current shell.
  --batch-size <n>        Sequential batch size, 1-${maxBatchSize}. Defaults to 1.
  --limit <n>             Audit only the first n parsed rows for a quick check.
  --source-rows <rows>    Audit specific workbook source rows, e.g. 114,121.
  --artifact-dir <path>   Output directory. Defaults to ${defaultArtifactDir}.
  -h, --help              Show this help.
`);
}
