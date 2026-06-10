#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const defaultLocalMcpBaseUrl = "http://localhost:8080";
const defaultTarget = "preview";
const mcpEnvKey = "MCP_SERVER_URL";
const tunnelUrlPattern = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g;
const urlRedactionPattern =
  /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com[^\s"')>]*/g;

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
const mcpPath = args.mcpPath ?? readMcpPath(env[mcpEnvKey]) ?? "/mcp";
const localMcpBaseUrl =
  args.localMcpBaseUrl ?? env.MCP_LOCAL_BASE_URL ?? defaultLocalMcpBaseUrl;
const target = args.target ?? defaultTarget;

if (target !== "preview") {
  fail(
    "This helper only updates Vercel Preview MCP_SERVER_URL. Use a stable public MCP endpoint before changing Production.",
  );
}

const cloudflared = spawn("cloudflared", ["tunnel", "--url", localMcpBaseUrl], {
  stdio: ["ignore", "pipe", "pipe"],
});

let tunnelUrl = null;
let buffer = "";
let settled = false;

const cleanup = () => {
  if (!cloudflared.killed) {
    cloudflared.kill("SIGTERM");
  }
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});
process.on("exit", () => {
  cleanup();
});

cloudflared.stdout.on("data", onCloudflaredOutput);
cloudflared.stderr.on("data", onCloudflaredOutput);
cloudflared.on("error", (error) => {
  if (!settled) {
    fail(`Failed to start cloudflared: ${error.message}`);
  }
});
cloudflared.on("exit", (code, signal) => {
  if (!settled) {
    fail(
      `cloudflared exited before creating a tunnel (${signal ?? `code ${code}`}).`,
    );
  }
});

try {
  tunnelUrl = await waitForTunnelUrl();
  const mcpServerUrl = new URL(mcpPath, tunnelUrl).toString();
  console.log("Cloudflare quick tunnel is running for local MCP.");

  await runCommand("npx", [
    "vercel",
    "env",
    "add",
    mcpEnvKey,
    target,
    "--force",
    "--sensitive",
    "--yes",
  ], process.env, { input: mcpServerUrl });
  console.log(`Updated Vercel ${target} ${mcpEnvKey}.`);

  let deploymentUrl = args.smokeUrl ?? env.AI_SMOKE_URL ?? null;
  if (!args.noDeploy) {
    const deployOutput = await runCommand("npx", ["vercel", "--yes"]);
    deploymentUrl = extractDeploymentUrl(deployOutput) ?? deploymentUrl;
    if (!deploymentUrl) {
      fail("Vercel deploy completed but no deployment URL could be detected.");
    }
    console.log(`Vercel preview deployed: ${deploymentUrl}`);
  }

  if (!args.noSmoke) {
    if (!deploymentUrl) {
      fail("No smoke URL is available. Pass --smoke-url or allow deploy.");
    }
    await runCommand(
      "pnpm",
      ["smoke:ai:vercel"],
      {
        ...process.env,
        AI_SMOKE_URL: deploymentUrl,
      },
      { inheritOutput: true },
    );
  }

  if (args.keepAlive) {
    console.log("Tunnel remains active. Press Ctrl-C to stop it.");
  } else {
    cleanup();
  }
} catch (error) {
  cleanup();
  fail(error instanceof Error ? error.message : String(error));
}

function onCloudflaredOutput(chunk) {
  buffer += chunk.toString("utf8");
}

async function waitForTunnelUrl() {
  const started = Date.now();
  while (Date.now() - started < args.timeoutMs) {
    const matches = buffer.match(tunnelUrlPattern);
    if (matches?.[0]) {
      settled = true;
      return matches[0];
    }
    await delay(250);
  }

  fail("Timed out waiting for cloudflared to create a quick tunnel.");
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    keepAlive: true,
    localMcpBaseUrl: null,
    mcpPath: null,
    noDeploy: false,
    noSmoke: false,
    smokeUrl: null,
    target: null,
    timeoutMs: 30_000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--exit-after-smoke":
        parsed.keepAlive = false;
        break;
      case "--local-mcp-base-url":
        parsed.localMcpBaseUrl = readArgValue(
          argv,
          (index += 1),
          "--local-mcp-base-url",
        );
        break;
      case "--mcp-path":
        parsed.mcpPath = readArgValue(argv, (index += 1), "--mcp-path");
        break;
      case "--no-deploy":
        parsed.noDeploy = true;
        break;
      case "--no-smoke":
        parsed.noSmoke = true;
        break;
      case "--smoke-url":
        parsed.smokeUrl = readArgValue(argv, (index += 1), "--smoke-url");
        break;
      case "--target":
        parsed.target = readArgValue(argv, (index += 1), "--target");
        break;
      case "--timeout-ms":
        parsed.timeoutMs = Number.parseInt(
          readArgValue(argv, (index += 1), "--timeout-ms"),
          10,
        );
        if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs <= 0) {
          fail("--timeout-ms must be a positive integer.");
        }
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
  const values = { ...process.env };

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
      values[key] = normalizeDotenvValue(rawValue);
    }
  }

  return values;
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

function readMcpPath(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function runCommand(
  command,
  commandArgs,
  commandEnv = process.env,
  { inheritOutput = false, input = null } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      env: commandEnv,
      stdio: inheritOutput ? "inherit" : ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    if (!inheritOutput) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
    }

    if (!inheritOutput) {
      child.stdin.end(input ?? "");
    }

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      const output = sanitizeOutput(`${stdout}\n${stderr}`.trim());
      reject(
        new Error(
          `${command} ${commandArgs.slice(0, 3).join(" ")} failed (${
            signal ?? `code ${code}`
          }).${output ? `\n${output}` : ""}`,
        ),
      );
    });
  });
}

function sanitizeOutput(output) {
  return output.replaceAll(tunnelUrl ?? "", "[redacted]").replace(
    urlRedactionPattern,
    "[redacted]",
  );
}

function extractDeploymentUrl(output) {
  const urls = output.match(/https:\/\/[^\s]+\.vercel\.app/g) ?? [];
  return urls.at(-1) ?? null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node scripts/vercel-mcp-tunnel.mjs [options]

Starts a Cloudflare quick tunnel to the local MCP/RAG service, updates the
Vercel Preview MCP_SERVER_URL environment variable, deploys a Preview build, and
runs the protected AI smoke check. The script does not print the tunnel URL,
MCP_SERVER_URL value, smoke token, Vercel bypass secret, or generated text.

Options:
  --local-mcp-base-url <url>  Local MCP base URL. Defaults to MCP_LOCAL_BASE_URL or http://localhost:8080.
  --mcp-path <path>           MCP path. Defaults to the path from MCP_SERVER_URL or /mcp.
  --smoke-url <url>           Existing Preview URL to smoke when --no-deploy is used.
  --no-deploy                 Update the env var without deploying a new Preview build.
  --no-smoke                  Skip the smoke check.
  --exit-after-smoke          Stop the quick tunnel after deploy/smoke completes.
  --target <target>           Vercel environment target. Only preview is allowed.
  --timeout-ms <ms>           Time to wait for cloudflared. Defaults to 30000.
  --help                      Show this message.

Prerequisites:
  - local Docker support stack running with MCP/RAG on port 8080
  - cloudflared installed and on PATH
  - Vercel CLI authenticated and linked to the cm-mes-advisor project
  - AI_SMOKE_TEST_TOKEN and VERCEL_PROTECTION_BYPASS in ignored local env when smoke is enabled`);
}
