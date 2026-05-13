import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/master-data/export", () => {
  it("rejects generated object maps that do not include every Master Data type", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/export", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          generatedAt: null,
          generatedObjects: {
            product: [],
          },
          project: {
            customerName: "Customer X",
            projectId: "customer-x-demo",
            projectName: "Customer X Demo",
          },
          traceability: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
