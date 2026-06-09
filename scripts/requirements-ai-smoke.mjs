#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const defaultLocalUrl = "http://localhost:3000";
const supportedProviders = new Set(["anthropic", "bedrock"]);

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const env = readDotenvFiles(process.cwd(), [
  ".env.local",
  ".env.development.local",
  ".env",
]);

const providedUrl = args.url ?? env.AI_SMOKE_URL ?? null;
const targetBaseUrl = normalizeBaseUrl(providedUrl ?? defaultLocalUrl);
const expectProvider =
  args.expectProvider ??
  env.AI_SMOKE_EXPECT_PROVIDER ??
  env.REQUIREMENT_GENERATION_PROVIDER ??
  "anthropic";

if (!supportedProviders.has(expectProvider)) {
  fail(
    `Unsupported expected provider "${expectProvider}". Use "anthropic" or "bedrock".`,
  );
}

const token = env.AI_SMOKE_TEST_TOKEN?.trim();
const vercelProtectionBypass = env.VERCEL_PROTECTION_BYPASS?.trim();
const missing = [];
const invalid = [];

if (args.requireUrl && !providedUrl) {
  missing.push("AI_SMOKE_URL");
}

if (!token) {
  missing.push("AI_SMOKE_TEST_TOKEN");
}

if (
  !(args.requireUrl && !providedUrl) &&
  isLocalTarget(targetBaseUrl) &&
  !args.skipLocalEnvCheck
) {
  const localEnvProblems = getLocalRealModeEnvProblems(env, expectProvider);
  missing.push(...localEnvProblems.missing);
  invalid.push(...localEnvProblems.invalid);
}

if (missing.length > 0 || invalid.length > 0) {
  failWithEnvProblems({ missing, invalid });
}

const smokeUrl = new URL("/api/requirements/ai-smoke", targetBaseUrl);
const headers = {
  "x-ai-smoke-token": token,
};

if (vercelProtectionBypass) {
  headers["x-vercel-protection-bypass"] = vercelProtectionBypass;
}

const response = await fetch(smokeUrl, {
  method: "POST",
  headers,
});

const body = await readJsonBody(response);
const summary = summarizeSmokeResponse(response.status, body);
console.log(JSON.stringify(summary, null, 2));

if (!response.ok || !body?.ok) {
  fail("AI smoke route did not report a successful real generation run.");
}

assertSmokeResult(body, {
  expectProvider,
  requireSourceReference: args.requireSourceReference,
});

function parseArgs(argv) {
  const parsed = {
    expectProvider: null,
    help: false,
    requireSourceReference: false,
    requireUrl: false,
    skipLocalEnvCheck: false,
    url: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--url":
        parsed.url = readArgValue(argv, (index += 1), "--url");
        break;
      case "--expect-provider":
        parsed.expectProvider = readArgValue(
          argv,
          (index += 1),
          "--expect-provider",
        );
        break;
      case "--require-source-reference":
        parsed.requireSourceReference = true;
        break;
      case "--require-url":
        parsed.requireUrl = true;
        break;
      case "--skip-local-env-check":
        parsed.skipLocalEnvCheck = true;
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

function readDotenvFiles(repoRoot, filenames) {
  const env = { ...process.env };

  for (const filename of filenames) {
    const filepath = path.join(repoRoot, filename);
    if (!fs.existsSync(filepath)) {
      continue;
    }

    const text = fs.readFileSync(filepath, "utf8");
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
      env[key] = normalizeDotenvValue(rawValue);
    }
  }

  return env;
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
  try {
    const url = new URL(rawUrl);
    return url;
  } catch {
    fail(`Invalid AI smoke URL: ${rawUrl}`);
  }
}

function isLocalTarget(url) {
  return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

function getLocalRealModeEnvProblems(env, expectProvider) {
  const required = [
    "GENERATION_MODE",
    "REQUIREMENT_GENERATION_PROVIDER",
    "MCP_SERVER_URL",
  ];

  if (expectProvider === "anthropic") {
    required.push("ANTHROPIC_API_KEY", "ANTHROPIC_MODEL");
  } else {
    required.push("BEDROCK_MODEL_ID", "AWS_REGION");
    const hasBearerToken = hasValue(env.AWS_BEARER_TOKEN_BEDROCK);
    const hasAwsCredentials =
      hasValue(env.AWS_ACCESS_KEY_ID) && hasValue(env.AWS_SECRET_ACCESS_KEY);
    if (!hasBearerToken && !hasAwsCredentials) {
      required.push("AWS_BEARER_TOKEN_BEDROCK");
    }
  }

  const missing = required.filter((key) => !hasValue(env[key]));
  const invalid = [];

  if (hasValue(env.GENERATION_MODE) && env.GENERATION_MODE !== "real") {
    invalid.push("GENERATION_MODE");
  }

  if (
    hasValue(env.REQUIREMENT_GENERATION_PROVIDER) &&
    env.REQUIREMENT_GENERATION_PROVIDER !== expectProvider
  ) {
    invalid.push("REQUIREMENT_GENERATION_PROVIDER");
  }

  return { missing, invalid };
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function readJsonBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid-json-response",
      },
    };
  }
}

function summarizeSmokeResponse(status, body) {
  const generation = body?.generation;
  const error = body?.error;

  return {
    status,
    ok: Boolean(body?.ok),
    availability: body?.availability
      ? {
          available: body.availability.available,
          status: body.availability.status,
        }
      : null,
    generation: generation
      ? {
          providerMode: generation.providerMode,
          generator: generation.generator,
          mcpServerUrlKind: generation.mcpServerUrlKind,
          draftPresent: generation.commentLength > 0,
          commentLength: generation.commentLength,
          demoSteps: generation.demoSteps,
          sourceReferences: generation.sourceReferences,
          warnings: generation.warnings,
          generatedAtLooksRuntime: generation.generatedAtLooksRuntime,
        }
      : null,
    error: error
      ? {
          code: error.code,
          reason: error.reason,
          missingConfig: error.missingConfig ?? [],
        }
      : null,
  };
}

function assertSmokeResult(body, options) {
  const generation = body.generation;
  const expectedGenerator = `${options.expectProvider}-mcp`;
  const failures = [];

  if (!generation) {
    failures.push("missing generation summary");
  } else {
    if (generation.providerMode !== "real") {
      failures.push("providerMode is not real");
    }

    if (generation.generator !== expectedGenerator) {
      failures.push(`generator is not ${expectedGenerator}`);
    }

    if (!generation.generatedAtLooksRuntime) {
      failures.push("generatedAt does not look runtime-created");
    }

    if (!(generation.commentLength > 0)) {
      failures.push("generated comment is empty");
    }

    if (!(generation.demoSteps > 0)) {
      failures.push("demo steps are empty");
    }

    if (
      options.requireSourceReference &&
      !(generation.sourceReferences > 0)
    ) {
      failures.push("source references are empty");
    }
  }

  if (failures.length > 0) {
    console.error(
      JSON.stringify(
        {
          failures,
        },
        null,
        2,
      ),
    );
    fail("AI smoke response did not meet the real-generation acceptance checks.");
  }
}

function failWithEnvProblems(problems) {
  console.error(
    JSON.stringify(
      problems,
      null,
      2,
    ),
  );
  fail("Missing or invalid environment variables.");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node scripts/requirements-ai-smoke.mjs [options]

Options:
  --url <url>                  Base URL to test. Defaults to AI_SMOKE_URL or http://localhost:3000.
  --expect-provider <provider> Expected provider: anthropic or bedrock. Defaults to Anthropic.
  --require-source-reference   Fail unless the generated draft includes documentation source references.
  --require-url                Require AI_SMOKE_URL or --url instead of falling back to localhost.
  --skip-local-env-check       Skip local .env preflight for localhost targets.
  --help                       Show this message.

Set VERCEL_PROTECTION_BYPASS when the target Vercel deployment is protected.

The script prints only safe smoke summary fields. It never prints the smoke token, API keys, Vercel protection bypass secret, or generated draft text.`);
}
