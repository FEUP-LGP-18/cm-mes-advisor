import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/master-data/analyze", () => {
  it("rejects malformed approved requirement keys", async () => {
    const response = await POST(
      new Request("http://localhost/api/master-data/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          approvedRequirementKeys: [42],
          requirements: [],
        }),
      }),
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "invalid-request",
      },
    });
  });
});
