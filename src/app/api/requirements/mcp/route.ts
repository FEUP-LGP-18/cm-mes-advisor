import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as z from "zod/v4";
import {
  getSelfHostedAdjacentDocumentation,
  searchSelfHostedDocumentation,
} from "@/lib/requirements/server/self-mcp-docs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}

async function handleMcpRequest(request: Request) {
  const server = createSelfHostedDocumentationMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

function createSelfHostedDocumentationMcpServer() {
  const server = new McpServer(
    {
      name: "cm-mes-advisor-self-documentation",
      version: "0.1.0",
    },
    {
      capabilities: {},
    },
  );

  server.registerTool(
    "search_documentation",
    {
      description:
        "Search CM MES Demo Advisor documentation chunks for requirement-generation grounding.",
      inputSchema: {
        docSources: z.array(z.string()).optional(),
        docVersions: z.array(z.string()).optional(),
        userQuerySummary: z.string().optional(),
        userQueryToEmbed: z.string().optional(),
        maxNumberOfChunksToRetrieve: z.number().optional(),
      },
    },
    async (input) => {
      const chunks = searchSelfHostedDocumentation(input);
      return {
        structuredContent: {
          chunks,
        },
        content: [
          {
            type: "text",
            text: JSON.stringify({ chunks }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_adjacent_chunks",
    {
      description:
        "Return neighboring CM MES Demo Advisor documentation chunks by chunk id.",
      inputSchema: {
        chunkIds: z.array(z.string()).optional(),
        chunkId: z.string().optional(),
        previousChunkId: z.string().nullable().optional(),
        nextChunkId: z.string().nullable().optional(),
      },
    },
    async (input) => {
      const chunks = getSelfHostedAdjacentDocumentation(input);
      return {
        structuredContent: {
          chunks,
        },
        content: [
          {
            type: "text",
            text: JSON.stringify({ chunks }),
          },
        ],
      };
    },
  );

  return server;
}
