import { beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.fn();
const listToolsMock = vi.fn();
const callToolMock = vi.fn();
const closeMock = vi.fn();
const terminateSessionMock = vi.fn();

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(function Client() {
    return {
      connect: connectMock,
      listTools: listToolsMock,
      callTool: callToolMock,
      close: closeMock,
    };
  }),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(
    function StreamableHTTPClientTransport() {
      return {
        terminateSession: terminateSessionMock,
      };
    },
  ),
}));

import { createRequirementDocumentationClient } from "./mcp-client";

const requirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Support electronic batch record review",
  l2Process: "Manufacturing Execution",
  l3Process: "Review by Exception",
  operation: "Batch review",
  demo: true,
  demoRaw: "x",
  detailDescriptionAndMotivation: "Consultants need a clear demo flow.",
  prioEms: "1",
  prioCws: "1",
  mvp: true,
  mvpRaw: "x",
  availability: "Available",
  availabilityCm: "Standard configuration",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel Comment feedback.",
} as const;

const sparseRequirement = {
  ...requirement,
  sourceRowNumber: 6,
  requirementId: "01.04",
  requirementDescription: "Kiosk option",
  detailDescriptionAndMotivation: "",
  sourceComment:
    "The MES can support kiosk-style usage through a constrained operator interaction flow that should be validated in documentation.",
} as const;

describe("requirement documentation client", () => {
  beforeEach(() => {
    connectMock.mockReset();
    listToolsMock.mockReset();
    callToolMock.mockReset();
    closeMock.mockReset();
    terminateSessionMock.mockReset();

    listToolsMock.mockResolvedValue({
      tools: [
        {
          name: "search_documentation",
          inputSchema: {
            properties: {
              docSources: {},
              docVersions: {},
              userQuerySummary: {},
              userQueryToEmbed: {},
              maxNumberOfChunksToRetrieve: {},
            },
          },
        },
        {
          name: "get_adjacent_chunks",
          inputSchema: {
            properties: {
              chunkIds: {},
            },
          },
        },
      ],
    });
  });

  it("returns relevant chunks from mocked MCP tool responses", async () => {
    callToolMock.mockResolvedValueOnce({
      structuredContent: {
        chunks: [
          {
            ChunkId: "chunk-1",
            Title: "Batch review workspace",
            Text: "Open the Batch Review workspace to review the batch.",
            SourceUrl: "https://example.invalid/docs/review",
            DocSource: "Documentation Portal",
            DocVersion: "9.0",
            PreviousChunkId: "chunk-0",
            NextChunkId: "chunk-2",
          },
        ],
      },
      content: [],
    });
    callToolMock.mockResolvedValueOnce({
      structuredContent: {
        chunks: [
          {
            ChunkId: "chunk-0",
            Title: "Batch review prerequisites",
            Text: "Prepare the batch review by exception filters.",
            SourceUrl: "https://example.invalid/docs/review#prereq",
            DocSource: "Documentation Portal",
            DocVersion: "9.0",
          },
        ],
      },
      content: [],
    });

    const client = await createRequirementDocumentationClient({
      mcpServerUrl: "https://example.invalid/mcp",
      mcpUserAccount: "consultant@example.com",
    });
    const result = await client.lookupRequirementDocumentation(requirement);

    expect(result.primaryChunks).toHaveLength(1);
    expect(result.adjacentChunks).toHaveLength(1);
    expect(result.allChunks).toHaveLength(2);
    expect(callToolMock.mock.calls[0]?.[0]).toMatchObject({
      arguments: {
        docSources: ["Documentation Portal"],
        userQuerySummary: expect.stringContaining(
          "Support electronic batch record review",
        ),
        userQueryToEmbed: expect.stringContaining("electronic"),
      },
    });
  });

  it("falls back to searching all sources when the first search returns no hits", async () => {
    callToolMock
      .mockResolvedValueOnce({
        structuredContent: {
          chunks: [],
        },
        content: [],
      })
      .mockResolvedValueOnce({
        structuredContent: {
          chunks: [
            {
              ChunkId: "chunk-2",
              Title: "Fallback result",
              Text: "Use the fallback source search result.",
              SourceUrl: "https://example.invalid/docs/fallback",
            },
          ],
        },
        content: [],
      });

    const client = await createRequirementDocumentationClient({
      mcpServerUrl: "https://example.invalid/mcp",
      mcpUserAccount: null,
    });
    const result = await client.lookupRequirementDocumentation(requirement);

    expect(result.primaryChunks).toHaveLength(1);
    expect(callToolMock.mock.calls[1]?.[0]).toMatchObject({
      arguments: {
        docSources: [],
      },
    });
    expect(
      callToolMock.mock.calls[1]?.[0]?.arguments?.userQueryToEmbed,
    ).not.toEqual(callToolMock.mock.calls[0]?.[0]?.arguments?.userQueryToEmbed);
  });

  it("returns no chunks when the mocked MCP tool has no evidence", async () => {
    callToolMock.mockResolvedValue({
      structuredContent: {
        chunks: [],
      },
      content: [],
    });

    const client = await createRequirementDocumentationClient({
      mcpServerUrl: "https://example.invalid/mcp",
      mcpUserAccount: null,
    });
    const result = await client.lookupRequirementDocumentation(requirement);

    expect(result.allChunks).toEqual([]);
  });

  it("uses the workbook comment as a fallback hint only for sparse requirement text", async () => {
    callToolMock
      .mockResolvedValueOnce({
        structuredContent: {
          chunks: [],
        },
        content: [],
      })
      .mockResolvedValueOnce({
        structuredContent: {
          chunks: [],
        },
        content: [],
      });

    const client = await createRequirementDocumentationClient({
      mcpServerUrl: "https://example.invalid/mcp",
      mcpUserAccount: null,
    });
    await client.lookupRequirementDocumentation(sparseRequirement);

    expect(callToolMock.mock.calls[0]?.[0]).toMatchObject({
      arguments: {
        docSources: ["Documentation Portal"],
        userQuerySummary: expect.not.stringContaining("Workbook comment hint"),
      },
    });
    expect(callToolMock.mock.calls[1]?.[0]).toMatchObject({
      arguments: {
        docSources: [],
        userQuerySummary: expect.stringContaining("Workbook comment hint"),
        userQueryToEmbed: expect.not.stringContaining("support"),
      },
    });
  });

  it("throws when the required search tool is missing", async () => {
    listToolsMock.mockResolvedValue({
      tools: [],
    });

    await expect(
      createRequirementDocumentationClient({
        mcpServerUrl: "https://example.invalid/mcp",
        mcpUserAccount: null,
      }),
    ).rejects.toThrow("search_documentation");
  });
});
