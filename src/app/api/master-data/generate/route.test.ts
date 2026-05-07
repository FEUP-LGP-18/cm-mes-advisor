import { describe, expect, it } from "vitest";
import { POST } from "./route";

const project = {
  customerName: "Customer X",
  projectId: "customer-x-demo",
  projectName: "Customer X Demo",
};

describe("POST /api/master-data/generate", () => {
  it("rejects empty generation selections", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "mock",
          project,
          requirements: [],
          selectedObjectTypes: ["product"],
          selectedRequirementKeys: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects unsupported object types", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "mock",
          project,
          requirements: [],
          selectedObjectTypes: ["work-center"],
          selectedRequirementKeys: ["28:03.01"],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
